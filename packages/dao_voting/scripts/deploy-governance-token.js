const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;
  
  console.log("Deploying Governance Token...");
  console.log("Network:", network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Deploy Governance Token
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    "DAO Governance Token",
    "DGT", 
    deployer.address
  );
  
  await governanceToken.waitForDeployment();
  const tokenAddress = await governanceToken.getAddress();
  console.log("GovernanceToken deployed to:", tokenAddress);
  
  // Test basic functions
  const name = await governanceToken.name();
  const symbol = await governanceToken.symbol();
  const totalSupply = await governanceToken.totalSupply();
  const deployerBalance = await governanceToken.balanceOf(deployer.address);
  
  console.log("Token Details:");
  console.log("- Name:", name);
  console.log("- Symbol:", symbol); 
  console.log("- Total Supply:", ethers.formatEther(totalSupply));
  console.log("- Deployer Balance:", ethers.formatEther(deployerBalance));
  
  return tokenAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });