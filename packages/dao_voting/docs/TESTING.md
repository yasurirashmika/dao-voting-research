# Testing Guide

## Test Structure

```
test/
├── unit/
│   ├── GovernanceToken.test.js     # Token-specific tests
│   ├── ReputationManager.test.js   # Reputation system tests  
│   └── DAOVoting.test.js          # Core voting logic tests
├── integration/
│   ├── FullSystem.test.js         # End-to-end system tests
│   └── WeightedVoting.test.js     # Weighted voting mechanism tests
└── helpers/
    └── testHelpers.js             # Shared test utilities
```

## Running Tests

```bash
# All tests
npm test

# Specific test categories
npm run test:unit
npm run test:integration

# With gas reporting
npm run test:gas

# With coverage
npm run coverage

# Specific test file
npx hardhat test test/unit/GovernanceToken.test.js

# Watch mode (if configured)
npm run test:watch
```

## Test Categories

### Unit Tests
- **GovernanceToken**: Minting, burning, access controls
- **ReputationManager**: Score management, weight calculations
- **DAOVoting**: Individual functions, parameter validation

### Integration Tests  
- **FullSystem**: Complete workflow from deployment to finalization
- **WeightedVoting**: Weight calculations and voting outcomes

## Key Test Scenarios

### GovernanceToken Tests
- ✅ Deployment and initialization
- ✅ Minting permissions and limits
- ✅ Batch operations
- ✅ Supply constraints
- ✅ Access control enforcement

### ReputationManager Tests
- ✅ Reputation initialization and updates
- ✅ Score validation and constraints
- ✅ Weight calculation accuracy
- ✅ User activation/deactivation
- ✅ Batch reputation updates

### DAOVoting Tests
- ✅ Voter registration
- ✅ Proposal creation and lifecycle
- ✅ Voting mechanics and double-vote prevention
- ✅ Weight-based vote counting
- ✅ Proposal finalization logic
- ✅ Parameter updates and access controls

### Integration Tests
- ✅ Full system deployment
- ✅ End-to-end voting workflow
- ✅ Cross-contract interactions
- ✅ Edge cases and error handling
- ✅ Gas usage analysis

## Test Data Patterns

### Standard Test Accounts
```javascript
const [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();
```

### Token Distributions
```javascript
// Standard amounts for testing
const THOUSAND_TOKENS = ethers.utils.parseEther("1000");
const TEN_THOUSAND_TOKENS = ethers.utils.parseEther("10000");

// Typical distribution
voter1: 1,000 tokens  (low)
voter2: 5,000 tokens  (medium) 
voter3: 10,000 tokens (high)
```

### Reputation Scores
```javascript
// Standard reputation scores
voter1: 100  (low reputation)
voter2: 500  (medium reputation)
voter3: 900  (high reputation)
```

## Test Utilities

### Time Manipulation
```javascript
const { timeHelpers } = require('./helpers/testHelpers');

// Increase time by 1 hour
await timeHelpers.increaseTime(timeHelpers.HOUR);

// Move to specific timestamp  
await timeHelpers.increaseTimeTo(futureTimestamp);
```

### Token Operations
```javascript
const { tokenHelpers } = require('./helpers/testHelpers');

// Parse token amounts
const amount = tokenHelpers.parseTokens("1000");

// Format for display
console.log(tokenHelpers.formatTokens(balance));
```

### Deployment Helpers
```javascript
const { deploymentHelpers } = require('./helpers/testHelpers');

// Deploy full system
const contracts = await deploymentHelpers.deployFullSystem(owner);

// Setup voters with tokens
await deploymentHelpers.setupVoters(contracts, [voter1, voter2, voter3]);
```

## Gas Analysis

### Key Metrics to Track
- Deployment costs for each contract
- Transaction costs for core operations
- Gas optimization opportunities

### Gas Reporting
```bash
# Enable gas reporting
REPORT_GAS=true npm test

# Expected ranges (approximate)
Contract Deployment: 2-5M gas
Proposal Creation: 200-300k gas  
Vote Casting: 100-200k gas
Finalization: 50-100k gas
```

## Coverage Targets

### Minimum Coverage Goals
- **Lines**: >90%
- **Functions**: >95%
- **Branches**: >85%
- **Statements**: >90%

### Coverage Command
```bash
npm run coverage
```

## Mock Data Generation

### Creating Test Proposals
```javascript
const proposals = [
  {
    title: "Protocol Upgrade",
    description: "Upgrade to version 2.0",
    minTokens: ethers.utils.parseEther("100"),
    minReputation: 50
  },
  {
    title: "Parameter Change", 
    description: "Adjust voting parameters",
    minTokens: 0,
    minReputation: 0
  }
];
```

### Batch Operations Testing
```javascript
// Multiple voters
const voters = [voter1, voter2, voter3, voter4, voter5];
const tokenAmounts = voters.map((_, i) => ethers.utils.parseEther(`${(i+1)*1000}`));
const reputationScores = [100, 200, 300, 400, 500];
```

## Common Test Patterns

### Before Each Setup
```javascript
beforeEach(async function () {
  // Deploy contracts
  const contracts = await deploymentHelpers.deployFullSystem(owner);
  
  // Setup voters
  await deploymentHelpers.setupVoters(contracts, voters);
  
  // Set reputation scores
  for (let i = 0; i < voters.length; i++) {
    await contracts.reputationManager.updateReputation(
      voters[i].address, 
      reputationScores[i]
    );
  }
});
```

### Expectation Patterns
```javascript
// Successful operations
await expect(transaction).to.emit(contract, 'EventName');

// Failed operations  
await expect(transaction).to.be.revertedWith('Error message');

// Value checks
expect(await contract.getValue()).to.equal(expectedValue);
```

## Debugging Test Failures

### Common Issues
1. **Time-based failures**: Ensure proper time advancement
2. **Permission errors**: Check access controls and ownership
3. **State mismatches**: Verify contract state transitions
4. **Gas estimation**: Check for transaction reverts

### Debug Strategies
```javascript
// Add console logs
console.log("Value:", value.toString());

// Check contract state
const state = await contract.getState();
console.log("Contract state:", state);

// Verify balances
const balance = await token.balanceOf(address);
console.log("Balance:", ethers.utils.formatEther(balance));
```

## Performance Testing

### Load Testing Scenarios
- Multiple concurrent proposals
- High volume of voters
- Large token/reputation ranges
- Extended time periods

### Stress Testing
- Maximum supply token operations
- Edge-case reputation scores
- Invalid input handling
- Network congestion simulation

## Continuous Integration

### CI/CD Pipeline Tests
```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm test
    npm run test:gas
    npm run coverage
```

### Pre-commit Hooks
```bash
# Run tests before commits
npx husky add .husky/pre-commit "npm test"
```