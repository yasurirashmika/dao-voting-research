// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IReputationManager.sol";

/**
 * @title ReputationManager
 * @dev Manages user reputation scores for weighted voting
 */
contract ReputationManager is Ownable, IReputationManager {
    // We use the UserReputation struct from the IReputationManager interface
    mapping(address => UserReputation) public reputations;
    mapping(address => bool) public reputationUpdaters;
    
    // Private constants (internal logic)
    uint256 private constant _MAX_REPUTATION = 1000;
    uint256 private constant _MIN_REPUTATION = 1;
    uint256 private constant _DEFAULT_REPUTATION = 50;
    
    modifier onlyReputationUpdater() {
        require(
            reputationUpdaters[msg.sender] || msg.sender == owner(), 
            "Not authorized to update reputation"
        );
        _;
    }
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // --- Constants Getters (Implementing Interface) ---

    function MAX_REPUTATION() external pure override returns (uint256) {
        return _MAX_REPUTATION;
    }

    function MIN_REPUTATION() external pure override returns (uint256) {
        return _MIN_REPUTATION;
    }

    function DEFAULT_REPUTATION() external pure override returns (uint256) {
        return _DEFAULT_REPUTATION;
    }

    // --- Updater Management ---

    function addReputationUpdater(address updater) external override onlyOwner {
        require(updater != address(0), "Invalid updater address");
        require(!reputationUpdaters[updater], "Already a reputation updater");
        
        reputationUpdaters[updater] = true;
        emit ReputationUpdaterAdded(updater);
    }
    
    function removeReputationUpdater(address updater) external override onlyOwner {
        require(reputationUpdaters[updater], "Not a reputation updater");
        
        reputationUpdaters[updater] = false;
        emit ReputationUpdaterRemoved(updater);
    }
    
    // --- Core Reputation Functions ---

    function initializeReputation(address user) external override onlyReputationUpdater {
        require(user != address(0), "Invalid user address");
        require(!reputations[user].isActive, "User already has reputation");
        
        reputations[user] = UserReputation({
            score: _DEFAULT_REPUTATION,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        emit UserActivated(user);
        emit ReputationUpdated(user, _DEFAULT_REPUTATION, block.timestamp);
    }
    
    function updateReputation(address user, uint256 newScore) external override onlyReputationUpdater {
        require(user != address(0), "Invalid user address");
        require(reputations[user].isActive, "User reputation not initialized");
        require(newScore >= _MIN_REPUTATION && newScore <= _MAX_REPUTATION, "Score out of range");
        
        reputations[user].score = newScore;
        reputations[user].lastUpdated = block.timestamp;
        
        emit ReputationUpdated(user, newScore, block.timestamp);
    }
    
    function batchUpdateReputation(
        address[] calldata users, 
        uint256[] calldata scores
    ) external override onlyReputationUpdater {
        require(users.length == scores.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user address");
            require(reputations[users[i]].isActive, "User reputation not initialized");
            require(
                scores[i] >= _MIN_REPUTATION && scores[i] <= _MAX_REPUTATION, 
                "Score out of range"
            );
            
            reputations[users[i]].score = scores[i];
            reputations[users[i]].lastUpdated = block.timestamp;
            
            emit ReputationUpdated(users[i], scores[i], block.timestamp);
        }
    }
    
    function deactivateUser(address user) external override onlyReputationUpdater {
        require(user != address(0), "Invalid user address");
        require(reputations[user].isActive, "User already inactive");
        
        reputations[user].isActive = false;
        emit UserDeactivated(user);
    }
    
    function reactivateUser(address user) external override onlyReputationUpdater {
        require(user != address(0), "Invalid user address");
        require(!reputations[user].isActive, "User already active");
        
        reputations[user].isActive = true;
        emit UserActivated(user);
    }
    
    // --- View Functions ---

    function getReputationScore(address user) external view override returns (uint256) {
        if (!reputations[user].isActive) {
            return 0;
        }
        return reputations[user].score;
    }
    
    function getReputationData(address user) external view override returns (
        uint256 score,
        uint256 lastUpdated,
        bool isActive
    ) {
        UserReputation memory rep = reputations[user];
        return (rep.score, rep.lastUpdated, rep.isActive);
    }
    
    function hasActiveReputation(address user) external view override returns (bool) {
        return reputations[user].isActive;
    }
    
    function getReputationWeight(address user) external view override returns (uint256) {
        if (!reputations[user].isActive) {
            return 0;
        }

        // Formula: 100 + ((score - 1) * 9900) / 999
        return 100 + ((reputations[user].score - 1) * 9900) / 999;
    }
}