require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;
const BSC_TESTNET_RPC =
  process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com";
const BSC_MAINNET_RPC =
  process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org";

// Fail fast if a deploy/verify command targets a network without the env vars
// it needs. Compile/test/node continue to work without secrets.
const argv = process.argv.slice(2);
const networkIdx = argv.indexOf("--network");
const targetNetwork = networkIdx >= 0 ? argv[networkIdx + 1] : null;
const isVerify = argv.includes("verify");

if ((targetNetwork === "bscTestnet" || targetNetwork === "bscMainnet") && !PRIVATE_KEY) {
  throw new Error(
    `PRIVATE_KEY is required to use --network ${targetNetwork}. Set it in packages/contracts/.env.`,
  );
}
if (isVerify && !BSCSCAN_API_KEY) {
  throw new Error(
    "BSCSCAN_API_KEY is required for contract verification. Set it in packages/contracts/.env.",
  );
}

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

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
      url: BSC_TESTNET_RPC,
      chainId: 97,
      gasPrice: 10e9,
      accounts,
    },
    bscMainnet: {
      url: BSC_MAINNET_RPC,
      chainId: 56,
      accounts,
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
