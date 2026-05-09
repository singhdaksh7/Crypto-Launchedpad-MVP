const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Launchpad", function () {
  let tokenFactory, launchpad, owner, seller, buyer, other;

  async function createToken(symbol = "TEST", supply = "1000000") {
    const tx = await tokenFactory
      .connect(seller)
      .createToken("Test", symbol, ethers.parseEther(supply));
    const receipt = await tx.wait();
    // Pull the token address from the factory's TokenCreated event.
    const evt = receipt.logs
      .map((l) => {
        try {
          return tokenFactory.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((p) => p && p.name === "TokenCreated");
    const tokenAddress = evt.args.tokenAddress;
    return ethers.getContractAt("LaunchpadToken", tokenAddress);
  }

  async function createPresale(token, opts = {}) {
    const now = await time.latest();
    const startTime = opts.startTime ?? now + 60;
    const endTime = opts.endTime ?? startTime + 3600;
    const tokenPrice = opts.tokenPrice ?? ethers.parseEther("0.0001"); // 0.0001 BNB per token
    const softcap = opts.softcap ?? ethers.parseEther("1");
    const hardcap = opts.hardcap ?? ethers.parseEther("10");
    const maxBuy = opts.maxBuy ?? ethers.parseEther("5");

    const tx = await launchpad
      .connect(seller)
      .createPresale(
        await token.getAddress(),
        tokenPrice,
        softcap,
        hardcap,
        startTime,
        endTime,
        maxBuy
      );
    const receipt = await tx.wait();
    return { presaleId: 0, startTime, endTime, hardcap, tokenPrice };
  }

  beforeEach(async function () {
    [owner, seller, buyer, other] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    tokenFactory = await TokenFactory.deploy();
    await tokenFactory.waitForDeployment();

    const Launchpad = await ethers.getContractFactory("Launchpad");
    launchpad = await Launchpad.deploy();
    await launchpad.waitForDeployment();
  });

  describe("Funding flow", function () {
    it("getRequiredTokens returns hardcap / tokenPrice in token units", async function () {
      const token = await createToken();
      await createPresale(token); // hardcap 10 BNB, price 0.0001 BNB/token => 100k tokens

      const required = await launchpad.getRequiredTokens(0);
      expect(required).to.equal(ethers.parseEther("100000"));
    });

    it("rejects funding from non-owner", async function () {
      const token = await createToken();
      await createPresale(token);

      await token
        .connect(seller)
        .transfer(buyer.address, ethers.parseEther("1000"));
      await token
        .connect(buyer)
        .approve(await launchpad.getAddress(), ethers.parseEther("1000"));

      await expect(
        launchpad.connect(buyer).fundPresale(0, ethers.parseEther("1000"))
      ).to.be.revertedWith("Only presale owner");
    });

    it("blocks buys when underfunded, allows them after funding", async function () {
      const token = await createToken();
      const { startTime } = await createPresale(token);

      await time.increaseTo(startTime + 1);

      // No funding yet — buy must revert.
      await expect(
        launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Presale underfunded");

      // Fund 10k tokens — enough for 1 BNB buy (which needs 10k tokens at 0.0001 BNB/token).
      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("10000"));
      await expect(launchpad.connect(seller).fundPresale(0, ethers.parseEther("10000")))
        .to.emit(launchpad, "PresaleFunded")
        .withArgs(0, seller.address, ethers.parseEther("10000"));

      // Buy 1 BNB now succeeds.
      await expect(
        launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("1") })
      ).to.emit(launchpad, "TokensPurchased");
    });

    it("getFundingStatus tracks required, funded, committed", async function () {
      const token = await createToken();
      const { startTime } = await createPresale(token);

      let s = await launchpad.getFundingStatus(0);
      expect(s.required).to.equal(ethers.parseEther("100000"));
      expect(s.funded).to.equal(0n);
      expect(s.committed).to.equal(0n);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000"));

      await time.increaseTo(startTime + 1);
      await launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("2") });

      s = await launchpad.getFundingStatus(0);
      expect(s.funded).to.equal(ethers.parseEther("100000"));
      expect(s.committed).to.equal(ethers.parseEther("20000")); // 2 BNB / 0.0001 = 20k tokens
    });

    it("happy path: fund, buy, claim", async function () {
      const token = await createToken();
      const { startTime, endTime } = await createPresale(token);

      // Owner funds enough for full hardcap.
      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000"));

      // Buyer buys past softcap.
      await time.increaseTo(startTime + 1);
      await launchpad
        .connect(buyer)
        .buyTokens(0, { value: ethers.parseEther("2") });

      // End the sale and claim.
      await time.increaseTo(endTime + 1);
      await expect(launchpad.connect(buyer).claimTokens(0)).to.emit(
        launchpad,
        "TokensClaimed"
      );

      expect(await token.balanceOf(buyer.address)).to.equal(
        ethers.parseEther("20000")
      );
    });

    it("rejects fundPresale on non-existent presale", async function () {
      await expect(
        launchpad.connect(seller).fundPresale(999, ethers.parseEther("1"))
      ).to.be.revertedWith("Presale does not exist");
    });

    it("blocks funding after finalization", async function () {
      const token = await createToken();
      const { startTime, endTime } = await createPresale(token);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000"));

      await time.increaseTo(startTime + 1);
      await launchpad
        .connect(buyer)
        .buyTokens(0, { value: ethers.parseEther("2") });
      await time.increaseTo(endTime + 1);
      await launchpad.connect(seller).withdrawFunds(0);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("1"));
      await expect(
        launchpad.connect(seller).fundPresale(0, ethers.parseEther("1"))
      ).to.be.revertedWith("Presale already finalized");
    });
  });
});
