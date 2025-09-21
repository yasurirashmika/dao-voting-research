const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;

  console.log("Deploying DAO Voting Contract...");
  console.log("Network:", network.name);

  // Get deployer signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);

  // Get contract factory
  const DAOVoting = await ethers.getContractFactory("DAOVoting", deployer);
  console.log("Contract factory created");

  // Deploy contract - HARDHAT v2 SYNTAX
  const daoVoting = await DAOVoting.deploy();
  await daoVoting.deployed(); // Use deployed() instead of waitForDeployment()

  const contractAddress = daoVoting.address; // Use .address instead of getAddress()
  console.log(`DAO Voting Contract deployed to: ${contractAddress}`);

  // Optional: Etherscan verification instructions
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n Contract deployed successfully!");
    console.log(" Verify on Etherscan with:");
    console.log(`npx hardhat verify --network ${network.name} ${contractAddress}`);
  }

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });