// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IReputationManager
 * @dev Interface for reputation management functionality
 */
interface IReputationManager {
    struct UserReputation {
        uint256 score;
        uint256 lastUpdated;
        bool isActive;
    }
    
    // Events
    event ReputationUpdated(address indexed user, uint256 newScore, uint256 timestamp);
    event ReputationUpdaterAdded(address indexed updater);
    event ReputationUpdaterRemoved(address indexed updater);
    event UserActivated(address indexed user);
    event UserDeactivated(address indexed user);
    
    // Core functions
    function initializeReputation(address user) external;
    function updateReputation(address user, uint256 newScore) external;
    function batchUpdateReputation(address[] calldata users, uint256[] calldata scores) external;
    function deactivateUser(address user) external;
    function reactivateUser(address user) external;
    
    // Updater management
    function addReputationUpdater(address updater) external;
    function removeReputationUpdater(address updater) external;
    
    // View functions
    function getReputationScore(address user) external view returns (uint256);
    function getReputationData(address user) external view returns (uint256 score, uint256 lastUpdated, bool isActive);
    function hasActiveReputation(address user) external view returns (bool);
    function getReputationWeight(address user) external view returns (uint256);
    
    // Constants
    function MAX_REPUTATION() external view returns (uint256);
    function MIN_REPUTATION() external view returns (uint256);
    function DEFAULT_REPUTATION() external view returns (uint256);
}