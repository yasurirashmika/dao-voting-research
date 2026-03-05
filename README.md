# DAO Voting: A Privacy-Preserving and Sybil-Resistant Mechanism Using ZKPs and DIDs

This repository contains the technical implementation of the research (2025–2026) on a secure, anonymous, and Sybil-resistant DAO voting system for decentralized organizations on blockchain. The project is structured as a monorepo containing a dao_voting smart contract package and a frontend web application.

It leverages **Zero-Knowledge Proofs (ZKPs)** to ensure voter privacy and **Decentralized Identifiers (DIDs)** alongside **Proof of Personhood (PoP)** to prevent Sybil attacks, ensuring a strict one-person-one-vote policy on the Ethereum blockchain.

## Live Demo
🌐 **Frontend Application:** [https://daovoting.netlify.app/](https://daovoting.netlify.app/)

## Project Architecture (Monorepo)

- `dao_voting/`: Hardhat workspace containing the Solidity smart contracts, ZKP circuits, deployment scripts, and Mocha/Ethers.js integration tests.
- `frontend/`: The user interface for interacting with the DAO, viewing proposals, and generating client-side zero-knowledge proofs to interact with the blockchain.

## Key Features

* **Privacy-Preserving Voting (ZKPs):** Voters can cast their ballots (YES/NO) without revealing their identity or vote choice on-chain.
* **Sybil Resistance (DIDs & PoP):** Integrates Decentralized Identifiers and Proof of Personhood to guarantee that each human can only register and vote once, preventing duplicate voting or bot attacks.
* **Smart Contract Safety:** * Strict access controls for administrative actions.
  * ZKP verification done directly on-chain to prevent tampering.
  * 100% test case pass rate for contract logic.
* **Full-Stack Integration:** Seamless voter registration, proposal creation, and real-time vote tallying through the live Netlify application.

## Prerequisites

- Node.js v18+  
- npm or yarn  
- MetaMask or another web3 wallet (for frontend interaction)
- Sepolia ETH account (for testnet deployment)  

## Installation & Setup

```bash
git clone <your-repo-url>
cd <your-monorepo-folder>

# Install backend contract dependencies
cd dao_voting
npm install

# Install frontend dependencies
cd ../frontend
npm install

```

## Smart Contract Usage (`dao_voting`)

### Running Tests

Run all integration tests (Solidity + Mocha + ZKP verifications):

```bash
npx hardhat test

```

### Deploying the DAO Voting Contract

#### Deploy to Localhost

```bash
npx hardhat run scripts/deployDAO.js --network localhost

```

#### Deploy to Sepolia

1. Make sure your account has some ETH on Sepolia.
2. Create a `.env` file in the `dao_voting` directory:

```env
SEPOLIA_PRIVATE_KEY=<your-private-key>
ETHERSCAN_API_KEY=<your-etherscan-api-key>
SEPOLIA_RPC_URL=<your-sepolia-rpc-url>

```

3. Run the deployment:

```bash
npx hardhat run scripts/deployDAO.js --network sepolia

```

After deployment, the CLI will output the contract address and instructions for Etherscan verification.

## Frontend Usage (`frontend`)

To run the frontend locally for development:

```bash
cd frontend
npm start

```

The application will launch at `http://localhost:3000`.

### Voter Registration & Proof of Personhood

During the private voting registration process on the application, users must generate their localized identity proof to bind their DID. When executing this command locally or testing the private registration flow, use your designated secret: **`Yasuri`**.

## Notes & Best Practices

* Always deploy and test complex ZKP verifications on `localhost` before pushing to Sepolia.
* Maintain separate branches for smart contract development (e.g., `voting-contract-dev`) to avoid conflicts on `main`.

## References

* [Hardhat Documentation](https://hardhat.org/docs)
* [Ethers.js Documentation](https://docs.ethers.io/)
* [Mocha Documentation](https://mochajs.org/)
* [W3C DID Specification](https://www.w3.org/TR/did-core/)

```

```
