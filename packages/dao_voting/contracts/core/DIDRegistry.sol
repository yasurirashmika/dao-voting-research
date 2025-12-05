// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

// Interface to talk to PrivateDAOVoting
interface IPrivateDAOVoting {
    function registerVoter(bytes32 commitment) external;
}

/**
 * @title DIDRegistry
 * @dev Decentralized Identifier (DID) registry for voter identity management
 * @notice Manages DIDs and their associated credentials for DAO voting
 */
contract DIDRegistry is Ownable {
    struct DIDDocument {
        string did;                     // Decentralized Identifier (did:eth:0x...)
        address controller;             // DID controller (wallet address)
        bytes32 credentialHash;         // Hash of verifiable credential
        uint256 issuedAt;              // Timestamp when issued
        uint256 expiresAt;             // Credential expiration
        bool isActive;                 // Active status
        bool isVerified;               // KYC/Identity verified
    }

    struct VerifiableCredential {
        string credentialType;          // e.g., "GovernanceCredential"
        bytes32 credentialHash;         // Hash of full credential (stored off-chain)
        address issuer;                 // Who issued the credential
        uint256 issuedAt;
        uint256 expiresAt;
    }

    // Storage for the Private Voting Contract
    IPrivateDAOVoting public privateVoting;

    // Sybil Resistance Mapping (Controller Address -> Has Registered Commitment)
    mapping(address => bool) public hasRegisteredForVoting;

    mapping(address => DIDDocument) public didDocuments;
    mapping(bytes32 => VerifiableCredential) public credentials;
    mapping(address => bool) public authorizedIssuers;

    event DIDCreated(address indexed controller, string did, uint256 timestamp);
    event DIDUpdated(address indexed controller, string did);
    event DIDRevoked(address indexed controller, string did);
    event CredentialIssued(address indexed subject, bytes32 indexed credentialHash, address issuer);
    event CredentialRevoked(bytes32 indexed credentialHash);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    
    // Event for voting registration
    event VotingRegistrationSuccess(address indexed controller, bytes32 commitment);

    modifier onlyAuthorizedIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner(),
            "Not authorized issuer"
        );
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // Set the Private Voting Contract Address
    function setPrivateVotingContract(address _privateVoting) external onlyOwner {
        require(_privateVoting != address(0), "Invalid address");
        privateVoting = IPrivateDAOVoting(_privateVoting);
    }

    /**
     * @dev The CORE "Gatekeeper" Function.
     * Use this to register for the Private DAO.
     * 1. Checks if you have a valid DID.
     * 2. Checks if you have already registered (Sybil Check).
     * 3. Calls PrivateDAOVoting to add your anonymous commitment.
     */
    function registerVoterForDAO(bytes32 commitment) external {
        // 1. Check DID Existence
        require(didDocuments[msg.sender].isActive, "No active DID found");
        
        // 2. Check Credential (Optional: Enable if you want to require Verified Credentials)
        // require(didDocuments[msg.sender].isVerified, "DID is not verified");

        // 3. Check Sybil Resistance
        require(!hasRegisteredForVoting[msg.sender], "Sybil Attack: DID already registered for voting");

        // 4. Mark as Used
        hasRegisteredForVoting[msg.sender] = true;

        // 5. Call PrivateDAOVoting
        require(address(privateVoting) != address(0), "Private voting contract not set");
        privateVoting.registerVoter(commitment);

        emit VotingRegistrationSuccess(msg.sender, commitment);
    }

    // =========================================================
    // EXISTING DID LOGIC BELOW
    // =========================================================

    /**
     * @dev Authorize an issuer to create credentials
     */
    function authorizeIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "Invalid issuer");
        require(!authorizedIssuers[issuer], "Already authorized");

        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @dev Revoke issuer authorization
     */
    function revokeIssuer(address issuer) external onlyOwner {
        require(authorizedIssuers[issuer], "Not authorized");

        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    /**
     * @dev Create a new DID document
     * @param controller Wallet address controlling the DID
     */
    function createDID(address controller) external onlyAuthorizedIssuer {
        require(controller != address(0), "Invalid controller");
        require(!didDocuments[controller].isActive, "DID already exists");

        // Generate DID string: did:eth:chainId:address
        string memory did = string(abi.encodePacked(
            "did:eth:",
            addressToString(controller)
        ));

        didDocuments[controller] = DIDDocument({
            did: did,
            controller: controller,
            credentialHash: bytes32(0),
            issuedAt: block.timestamp,
            expiresAt: 0, // No expiration by default
            isActive: true,
            isVerified: false
        });

        emit DIDCreated(controller, did, block.timestamp);
    }

    /**
     * @dev Issue a verifiable credential to a DID
     */
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

        // Update DID document with credential
        didDocuments[subject].credentialHash = credentialHash;
        didDocuments[subject].isVerified = true;

        emit CredentialIssued(subject, credentialHash, msg.sender);
    }

    /**
     * @dev Verify if a DID has valid credentials for voting
     */
    function verifyVotingEligibility(address controller) external view returns (bool isValid) {
        DIDDocument memory doc = didDocuments[controller];
        
        if (!doc.isActive || !doc.isVerified) {
            return false;
        }

        // Check if credential exists and is not expired
        VerifiableCredential memory cred = credentials[doc.credentialHash];
        
        if (cred.credentialHash == bytes32(0)) {
            return false;
        }

        if (cred.expiresAt > 0 && block.timestamp > cred.expiresAt) {
            return false;
        }

        return true;
    }

    /**
     * @dev Revoke a credential
     */
    function revokeCredential(bytes32 credentialHash) external onlyAuthorizedIssuer {
        require(credentials[credentialHash].credentialHash != bytes32(0), "Credential not found");
        
        delete credentials[credentialHash];
        emit CredentialRevoked(credentialHash);
    }

    /**
     * @dev Revoke a DID
     */
    function revokeDID(address controller) external onlyAuthorizedIssuer {
        require(didDocuments[controller].isActive, "DID not active");
        
        didDocuments[controller].isActive = false;
        emit DIDRevoked(controller, didDocuments[controller].did);
    }

    function getDIDDocument(address controller) external view returns (DIDDocument memory) {
        return didDocuments[controller];
    }

    function getCredential(bytes32 credentialHash) external view returns (VerifiableCredential memory) {
        return credentials[credentialHash];
    }

    function hasDID(address controller) external view returns (bool) {
        return didDocuments[controller].isActive;
    }

    function addressToString(address addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        
        str[0] = '0';
        str[1] = 'x';
        
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        
        return string(str);
    }
}