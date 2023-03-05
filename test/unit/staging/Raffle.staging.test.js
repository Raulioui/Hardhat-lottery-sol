const {ethers, getNamedAccounts, network} = require("hardhat")
const {assert, expect} = require("chai")
const {developmentChains} = require("../../../helper-hardhat-config")


developmentChains.includes(network.name) ? describe.skip :

describe("Raffle Staging test", () => {
    let raffle, deployer, raffleEnterFee
    console.log("Testing for goerli")

    beforeEach(async function(){
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffleEnterFee = await raffle.getEntranceFee()
    })

    describe("fullfillRandomWords", function(){
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function(){
            const startingTimestamp = await raffle.getLatestTimestamp()
            const accounts = await ethers.getSigners()
            await new Promise(async (resolve, reject) => {
                console.log("Setting up test")
                raffle.once("RaffleWinner", async () => {
                    console.log("Winner picked, event fired!")
                    try{
                        const recentWinner = await raffle.getRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const winnerEndingBalance = await accounts[0].getBalance()
                        const endingTimestamp = await raffle.getLatestTimestamp()
                        console.log("variants get it")
                        await expect(raffle.getPlayer(0)).to.be.reverted
                        console.log("reverted")
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(raffleState, 0)
                            assert.equal(
                            winnerEndingBalance.toString(),
                            winnerStartingBalance.add(raffleEnterFee).toString()
                            )
                              assert(endingTimestamp > startingTimestamp)
                              resolve()
                              console.log("ended")
                    } catch (e){
                        console.log(e)
                        reject(e)
                    }
                })
                console.log("Entering Raffle")
                const tx = await raffle.enterRaffle({value: raffleEnterFee})
               await tx.wait(1)
                console.log("Time to wait ")
                const winnerStartingBalance = await accounts[0].getBalance()
            })
        })
    })
})