
# DAO Voting Hardhat Project

This project implements a **DAO Voting smart contract** deployed and tested using **Hardhat 3**, with `mocha` for tests and `ethers.js` for Ethereum interactions.

## Project Overview

This project includes:

- Solidity smart contract for DAO Voting.
- Hardhat configuration for **local**, **localhost**, and **Sepolia** networks.
- Integration tests using `mocha` and `ethers.js`.
- Deployment scripts for local and Sepolia networks.
- Voting functionality including voter registration, proposal creation, voting, and vote tallying.

## Prerequisites

- Node.js v18+  
- npm or yarn  
- Sepolia ETH account (for Sepolia deployment)  

## Installation

```bash
git clone <your-repo-url>
cd dao_voting
npm install
````

## Usage

### Running Tests

Run all tests (Solidity + Mocha):

```bash
npx hardhat test
```

Run only Mocha tests (JavaScript):

```bash
npx hardhat test mocha
```

### Deploying the DAO Voting Contract

#### Deploy to Localhost

```bash
npx hardhat run scripts/deployDAO.js --network localhost
```

#### Deploy to Sepolia

1. Make sure your account has some ETH on Sepolia.
2. Set your private key as an environment variable:

**Linux / macOS:**

```bash
export SEPOLIA_PRIVATE_KEY="your_private_key_here"
```

**Windows PowerShell:**

```powershell
setx SEPOLIA_PRIVATE_KEY "your_private_key_here"
```

3. Run the deployment:

```bash
npx hardhat run scripts/deployDAO.js --network sepolia
```

After deployment, you will see the contract address and instructions for **Etherscan verification** (if API key is set).

## Features

* **Admin Functions:**

  * Register voters
  * Create proposals
  * Tally votes

* **Voter Functions:**

  * Vote YES/NO on proposals
  * View proposal details

* **Smart Contract Safety:**

  * Only admin can perform administrative actions.
  * Prevents double voting.
  * Validates voter addresses and proposal details.

## Environment Variables

Create a `.env` file in the root directory with:

```env
SEPOLIA_PRIVATE_KEY=<your-private-key>
ETHERSCAN_API_KEY=<your-etherscan-api-key>
SEPOLIA_RPC_URL=<your-sepolia-rpc-url>
```

## Hardhat Configuration

* Solidity version: `0.8.28`
* Optimizer: enabled, 200 runs
* Networks: `hardhat`, `localhost`, `sepolia`

## Notes

* Always deploy to `localhost` for testing before using Sepolia.
* Use separate branches for development (e.g., `voting-contract-dev`) to avoid conflicts on `main`.

## References

* [Hardhat Documentation](https://hardhat.org/docs)
* [Ethers.js Documentation](https://docs.ethers.io/)
* [Mocha Documentation](https://mochajs.org/)
