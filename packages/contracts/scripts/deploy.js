const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Deploy TokenFactory
  const TokenFactory = await hre.ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy();
  await tokenFactory.waitForDeployment();
  const tokenFactoryAddress = await tokenFactory.getAddress();
  console.log("TokenFactory deployed to:", tokenFactoryAddress);

  // Deploy Launchpad
  const Launchpad = await hre.ethers.getContractFactory("Launchpad");
  const launchpad = await Launchpad.deploy();
  await launchpad.waitForDeployment();
  const launchpadAddress = await launchpad.getAddress();
  console.log("Launchpad deployed to:", launchpadAddress);

  // Save addresses
  const addresses = {
    TokenFactory: tokenFactoryAddress,
    Launchpad: launchpadAddress,
    network: hre.network.name,
    timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");
  
  // Create deployments folder if it doesn't exist
  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    `${deploymentsDir}/${hre.network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log("Addresses saved to deployments/", hre.network.name, ".json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
