const hre = require("hardhat");

async function main() {
  // Destructure ethers and network from Hardhat Runtime Environment
  const { ethers, network } = hre;

  console.log("Deploying DAO Voting Contract...");
  console.log("Network:", network.name);

  // Get the deployer account (first signer from local or connected wallet)
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  // Check deployer's ETH balance for deployment
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);

  // Get the contract factory, which allows us to deploy new instances
  const DAOVoting = await ethers.getContractFactory("DAOVoting", deployer);
  console.log("Contract factory created");

  // Deploy contract to the selected network
  const daoVoting = await DAOVoting.deploy();
  await daoVoting.deployed();

  // Get the deployed contract address
  const contractAddress = daoVoting.address;
  console.log(`DAO Voting Contract deployed to: ${contractAddress}`);

  // Optional: Instructions for Etherscan verification if not local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n Contract deployed successfully!");
    console.log(" Verify on Etherscan with:");
    console.log(`npx hardhat verify --network ${network.name} ${contractAddress}`);
  }

  return contractAddress;
}

// Run the deployment script and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
