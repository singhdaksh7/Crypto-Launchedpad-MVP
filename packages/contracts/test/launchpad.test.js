const { expect } = require("chai");

describe("Launchpad Contracts", function () {
  let tokenFactory, launchpad, token, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy TokenFactory
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    tokenFactory = await TokenFactory.deploy();
    await tokenFactory.waitForDeployment();

    // Deploy Launchpad
    const Launchpad = await ethers.getContractFactory("Launchpad");
    launchpad = await Launchpad.deploy();
    await launchpad.waitForDeployment();
  });

  describe("TokenFactory", function () {
    it("Should create a token", async function () {
      const tx = await tokenFactory.createToken("Test Token", "TEST", ethers.parseEther("1000000"));
      await tx.wait();

      const tokens = await tokenFactory.getCreatedTokens();
      expect(tokens.length).to.equal(1);
    });

    it("Should track token creator", async function () {
      await tokenFactory.createToken("Test Token", "TEST", ethers.parseEther("1000000"));
      const tokens = await tokenFactory.getTokensByCreator(owner.address);
      expect(tokens.length).to.equal(1);
    });
  });

  describe("Launchpad", function () {
    beforeEach(async function () {
      // Create a token first
      const tx = await tokenFactory.createToken(
        "Launch Token",
        "LAUNCH",
        ethers.parseEther("1000000")
      );
      const receipt = await tx.wait();
      
      const LaunchpadToken = await ethers.getContractFactory("LaunchpadToken");
      token = LaunchpadToken.attach(
        "0x5FbDB2315678afccb333f8a9c612f69c5a55fb7d" // This would be the actual address from deploy
      );
    });

    it("Should create a presale", async function () {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 3600; // 1 hour from now
      const endTime = now + 7200; // 2 hours from now

      const tx = await launchpad.createPresale(
        token.address || "0x" + "0".repeat(40),
        ethers.parseEther("0.0001"),
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        startTime,
        endTime,
        ethers.parseEther("1")
      );

      await tx.wait();
      const presale = await launchpad.getPresaleDetails(0);
      expect(presale.isActive).to.equal(true);
    });
  });
});
