const { ethers, run } = require("hardhat");

async function main() {

  await run("compile");
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const TokenFactory = await ethers.getContractFactory(
    "MockToken"
  );
  const tokenA = await TokenFactory.deploy('TOKEN-A', 'TKA');
  const tokenB = await TokenFactory.deploy('TOKEN-B', 'TKB');
  await tokenA.deployed();
  await tokenB.deployed();
  console.log(`Token A address: ${tokenA.address}`);
  console.log(`Token B address: ${tokenB.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });