const {deployments, ethers, getNamedAccounts, network} = require("hardhat")
const {assert, expect} = require("chai")
const {developmentChains, networkConfig} = require("../../helper-hardhat-config")


!developmentChains.includes(network.name) ? describe.skip :

describe("Raffle", () => {
    let raffle, deployer, vrfCoordinatorV2Mock, raffleEnterFee, interval

    beforeEach(async function(){
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture("all")
        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        raffleEnterFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
    })

    describe("constructor", function(){
        it("initializes the raffle correctly", async function(){
            const response = await raffle.getRaffleState()
            assert.equal(response.toString(), "0")
        })
        it("sets the address correctly", async function(){
            const response = await raffle.getVrfCoordinatorAddress()
            assert.equal(response, vrfCoordinatorV2Mock.address)
        })
    })

    describe("Enter Raffle",  function(){
        it("reverts if you don't send enought ETH", async function(){
            await expect(raffle.enterRaffle()).to.be.revertedWith(
                "Raffle__NotEnoughETHEntered"
            )
        })
        it("records players when they enter", async function(){
            await raffle.enterRaffle({value: raffleEnterFee})
            const playerFromContract = await raffle.getPlayer(0)
            assert.equal(playerFromContract, deployer)
        })
        it("emits an event when enter", async function(){
            await expect(raffle.enterRaffle({value: raffleEnterFee})).to.emit(
                raffle,
                "RaffleEnter"
            )
        })
        it("Doesn't allow entrance when raffle is calculating", async function(){
            await raffle.enterRaffle({value: raffleEnterFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            await raffle.performUpkeep([])
            await expect(raffle.enterRaffle({value: raffleEnterFee})).to.be.revertedWith(
                "Raffle__NotOpen"
            )
        })

    })

    describe("checkUpkeep",  function(){
        it("returns false if people havn't sent eny ETH", async function(){
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const {upKeepNeeded} = await raffle.callStatic.checkUpkeep([])
            assert(!upKeepNeeded)
        })
        it("Returns false if raffle isn't open", async function(){
            await raffle.enterRaffle({ value: raffleEnterFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            await raffle.performUpkeep([]) // changes the state to calculating
            const raffleState = await raffle.getRaffleState() // stores the new state
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
        })
    })

    describe("performUpkeep", function(){
        it("only runs if upkeepneeded is true", async function(){
            await raffle.enterRaffle({value: raffleEnterFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const tx = raffle.performUpkeep([])
            assert(tx)
        })
        it("It not will run if checkupkeep is false", async function(){
            await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
        })
        it("updates the raffle state, emits the event, and calls the vrf coordinator", async function(){
            await raffle.enterRaffle({value: raffleEnterFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const txResponse = await raffle.performUpkeep([])
            const txReceipt = await txResponse.wait(1)
            const requestId = txReceipt.events[1].args.requestId
            const raffleState = await raffle.getRaffleState()
            assert(requestId.toNumber() > 0)
            assert(raffleState == "1")
        })
    })

    describe("fullfillRandomWords", function(){
        beforeEach(async function(){
            await raffle.enterRaffle({value: raffleEnterFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
        })

        it("only can run after performUpkeep", async function(){
            await expect(
                vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
            ).to.be.revertedWith("nonexistent request")
            await expect(
                vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
            ).to.be.revertedWith("nonexistent request")
        })
        it("picks a winner, resets the lottery, send the money", async function(){
            const totalPlayers = 3
            const startingIndex = 1
            const accounts = await ethers.getSigners()
            for(let i = startingIndex; i < totalPlayers + startingIndex; i++){
                const accountsConnected = raffle.connect(accounts[i])
                await accountsConnected.enterRaffle({value: raffleEnterFee})
            }
            const startingTimestamp = await raffle.getLatestTimestamp()

            await new Promise(async (resolve, reject) => {
                raffle.once("RaffleWinner",async () => {
                    try{
                        const recentWinner = await raffle.getRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const endingTimestamp = await raffle.getLatestTimestamp()
                        const numPlayers = await raffle.getNumOfPlayers()
                        assert.equal(numPlayers.toString(), "0")
                        assert.equal(raffleState.toString(), "0")
                        assert(endingTimestamp > startingTimestamp)
                        console.log(recentWinner)
                        resolve()
                    } catch (e){
                        reject(e)
                    }
                })

                const tx = await raffle.performUpkeep([])
                const txReceipt = await tx.wait(1)
                await vrfCoordinatorV2Mock.fullfillRandomWords(
                    txReceipt.events[1].args.requestId,
                    raffle.address
                ) 
            })
        })
    })
})