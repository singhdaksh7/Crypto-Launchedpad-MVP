const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE = ethers.parseEther("1000"); // 1000 tokens, 18 decimals

describe("Vesting", function () {
  let vesting, token, owner, creator, alice, bob;

  /** Deploys a fresh vesting contract and a fresh ERC20, mints to `creator`,
   *  and approves the vesting contract for an arbitrary large allowance. */
  async function setup() {
    [owner, creator, alice, bob] = await ethers.getSigners();

    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await Vesting.deploy();
    await vesting.waitForDeployment();

    // Reuse LaunchpadToken — same factory deploys a standard ERC20 with
    // creator-as-owner, which is enough for these tests.
    const Tk = await ethers.getContractFactory("LaunchpadToken");
    token = await Tk.deploy(
      "Test",
      "TST",
      1_000_000n, // 1M, contract scales by 10**18 internally
      creator.address,
      "",
    );
    await token.waitForDeployment();

    await token
      .connect(creator)
      .approve(await vesting.getAddress(), ethers.MaxUint256);
  }

  /** Helper for `createSchedule` that returns the new scheduleId. */
  async function createSchedule({
    beneficiary,
    amount = ONE,
    start,
    cliffSeconds,
    linearSeconds,
    from = creator,
  }) {
    if (start === undefined) start = await time.latest();
    const tx = await vesting
      .connect(from)
      .createSchedule(
        await token.getAddress(),
        beneficiary,
        amount,
        start,
        cliffSeconds,
        linearSeconds,
      );
    const receipt = await tx.wait();
    const evt = receipt.logs
      .map((l) => {
        try {
          return vesting.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((p) => p && p.name === "ScheduleCreated");
    return Number(evt.args.scheduleId);
  }

  beforeEach(setup);

  describe("createSchedule", function () {
    it("pulls tokens from the creator and emits ScheduleCreated", async function () {
      const start = await time.latest();
      const id = await createSchedule({
        beneficiary: alice.address,
        amount: ONE,
        start,
        cliffSeconds: 60,
        linearSeconds: 0,
      });

      expect(id).to.equal(0);
      expect(await token.balanceOf(await vesting.getAddress())).to.equal(ONE);

      const s = await vesting.getSchedule(0);
      expect(s.beneficiary).to.equal(alice.address);
      expect(s.creator).to.equal(creator.address);
      expect(s.totalAmount).to.equal(ONE);
      expect(s.cliffSeconds).to.equal(60n);
      expect(s.linearSeconds).to.equal(0n);
    });

    it("rejects zero amount, zero address, or zero-period schedules", async function () {
      const tokenAddr = await token.getAddress();
      const start = await time.latest();
      await expect(
        vesting
          .connect(creator)
          .createSchedule(tokenAddr, alice.address, 0, start, 60, 0),
      ).to.be.revertedWith("Amount must be > 0");
      await expect(
        vesting
          .connect(creator)
          .createSchedule(
            ethers.ZeroAddress,
            alice.address,
            ONE,
            start,
            60,
            0,
          ),
      ).to.be.revertedWith("Invalid token");
      await expect(
        vesting
          .connect(creator)
          .createSchedule(
            tokenAddr,
            ethers.ZeroAddress,
            ONE,
            start,
            60,
            0,
          ),
      ).to.be.revertedWith("Invalid beneficiary");
      await expect(
        vesting
          .connect(creator)
          .createSchedule(tokenAddr, alice.address, ONE, start, 0, 0),
      ).to.be.revertedWith("No vesting period");
    });

    it("indexes the schedule under both creator and beneficiary", async function () {
      const start = await time.latest();
      await createSchedule({
        beneficiary: alice.address,
        start,
        cliffSeconds: 60,
        linearSeconds: 0,
      });
      await createSchedule({
        beneficiary: bob.address,
        start,
        cliffSeconds: 60,
        linearSeconds: 0,
      });

      const aliceIds = await vesting.schedulesOfBeneficiary(alice.address);
      const bobIds = await vesting.schedulesOfBeneficiary(bob.address);
      const creatorIds = await vesting.schedulesOfCreator(creator.address);

      expect(aliceIds.map(Number)).to.deep.equal([0]);
      expect(bobIds.map(Number)).to.deep.equal([1]);
      expect(creatorIds.map(Number)).to.deep.equal([0, 1]);
    });
  });

  describe("Cliff-only timelock (linearSeconds = 0)", function () {
    it("releasable is 0 before cliff and equals total at/after cliff", async function () {
      const start = await time.latest();
      const id = await createSchedule({
        beneficiary: alice.address,
        amount: ONE,
        start,
        cliffSeconds: 3600,
        linearSeconds: 0,
      });

      expect(await vesting.releasableOf(id)).to.equal(0n);

      await time.increaseTo(start + 3599);
      expect(await vesting.releasableOf(id)).to.equal(0n);

      await time.increaseTo(start + 3600);
      expect(await vesting.releasableOf(id)).to.equal(ONE);

      await expect(vesting.connect(alice).release(id))
        .to.emit(vesting, "Released")
        .withArgs(id, alice.address, ONE);
      expect(await token.balanceOf(alice.address)).to.equal(ONE);
    });

    it("rejects release before cliff", async function () {
      const start = await time.latest();
      const id = await createSchedule({
        beneficiary: alice.address,
        start,
        cliffSeconds: 3600,
        linearSeconds: 0,
      });

      await expect(vesting.connect(alice).release(id)).to.be.revertedWith(
        "Nothing to release",
      );
    });
  });

  describe("Cliff + linear", function () {
    it("releases linearly after the cliff and totals exactly the full amount", async function () {
      const start = await time.latest();
      const cliff = 100;
      const linear = 1000;
      const id = await createSchedule({
        beneficiary: alice.address,
        amount: ONE,
        start,
        cliffSeconds: cliff,
        linearSeconds: linear,
      });

      // Halfway through linear period: ~50% vested.
      await time.increaseTo(start + cliff + linear / 2);
      const halfway = await vesting.releasableOf(id);
      // Allow ±1 wei for the integer-division rounding of `total * (now - cliffEnd) / linear`.
      expect(halfway).to.be.closeTo(ONE / 2n, 1n);

      // Full release after the linear window ends.
      await time.increaseTo(start + cliff + linear + 1);
      expect(await vesting.releasableOf(id)).to.equal(ONE);

      await vesting.connect(alice).release(id);
      expect(await token.balanceOf(alice.address)).to.equal(ONE);
    });

    it("partial releases over time sum to the full amount", async function () {
      const start = await time.latest();
      const cliff = 100;
      const linear = 1000;
      const id = await createSchedule({
        beneficiary: alice.address,
        amount: ONE,
        start,
        cliffSeconds: cliff,
        linearSeconds: linear,
      });

      // Release at three checkpoints.
      await time.increaseTo(start + cliff + 250);
      await vesting.connect(alice).release(id);

      await time.increaseTo(start + cliff + 600);
      await vesting.connect(alice).release(id);

      await time.increaseTo(start + cliff + linear + 5);
      await vesting.connect(alice).release(id);

      expect(await token.balanceOf(alice.address)).to.equal(ONE);
      // No more releasable.
      await expect(vesting.connect(alice).release(id)).to.be.revertedWith(
        "Nothing to release",
      );
    });
  });

  describe("Authorization & guards", function () {
    it("only the beneficiary can release", async function () {
      const start = await time.latest();
      const id = await createSchedule({
        beneficiary: alice.address,
        start,
        cliffSeconds: 60,
        linearSeconds: 0,
      });
      await time.increaseTo(start + 61);

      await expect(vesting.connect(bob).release(id)).to.be.revertedWith(
        "Only beneficiary",
      );
      await expect(vesting.connect(creator).release(id)).to.be.revertedWith(
        "Only beneficiary",
      );
    });

    it("rejects release on a non-existent schedule", async function () {
      await expect(vesting.connect(alice).release(999)).to.be.revertedWith(
        "No such schedule",
      );
      await expect(vesting.releasableOf(999)).to.be.revertedWith(
        "No such schedule",
      );
    });

    it("multiple schedules per beneficiary release independently", async function () {
      const start = await time.latest();
      const idA = await createSchedule({
        beneficiary: alice.address,
        amount: ONE,
        start,
        cliffSeconds: 100,
        linearSeconds: 0,
      });
      const idB = await createSchedule({
        beneficiary: alice.address,
        amount: ONE * 2n,
        start,
        cliffSeconds: 200,
        linearSeconds: 0,
      });

      await time.increaseTo(start + 100);
      await vesting.connect(alice).release(idA);
      // B is still locked.
      await expect(vesting.connect(alice).release(idB)).to.be.revertedWith(
        "Nothing to release",
      );
      expect(await token.balanceOf(alice.address)).to.equal(ONE);

      await time.increaseTo(start + 200);
      await vesting.connect(alice).release(idB);
      expect(await token.balanceOf(alice.address)).to.equal(ONE * 3n);
    });
  });
});
