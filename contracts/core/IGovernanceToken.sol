//Interface for Governance Token
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IGovernanceToken
 * @dev Interface for governance token functionality
 */
interface IGovernanceToken is IERC20 {
    // Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    // Minting functions
    function mint(address to, uint256 amount) external;
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external;
    
    // Minter management
    function addMinter(address minter) external;
    function removeMinter(address minter) external;
    function canMint(address account) external view returns (bool);
    
    // Governance specific
    function getVotingPower(address account) external view returns (uint256);
    
    // Constants
    function MAX_SUPPLY() external view returns (uint256);
    function INITIAL_SUPPLY() external view returns (uint256);
}