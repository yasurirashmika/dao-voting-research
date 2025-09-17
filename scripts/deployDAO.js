import hre from "hardhat";

async function main() {
  const DAOFactory = await hre.ethers.getContractFactory("DAOVoting");
  const dao = await DAOFactory.deploy();
  await dao.waitForDeployment();

  console.log(`✅ DAO Voting Contract deployed at: ${dao.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
