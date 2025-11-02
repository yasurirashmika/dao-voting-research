# Contract API Documentation

## GovernanceToken.sol

### Overview
ERC20-based governance token with controlled minting and supply limits.

### Key Functions

#### `mint(address to, uint256 amount)`
Mints tokens to specified address (only minters/owner).

**Parameters:**
- `to`: Recipient address
- `amount`: Amount to mint (in wei)

**Requires:**
- Caller must be minter or owner
- Would not exceed MAX_SUPPLY

#### `addMinter(address minter)` / `removeMinter(address minter)`
Manages minter permissions (only owner).

#### `getVotingPower(address account) → uint256`
Returns voting power (same as balance for this token).

### Constants
- `MAX_SUPPLY`: 1,000,000 tokens
- `INITIAL_SUPPLY`: 100,000 tokens

---

## ReputationManager.sol

### Overview
Manages user reputation scores for weighted voting.

### Key Functions

#### `initializeReputation(address user)`
Creates reputation entry with default score (50).

#### `updateReputation(address user, uint256 newScore)`
Updates user's reputation score (1-1000 range).

#### `getReputationScore(address user) → uint256`
Returns current reputation score (0 if inactive).

#### `getReputationWeight(address user) → uint256`
Returns reputation weight in basis points (100-10000).

**Formula:** `100 + (score - 1) * 99`

### Constants
- `MAX_REPUTATION`: 1000
- `MIN_REPUTATION`: 1
- `DEFAULT_REPUTATION`: 50

---

## DAOVoting.sol

### Overview
Main voting contract with weighted voting mechanism.

### Key Functions

#### `registerVoter(address voter)`
Registers voter and initializes reputation (only owner).

#### `submitProposal(string title, string description, uint256 minTokens, uint256 minReputation)`
Creates new proposal (registered voters only).

**Parameters:**
- `title`: Proposal title
- `description`: Proposal description  
- `minTokens`: Minimum tokens required to vote
- `minReputation`: Minimum reputation required to vote

**Requires:**
- Caller has `proposalThreshold` tokens
- Caller is registered voter

#### `castVote(uint256 proposalId, bool support)`
Casts weighted vote on active proposal.

**Parameters:**
- `proposalId`: ID of proposal to vote on
- `support`: true for YES, false for NO

**Requires:**
- Proposal is active
- Within voting period
- Haven't voted before
- Meet proposal requirements

#### `calculateVotingWeight(address voter) → uint256`
Calculates total voting weight combining tokens and reputation.

**Formula:**
```
tokenWeight = (tokenBalance * tokenWeightPercentage) / maxTokenReference
reputationWeight = (reputationScore * reputationWeightPercentage) / 10000
totalWeight = tokenWeight + reputationWeight
```

### State Management

#### Proposal States
```solidity
enum ProposalState {
    Pending,    // Created, waiting for voting start
    Active,     // Voting in progress
    Succeeded,  // Voting ended, YES won
    Defeated,   // Voting ended, NO won or quorum failed
    Executed,   // Proposal executed
    Cancelled   // Proposal cancelled
}
```

### Configuration Parameters

#### Timing Parameters
- `votingDelay`: Time between proposal creation and voting start (default: 1 hour)
- `votingPeriod`: Duration of voting period (default: 7 days)

#### Threshold Parameters  
- `proposalThreshold`: Minimum tokens to create proposal (default: 1000 tokens)
- `quorumPercentage`: Minimum participation for valid vote (default: 40%)

#### Weight Parameters
- `tokenWeightPercentage`: Token influence on voting weight (default: 70%)
- `reputationWeightPercentage`: Reputation influence (default: 30%)

### Events

#### `ProposalCreated(uint256 proposalId, address proposer, string title, string description, uint256 votingStart, uint256 votingEnd)`
Emitted when new proposal is created.

#### `VoteCast(uint256 proposalId, address voter, bool support, uint256 weight)`
Emitted when vote is cast.

#### `ProposalStateChanged(uint256 proposalId, ProposalState newState)`
Emitted when proposal state changes.

---

## Integration Examples

### Creating and Voting on Proposal

```javascript
// 1. Register voter (owner only)
await daoVoting.registerVoter(voterAddress);

// 2. Mint tokens for proposal creation
await governanceToken.mint(voterAddress, ethers.utils.parseEther("1000"));

// 3. Create proposal
await daoVoting.connect(voter).submitProposal(
    "Upgrade Protocol",
    "Proposal to upgrade the protocol to version 2.0",
    ethers.utils.parseEther("100"), // Min 100 tokens to vote
    50 // Min reputation 50 to vote
);

// 4. Wait for voting delay, then start voting
await daoVoting.startVoting(1);

// 5. Cast vote
await daoVoting.connect(voter).castVote(1, true); // Vote YES

// 6. After voting period, finalize
await daoVoting.finalizeProposal(1);
```

### Checking Voting Power

```javascript
// Get individual components
const tokenBalance = await governanceToken.balanceOf(voterAddress);
const reputationScore = await reputationManager.getReputationScore(voterAddress);

// Get total voting weight
const votingPower = await daoVoting.getVotingPowerOf(voterAddress);

console.log(`Tokens: ${ethers.utils.formatEther(tokenBalance)}`);
console.log(`Reputation: ${reputationScore}`);
console.log(`Voting Power: ${votingPower}`);
```

### Batch Operations

```javascript
// Batch mint tokens
await governanceToken.batchMint(
    [voter1.address, voter2.address, voter3.address],
    [ethers.utils.parseEther("1000"), ethers.utils.parseEther("2000"), ethers.utils.parseEther("3000")]
);

// Batch update reputation
await reputationManager.batchUpdateReputation(
    [voter1.address, voter2.address, voter3.address],
    [100, 500, 900]
);
```

## Gas Estimates

Based on testing (approximate values):

| Operation | Gas Cost |
|-----------|----------|
| Deploy GovernanceToken | ~2,500,000 |
| Deploy ReputationManager | ~1,800,000 |
| Deploy DAOVoting | ~4,200,000 |
| Register Voter | ~180,000 |
| Submit Proposal | ~220,000 |
| Cast Vote | ~150,000 |
| Finalize Proposal | ~80,000 |

Note: Actual gas costs may vary based on network conditions and specific inputs.