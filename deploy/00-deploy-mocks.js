const { network } = require("hardhat")
const {developmentChains, GAS_PRICE_LINK, BASE_FEE} = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments } ) => {
    const {deploy, log} = deployments
    const { deployer } = await getNamedAccounts()

    if(developmentChains.includes(network.name)){
        log("Local network detected, deploying mocks")
        await deploy("VRFCoordinatorV2Mock", {
            log: true,
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_LINK]
        })
        log("Mocks deployed")
    }
}   

module.exports.tags = ["all", "mocks"]