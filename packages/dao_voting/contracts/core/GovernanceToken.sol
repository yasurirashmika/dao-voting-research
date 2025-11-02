//ERC20 governance token

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernanceToken
 * @dev ERC20 token for DAO governance with controlled minting
 */
contract GovernanceToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18; // 1 million tokens
    uint256 public constant INITIAL_SUPPLY = 100_000 * 10**18; // 100k tokens initially
    
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Add a minter address
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!minters[minter], "Already a minter");
        
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @dev Remove a minter address
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");
        
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Mint tokens to an address (only by minters or owner)
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        
        _mint(to, amount);
    }
    
    /**
     * @dev Batch mint to multiple addresses
     */
    function batchMint(
        address[] calldata recipients, 
        uint256[] calldata amounts
    ) external onlyMinter {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Would exceed max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");
            _mint(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev Get voting power of an address (same as balance for now)
     */
    function getVotingPower(address account) external view returns (uint256) {
        return balanceOf(account);
    }
    
    /**
     * @dev Check if an address can mint tokens
     */
    function canMint(address account) external view returns (bool) {
        return minters[account] || account == owner();
    }
}