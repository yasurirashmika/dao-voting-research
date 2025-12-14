// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// Interface to talk to PrivateDAOVoting
interface IPrivateDAOVoting {
    function registerVoter(bytes32 commitment) external;
}

/**
 * @title DIDRegistry
 * @dev Decentralized Identifier (DID) registry with Backend Signature Verification
 * @notice Manages DIDs and prevents Sybil attacks via Trusted Issuer signatures
 */
contract DIDRegistry is Ownable {
    using ECDSA for bytes32;

    struct DIDDocument {
        string did; // Decentralized Identifier (did:eth:0x...)
        address controller; // DID controller (wallet address)
        bytes32 credentialHash;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isActive;
        bool isVerified;
    }

    struct VerifiableCredential {
        string credentialType;
        bytes32 credentialHash;
        address issuer;
        uint256 issuedAt;
        uint256 expiresAt;
    }

    // Storage for the Private Voting Contract
    IPrivateDAOVoting public privateVoting;

    // The Trusted Backend Address (The Mock Issuer)
    address public trustedIssuer;

    // Sybil Resistance Mapping (Controller Address -> Has Registered Commitment)
    mapping(address => bool) public hasRegisteredForVoting;

    mapping(address => DIDDocument) public didDocuments;
    mapping(bytes32 => VerifiableCredential) public credentials;
    mapping(address => bool) public authorizedIssuers;

    event DIDCreated(address indexed controller, string did, uint256 timestamp);
    event VotingRegistrationSuccess(
        address indexed controller,
        bytes32 commitment
    );
    event TrustedIssuerUpdated(address indexed newIssuer);


    // Kept existing events for compatibility
    event DIDUpdated(address indexed controller, string did);
    event DIDRevoked(address indexed controller, string did);
    event CredentialIssued(
        address indexed subject,
        bytes32 indexed credentialHash,
        address issuer
    );
    event CredentialRevoked(bytes32 indexed credentialHash);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    modifier onlyAuthorizedIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner(),
            "Not authorized issuer"
        );
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        // Initially, the deployer is the trusted issuer (simplifies setup)
        trustedIssuer = initialOwner;
    }

    // Set the Private Voting Contract Address
    function setPrivateVotingContract(
        address _privateVoting
    ) external onlyOwner {
        require(_privateVoting != address(0), "Invalid address");
        privateVoting = IPrivateDAOVoting(_privateVoting);
    }

    // Set the Trusted Issuer (The address of the Backend Wallet)
    function setTrustedIssuer(address _issuer) external onlyOwner {
        require(_issuer != address(0), "Invalid address");
        trustedIssuer = _issuer;
        emit TrustedIssuerUpdated(_issuer);
    }

    /**
     * @dev The SECURE Registration Function [Architecture B]
     * 1. Verifies that the Backend (Trusted Issuer) signed the user's address (Keccak256).
     * 2. Checks for Sybil attacks.
     * 3. Creates DID if needed.
     * 4. Registers the ZK Commitment (Poseidon Hash).
     * @param commitment The ZK commitment (Poseidon Hash) from the user
     * @param signature The signature provided by the Backend API
     */
    function registerVoterForDAO(
        bytes32 commitment,
        bytes calldata signature
    ) external {
        address user = msg.sender;

        // --- 1. Signature Verification (Sybil Resistance) ---
        // We use Keccak256 here because ECDSA signatures work on Keccak hashes
        bytes32 messageHash = keccak256(abi.encodePacked(user));

        // Add the Ethereum Signed Message prefix (Standard for Ethers.js signMessage)
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );

        // Recover the signer address
        address signer = ECDSA.recover(ethSignedMessageHash, signature);

        // Critical Security Check
        require(
            signer == trustedIssuer,
            "Invalid Credential: Not signed by Trusted Issuer"
        );
        require(signer != address(0), "Invalid signature");

        // --- 2. Sybil Check ---
        require(
            !hasRegisteredForVoting[user],
            "Sybil Attack: Already registered for voting"
        );

        // --- 3. Create DID (Auto-create for UX) ---
        if (!didDocuments[user].isActive) {
            string memory did = string(
                abi.encodePacked("did:eth:", addressToString(user))
            );
            didDocuments[user] = DIDDocument({
                did: did,
                controller: user,
                credentialHash: bytes32(0),
                issuedAt: block.timestamp,
                expiresAt: 0,
                isActive: true,
                isVerified: true // Verified because they have a signature!
            });
            emit DIDCreated(user, did, block.timestamp);
        }

        // --- 4. Mark as Used ---
        hasRegisteredForVoting[user] = true;

        // --- 5. Call PrivateDAOVoting ---
        require(
            address(privateVoting) != address(0),
            "Private voting contract not set"
        );
        privateVoting.registerVoter(commitment);

        emit VotingRegistrationSuccess(user, commitment);
    }

    // =========================================================
    // LEGACY / HELPER LOGIC
    // =========================================================

    function authorizeIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "Invalid issuer");
        require(!authorizedIssuers[issuer], "Already authorized");
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    function revokeIssuer(address issuer) external onlyOwner {
        require(authorizedIssuers[issuer], "Not authorized");
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    function createDID(address controller) external onlyAuthorizedIssuer {
        require(controller != address(0), "Invalid controller");
        require(!didDocuments[controller].isActive, "DID already exists");

        string memory did = string(
            abi.encodePacked("did:eth:", addressToString(controller))
        );

        didDocuments[controller] = DIDDocument({
            did: did,
            controller: controller,
            credentialHash: bytes32(0),
            issuedAt: block.timestamp,
            expiresAt: 0,
            isActive: true,
            isVerified: false
        });

        emit DIDCreated(controller, did, block.timestamp);
    }

    function issueCredential(
        address subject,
        string memory credentialType,
        bytes32 credentialHash,
        uint256 validityPeriod
    ) external onlyAuthorizedIssuer {
        require(subject != address(0), "Invalid subject");
        require(credentialHash != bytes32(0), "Invalid credential hash");
        require(didDocuments[subject].isActive, "DID not active");

        uint256 expiresAt = block.timestamp + validityPeriod;

        credentials[credentialHash] = VerifiableCredential({
            credentialType: credentialType,
            credentialHash: credentialHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            expiresAt: expiresAt
        });

        didDocuments[subject].credentialHash = credentialHash;
        didDocuments[subject].isVerified = true;

        emit CredentialIssued(subject, credentialHash, msg.sender);
    }

    function verifyVotingEligibility(
        address controller
    ) external view returns (bool isValid) {
        DIDDocument memory doc = didDocuments[controller];
        if (!doc.isActive || !doc.isVerified) return false;

        VerifiableCredential memory cred = credentials[doc.credentialHash];
        if (cred.credentialHash == bytes32(0)) return false;
        if (cred.expiresAt > 0 && block.timestamp > cred.expiresAt)
            return false;

        return true;
    }

    function revokeCredential(
        bytes32 credentialHash
    ) external onlyAuthorizedIssuer {
        require(
            credentials[credentialHash].credentialHash != bytes32(0),
            "Credential not found"
        );
        delete credentials[credentialHash];
        emit CredentialRevoked(credentialHash);
    }

    function revokeDID(address controller) external onlyAuthorizedIssuer {
        require(didDocuments[controller].isActive, "DID not active");
        didDocuments[controller].isActive = false;
        emit DIDRevoked(controller, didDocuments[controller].did);
    }

    function getDIDDocument(
        address controller
    ) external view returns (DIDDocument memory) {
        return didDocuments[controller];
    }

    function hasDID(address controller) external view returns (bool) {
        return didDocuments[controller].isActive;
    }

    function addressToString(
        address addr
    ) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);

        str[0] = "0";
        str[1] = "x";

        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
