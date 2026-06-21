const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Launchpad", function () {
  let tokenFactory, launchpad, owner, seller, buyer, other;

  async function createToken(symbol = "TEST", supply = "1000000", logoURI = "") {
    const tx = await tokenFactory
      .connect(seller)
      .createToken("Test", symbol, ethers.parseEther(supply), logoURI);
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

  describe("Token metadata", function () {
    it("stores logoURI on the deployed token and emits it in TokenCreated", async function () {
      const uri = "ipfs://bafy/test-logo.png";
      const tx = await tokenFactory
        .connect(seller)
        .createToken("Test", "TEST", ethers.parseEther("1000000"), uri);
      const receipt = await tx.wait();
      const evt = receipt.logs
        .map((l) => {
          try {
            return tokenFactory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((p) => p && p.name === "TokenCreated");
      expect(evt.args.logoURI).to.equal(uri);

      const token = await ethers.getContractAt(
        "LaunchpadToken",
        evt.args.tokenAddress
      );
      expect(await token.logoURI()).to.equal(uri);
    });

    it("accepts an empty logoURI for backwards compatibility", async function () {
      const token = await createToken();
      expect(await token.logoURI()).to.equal("");
    });
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

  describe("Refund safety", function () {
    /** Helper: build a presale, fund it, run a small buy, then advance past
     *  endTime without softcap being reached. Returns the deployed token. */
    async function failedPresale({ funded = "100000", buyBnb = "0.5" } = {}) {
      const token = await createToken();
      const { endTime } = await createPresale(token); // softcap 1 BNB

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther(funded));
      await launchpad
        .connect(seller)
        .fundPresale(0, ethers.parseEther(funded));

      // Buy below softcap so the presale fails on end.
      await time.increase(120); // past start
      if (buyBnb !== "0") {
        await launchpad
          .connect(buyer)
          .buyTokens(0, { value: ethers.parseEther(buyBnb) });
      }
      await time.increaseTo(endTime + 1);
      return { token };
    }

    it("emits RefundClaimed and pays buyer back when softcap is missed", async function () {
      await failedPresale({ buyBnb: "0.5" });

      await expect(launchpad.connect(buyer).refundContribution(0))
        .to.emit(launchpad, "RefundClaimed")
        .withArgs(0, buyer.address, ethers.parseEther("0.5"));

      // Second refund attempt is blocked by the same `claimed` flag.
      await expect(
        launchpad.connect(buyer).refundContribution(0)
      ).to.be.revertedWith("Already claimed");
    });

    it("lets the seller recover funded tokens after a failed presale", async function () {
      const { token } = await failedPresale({ funded: "100000", buyBnb: "0.5" });

      const launchpadAddr = await launchpad.getAddress();
      expect(await token.balanceOf(launchpadAddr)).to.equal(
        ethers.parseEther("100000")
      );

      await expect(launchpad.connect(seller).recoverFundedTokensOnFailure(0))
        .to.emit(launchpad, "OwnerTokensRecovered")
        .withArgs(0, seller.address, ethers.parseEther("100000"));

      expect(await token.balanceOf(launchpadAddr)).to.equal(0n);
      // Second call reverts because the funded balance is now zero.
      await expect(
        launchpad.connect(seller).recoverFundedTokensOnFailure(0)
      ).to.be.revertedWith("Nothing to recover");
    });

    it("rejects token recovery from non-owner", async function () {
      await failedPresale({ funded: "100000", buyBnb: "0.5" });
      await expect(
        launchpad.connect(buyer).recoverFundedTokensOnFailure(0)
      ).to.be.revertedWith("Only presale owner");
    });

    it("rejects token recovery before the presale ends", async function () {
      const token = await createToken();
      await createPresale(token);
      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad
        .connect(seller)
        .fundPresale(0, ethers.parseEther("100000"));

      await expect(
        launchpad.connect(seller).recoverFundedTokensOnFailure(0)
      ).to.be.revertedWith("Presale not ended");
    });

    it("rejects token recovery on a successful presale", async function () {
      const token = await createToken();
      const { startTime, endTime } = await createPresale(token);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad
        .connect(seller)
        .fundPresale(0, ethers.parseEther("100000"));

      // Buy past softcap.
      await time.increaseTo(startTime + 1);
      await launchpad
        .connect(buyer)
        .buyTokens(0, { value: ethers.parseEther("2") });
      await time.increaseTo(endTime + 1);

      await expect(
        launchpad.connect(seller).recoverFundedTokensOnFailure(0)
      ).to.be.revertedWith("Softcap reached");
    });

    it("buyer refunds and seller recovery are independent", async function () {
      const { token } = await failedPresale({ funded: "100000", buyBnb: "0.5" });

      // Buyer refunds first.
      await launchpad.connect(buyer).refundContribution(0);
      // Seller can still recover deposited tokens.
      await launchpad.connect(seller).recoverFundedTokensOnFailure(0);

      const launchpadAddr = await launchpad.getAddress();
      expect(await token.balanceOf(launchpadAddr)).to.equal(0n);
    });
  });

  describe("Pausable", function () {
    it("only the platform owner can pause/unpause", async function () {
      await expect(launchpad.connect(seller).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await launchpad.connect(owner).pause();
      await expect(launchpad.connect(seller).unpause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await launchpad.connect(owner).unpause();
    });

    it("blocks buys and funding while paused, resumes after unpause", async function () {
      const token = await createToken();
      const { startTime } = await createPresale(token);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000"));

      await launchpad.connect(owner).pause();
      await time.increaseTo(startTime + 1);

      await expect(
        launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Pausable: paused");
      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("1"));
      await expect(
        launchpad.connect(seller).fundPresale(0, ethers.parseEther("1"))
      ).to.be.revertedWith("Pausable: paused");

      await launchpad.connect(owner).unpause();
      await expect(
        launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("1") })
      ).to.emit(launchpad, "TokensPurchased");
    });

    it("still allows claims while paused so users are never locked out", async function () {
      const token = await createToken();
      const { startTime, endTime } = await createPresale(token);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000"));

      await time.increaseTo(startTime + 1);
      await launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("2") });
      await time.increaseTo(endTime + 1);

      await launchpad.connect(owner).pause();
      await expect(launchpad.connect(buyer).claimTokens(0)).to.emit(
        launchpad,
        "TokensClaimed"
      );
    });
  });

  describe("Emergency refund mode", function () {
    it("only the platform owner can enable it", async function () {
      const token = await createToken();
      await createPresale(token);
      await expect(
        launchpad.connect(seller).enableEmergencyRefund(0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("blocks buys, lets buyers refund mid-sale and seller recover tokens", async function () {
      const token = await createToken();
      const { startTime } = await createPresale(token);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000"));

      await time.increaseTo(startTime + 1);
      // Buyer puts in 2 BNB (above softcap of 1) — a normal refund would be blocked.
      await launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("2") });

      // Platform owner forces refund mode while the sale is still live.
      await expect(launchpad.connect(owner).enableEmergencyRefund(0))
        .to.emit(launchpad, "EmergencyRefundEnabled")
        .withArgs(0);

      // Further buys are blocked.
      await expect(
        launchpad.connect(other).buyTokens(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Refund mode");

      // Buyer reclaims BNB even though softcap was reached and sale not ended.
      await expect(launchpad.connect(buyer).refundContribution(0))
        .to.emit(launchpad, "RefundClaimed")
        .withArgs(0, buyer.address, ethers.parseEther("2"));

      // Seller recovers all deposited tokens.
      const launchpadAddr = await launchpad.getAddress();
      await expect(launchpad.connect(seller).recoverFundedTokensOnFailure(0))
        .to.emit(launchpad, "OwnerTokensRecovered")
        .withArgs(0, seller.address, ethers.parseEther("100000"));
      expect(await token.balanceOf(launchpadAddr)).to.equal(0n);
    });

    it("blocks the seller from withdrawing once refund mode is on", async function () {
      const token = await createToken();
      const { startTime, endTime } = await createPresale(token);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000"));

      await time.increaseTo(startTime + 1);
      await launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("2") });

      await launchpad.connect(owner).enableEmergencyRefund(0);
      await time.increaseTo(endTime + 1);

      await expect(
        launchpad.connect(seller).withdrawFunds(0)
      ).to.be.revertedWith("Refund mode");
      // And claims are blocked so buyers must take the refund path.
      await expect(
        launchpad.connect(buyer).claimTokens(0)
      ).to.be.revertedWith("Refund mode");
    });

    it("cannot be enabled after the seller has withdrawn", async function () {
      const token = await createToken();
      const { startTime, endTime } = await createPresale(token);

      await token
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));
      await launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000"));

      await time.increaseTo(startTime + 1);
      await launchpad.connect(buyer).buyTokens(0, { value: ethers.parseEther("2") });
      await time.increaseTo(endTime + 1);
      await launchpad.connect(seller).withdrawFunds(0);

      await expect(
        launchpad.connect(owner).enableEmergencyRefund(0)
      ).to.be.revertedWith("Already finalized");
    });
  });

  describe("Non-standard tokens", function () {
    it("credits the actual delivered balance for fee-on-transfer tokens", async function () {
      // Deploy a 10%-fee token held by the seller.
      const FeeToken = await ethers.getContractFactory("FeeOnTransferToken");
      const feeToken = await FeeToken.connect(seller).deploy(
        ethers.parseEther("1000000")
      );
      await feeToken.waitForDeployment();

      const now = await time.latest();
      await launchpad
        .connect(seller)
        .createPresale(
          await feeToken.getAddress(),
          ethers.parseEther("0.0001"),
          ethers.parseEther("1"),
          ethers.parseEther("10"),
          now + 60,
          now + 3660,
          ethers.parseEther("5")
        );

      await feeToken
        .connect(seller)
        .approve(await launchpad.getAddress(), ethers.parseEther("100000"));

      // Request 100k, but the token burns 10% in transit, so only 90k arrive.
      await expect(launchpad.connect(seller).fundPresale(0, ethers.parseEther("100000")))
        .to.emit(launchpad, "PresaleFunded")
        .withArgs(0, seller.address, ethers.parseEther("90000"));

      expect(await launchpad.presaleTokensFunded(0)).to.equal(
        ethers.parseEther("90000")
      );
    });
  });
});
