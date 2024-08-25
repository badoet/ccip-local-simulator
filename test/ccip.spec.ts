import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Test cross chain name service", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    const ccipLocalSimualtorFactory = await hre.ethers.getContractFactory(
      "CCIPLocalSimulator"
    );
    const ccipLocalSimulator = await ccipLocalSimualtorFactory.deploy();

    const [alice] = await hre.ethers.getSigners();

    return { ccipLocalSimulator, alice };
  }

  it("crossChainNameServiceRegister register to receiver successfully", async function () {
    const { ccipLocalSimulator, alice } = await loadFixture(deployFixture);

    const config: {
      chainSelector_: bigint;
      sourceRouter_: string;
      destinationRouter_: string;
      wrappedNative_: string;
      linkToken_: string;
      ccipBnM_: string;
      ccipLnM_: string;
    } = await ccipLocalSimulator.configuration();

    const crossChainNameServiceLookupFactory =
      await hre.ethers.getContractFactory("CrossChainNameServiceLookup");
    const sourceLookup = await crossChainNameServiceLookupFactory.deploy();
    const receiverLookup = await crossChainNameServiceLookupFactory.deploy();

    const crossChainNameServiceRegisterFactory =
      await hre.ethers.getContractFactory("CrossChainNameServiceRegister");
    const crossChainNameServiceRegister =
      await crossChainNameServiceRegisterFactory.deploy(
        config.sourceRouter_,
        sourceLookup.address
      );

    const crossChainNameServiceReceiverFactory =
      await hre.ethers.getContractFactory("CrossChainNameServiceReceiver");
    const crossChainNameServiceReceiver =
      await crossChainNameServiceReceiverFactory.deploy(
        config.destinationRouter_,
        receiverLookup.address,
        config.chainSelector_
      );

    await crossChainNameServiceRegister.enableChain(
      config.chainSelector_,
      crossChainNameServiceReceiver.address,
      300000
    );

    await sourceLookup.setCrossChainNameServiceAddress(
      crossChainNameServiceRegister.address
    );
    await receiverLookup.setCrossChainNameServiceAddress(
      crossChainNameServiceReceiver.address
    );

    await crossChainNameServiceRegister.connect(alice).register("alice.ccns");

    const lookupAddress = await receiverLookup.lookup("alice.ccns");

    expect(lookupAddress).to.deep.equal(alice.address);
  });
});
