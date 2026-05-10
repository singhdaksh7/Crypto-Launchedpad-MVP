require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;

// Testnet-only: fail fast if a deploy/verify command targets bscTestnet without
// the env vars it needs. Compile/test/node continue to work without secrets.
const argv = process.argv.slice(2);
const networkIdx = argv.indexOf("--network");
const targetNetwork = networkIdx >= 0 ? argv[networkIdx + 1] : null;
const isVerify = argv.includes("verify");

if (targetNetwork === "bscTestnet" && !PRIVATE_KEY) {
  throw new Error(
    "PRIVATE_KEY is required to use --network bscTestnet. Set it in packages/contracts/.env.",
  );
}
if (isVerify && !BSCSCAN_API_KEY) {
  throw new Error(
    "BSCSCAN_API_KEY is required for contract verification. Set it in packages/contracts/.env.",
  );
}

const bscTestnetAccounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    bscTestnet: {
      url: "https://bsc-testnet-rpc.publicnode.com",
      chainId: 97,
      gasPrice: 10e9,
      accounts: bscTestnetAccounts,
    },
  },
  etherscan: {
    apiKey: BSCSCAN_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
