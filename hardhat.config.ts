import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-chai-matchers";
import 'dotenv/config';
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "@nomicfoundation/hardhat-network-helpers";


const GAS_REPORTER_COINMARKETCAP_API_KEY = process.env.GAS_REPORTER_COINMARKETCAP_API_KEY || "";
const GAS_REPORTER_CURRENCY = process.env.GAS_REPORTER_CURRENCY || "";
const GAS_REPORTER_TOKEN = process.env.GAS_REPORTER_TOKEN || "";

const ALCHEMY_SEPOLIA_URL = process.env.ALCHEMY_SEPOLIA_URL || "";
const SEPOLIA_TESTNET_PRIVATE_KEY = process.env.SEPOLIA_TESTNET_PRIVATE_KEY || "";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const LOCALHOST_URL = process.env.LOCALHOST_URL || "http://127.0.0.1:8545";
const LOCALHOST_CHAIN_ID = Number(process.env.LOCALHOST_CHAIN_ID || "1337");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  defaultNetwork: "hardhat",
  /**
   * Uncomment this part and add the environment 
   * variables necessary for it to work
   * */
  networks: {
    sepolia: {
      url: ALCHEMY_SEPOLIA_URL,
      accounts: [`0x${SEPOLIA_TESTNET_PRIVATE_KEY}`]
    },
    localhost: {
      url: LOCALHOST_URL,
      chainId: LOCALHOST_CHAIN_ID,
    },
    hardhat: {
      chainId: LOCALHOST_CHAIN_ID
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  gasReporter: {
    enabled: GAS_REPORTER_COINMARKETCAP_API_KEY ? true : false,
    currency: GAS_REPORTER_CURRENCY,
    token: GAS_REPORTER_TOKEN,
    coinmarketcap: GAS_REPORTER_COINMARKETCAP_API_KEY
  }
};

export default config;
