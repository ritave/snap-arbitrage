require("@nomiclabs/hardhat-waffle");
require('dotenv').config()
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    rinkeby: {
      url: 'https://eth-rinkeby.alchemyapi.io/v2/' + process.env.ALCHEMY_API_KEY,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
      gas: 2100000,
      gasPrice: 8000000000,
      saveDeployments: true,
    },
  }
};
