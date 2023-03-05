require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {version: "0.8.7"},
    ]
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      defualt: 1
    }
  },
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [
        PRIVATE_KEY
      ],
      chainId: 5,
      blockConfirmations: 6
    },
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    }
  },
  etherscan: {
    // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
    apiKey: {
        goerli: ETHERSCAN_API_KEY,
    },
    customChains: [
        {
            network: "goerli",
            chainId: 5,
            urls: {
                apiURL: "https://api-goerli.etherscan.io/api",
                browserURL: "https://goerli.etherscan.io",
            },
        },
    ],
},
  mocha: {
    timeout: 500000
  }
};
