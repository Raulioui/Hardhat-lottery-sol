const { network, ethers } = require("hardhat")
const {networkConfig, developmentChains} = require("../helper-hardhat-config")
const {verify} = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("1")
// hre
module.exports = async ({ getNamedAccounts, deployments } ) => {
    let vrfCoordinatorV2Address, subscriptionId
    const chainId = network.config.chainId
    const {deploy, log} = deployments
    const { deployer } = await getNamedAccounts()

    if(developmentChains.includes(network.name)){
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = transactionReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        )
    }else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

   const entranceFee = networkConfig[chainId]["entranceFee"] 
   const gasLane = networkConfig[chainId]["gasLane"]
   const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
   const interval = networkConfig[chainId]["interval"]

   const args = [
        vrfCoordinatorV2Address,
        entranceFee, 
        gasLane, 
        subscriptionId,
        callbackGasLimit,
        interval
    ]

   const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1
   })

   console.log(raffle.address)

   if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }

   if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
    await verify(raffle.address, args)
   }

}   

module.exports.tags = ["all", "raffle"]