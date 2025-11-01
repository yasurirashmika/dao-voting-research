// Reputation system

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationManager
 * @dev Manages user reputation scores for weighted voting
 */
contract ReputationManager is Ownable {
    struct UserReputation {
        uint256 score;
        uint256 lastUpdated;
        bool isActive;
    }
    
    mapping(address => UserReputation) public reputations;
    mapping(address => bool) public reputationUpdaters;
    
    uint256 public constant MAX_REPUTATION = 1000;
    uint256 public constant MIN_REPUTATION = 1;
    uint256 public constant DEFAULT_REPUTATION = 50;
    
    event ReputationUpdated(address indexed user, uint256 newScore, uint256 timestamp);
    event ReputationUpdaterAdded(address indexed updater);
    event ReputationUpdaterRemoved(address indexed updater);
    event UserActivated(address indexed user);
    event UserDeactivated(address indexed user);
    
    modifier onlyReputationUpdater() {
        require(
            reputationUpdaters[msg.sender] || msg.sender == owner(), 
            "Not authorized to update reputation"
        );
        _;
    }
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Add a reputation updater
     */
    function addReputationUpdater(address updater) external onlyOwner {
        require(updater != address(0), "Invalid updater address");
        require(!reputationUpdaters[updater], "Already a reputation updater");
        
        reputationUpdaters[updater] = true;
        emit ReputationUpdaterAdded(updater);
    }
    
    /**
     * @dev Remove a reputation updater
     */
    function removeReputationUpdater(address updater) external onlyOwner {
        require(reputationUpdaters[updater], "Not a reputation updater");
        
        reputationUpdaters[updater] = false;
        emit ReputationUpdaterRemoved(updater);
    }
    
    /**
     * @dev Initialize reputation for a new user
     */
    function initializeReputation(address user) external onlyReputationUpdater {
        require(user != address(0), "Invalid user address");
        require(!reputations[user].isActive, "User already has reputation");
        
        reputations[user] = UserReputation({
            score: DEFAULT_REPUTATION,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        emit UserActivated(user);
        emit ReputationUpdated(user, DEFAULT_REPUTATION, block.timestamp);
    }
    
    /**
     * @dev Update a user's reputation score
     */
    function updateReputation(address user, uint256 newScore) external onlyReputationUpdater {
        require(user != address(0), "Invalid user address");
        require(reputations[user].isActive, "User reputation not initialized");
        require(newScore >= MIN_REPUTATION && newScore <= MAX_REPUTATION, "Score out of range");
        
        reputations[user].score = newScore;
        reputations[user].lastUpdated = block.timestamp;
        
        emit ReputationUpdated(user, newScore, block.timestamp);
    }
    
    /**
     * @dev Batch update multiple users' reputation
     */
    function batchUpdateReputation(
        address[] calldata users, 
        uint256[] calldata scores
    ) external onlyReputationUpdater {
        require(users.length == scores.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user address");
            require(reputations[users[i]].isActive, "User reputation not initialized");
            require(
                scores[i] >= MIN_REPUTATION && scores[i] <= MAX_REPUTATION, 
                "Score out of range"
            );
            
            reputations[users[i]].score = scores[i];
            reputations[users[i]].lastUpdated = block.timestamp;
            
            emit ReputationUpdated(users[i], scores[i], block.timestamp);
        }
    }
    
    /**
     * @dev Deactivate a user's reputation
     */
    function deactivateUser(address user) external onlyReputationUpdater {
        require(user != address(0), "Invalid user address");
        require(reputations[user].isActive, "User already inactive");
        
        reputations[user].isActive = false;
        emit UserDeactivated(user);
    }
    
    /**
     * @dev Reactivate a user's reputation
     */
    function reactivateUser(address user) external onlyReputationUpdater {
        require(user != address(0), "Invalid user address");
        require(!reputations[user].isActive, "User already active");
        
        reputations[user].isActive = true;
        emit UserActivated(user);
    }
    
    /**
     * @dev Get a user's reputation score
     */
    function getReputationScore(address user) external view returns (uint256) {
        if (!reputations[user].isActive) {
            return 0;
        }
        return reputations[user].score;
    }
    
    /**
     * @dev Get full reputation data for a user
     */
    function getReputationData(address user) external view returns (
        uint256 score,
        uint256 lastUpdated,
        bool isActive
    ) {
        UserReputation memory rep = reputations[user];
        return (rep.score, rep.lastUpdated, rep.isActive);
    }
    
    /**
     * @dev Check if user has active reputation
     */
    function hasActiveReputation(address user) external view returns (bool) {
        return reputations[user].isActive;
    }
    
    /**
     * @dev Calculate voting weight based on reputation (returns basis points, 10000 = 100%)
     */
    function getReputationWeight(address user) external view returns (uint256) {
        if (!reputations[user].isActive) {
            return 0;
        }

        // Convert reputation (1-1000) to weight (100-10000 basis points)
        // Min reputation (1) = 100 basis points (1%)
        // Max reputation (1000) = 10000 basis points (100%)
        // Formula: 100 + ((score - 1) * 9900) / 999
        // For score = 50: 100 + ((50-1) * 9900) / 999 = 100 + (49 * 9900) / 999 = 100 + 485100 / 999 = 100 + 485 = 585
        return 100 + ((reputations[user].score - 1) * 9900) / 999;
    }
}