import { expect } from "chai";
import hre from "hardhat";

describe("SLAManager Smart Contract Test Suite", function () {
  let SLAManager;
  let slaManager;
  let owner, provider, client, oracle, attacker;

  const API_ENDPOINT = "http://localhost:4000/health";
  const MAX_LATENCY_MS = 250;
  const CONSECUTIVE_LIMIT = 3;
  const PENALTY_AMOUNT = hre.ethers.parseEther("1.0");
  const COLLATERAL_AMOUNT = hre.ethers.parseEther("1.5");
  const DURATION_SECONDS = 3600; // 1 hour

  beforeEach(async function () {
    [owner, provider, client, oracle, attacker] = await hre.ethers.getSigners();

    const SLAManagerFactory = await hre.ethers.getContractFactory("SLAManager");
    slaManager = await SLAManagerFactory.deploy(oracle.address);
    await slaManager.waitForDeployment();
  });

  describe("Deployment & Configuration", function () {
    it("Should deploy with correct owner and oracle", async function () {
      expect(await slaManager.owner()).to.equal(owner.address);
      expect(await slaManager.oracle()).to.equal(oracle.address);
      expect(await slaManager.getSLACount()).to.equal(0);
    });

    it("Should allow owner to update oracle address", async function () {
      await expect(slaManager.connect(owner).setOracle(attacker.address))
        .to.emit(slaManager, "OracleUpdated")
        .withArgs(oracle.address, attacker.address);

      expect(await slaManager.oracle()).to.equal(attacker.address);
    });

    it("Should revert if non-owner tries to update oracle", async function () {
      await expect(
        slaManager.connect(attacker).setOracle(attacker.address)
      ).to.be.revertedWithCustomError(slaManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("SLA Creation", function () {
    it("Should allow provider to create an SLA with valid collateral", async function () {
      const tx = await slaManager.connect(provider).createSLA(
        client.address,
        API_ENDPOINT,
        MAX_LATENCY_MS,
        CONSECUTIVE_LIMIT,
        PENALTY_AMOUNT,
        DURATION_SECONDS,
        { value: COLLATERAL_AMOUNT }
      );

      await expect(tx)
        .to.emit(slaManager, "SLACreated")
        .withArgs(
          0,
          provider.address,
          client.address,
          API_ENDPOINT,
          COLLATERAL_AMOUNT,
          PENALTY_AMOUNT,
          MAX_LATENCY_MS,
          CONSECUTIVE_LIMIT
        );

      expect(await slaManager.getSLACount()).to.equal(1);

      const sla = await slaManager.getSLA(0);
      expect(sla.provider).to.equal(provider.address);
      expect(sla.client).to.equal(client.address);
      expect(sla.apiEndpoint).to.equal(API_ENDPOINT);
      expect(sla.maxLatencyMs).to.equal(MAX_LATENCY_MS);
      expect(sla.consecutiveFailureLimit).to.equal(CONSECUTIVE_LIMIT);
      expect(sla.currentFailures).to.equal(0);
      expect(sla.stakedCollateral).to.equal(COLLATERAL_AMOUNT);
      expect(sla.penaltyAmount).to.equal(PENALTY_AMOUNT);
      expect(sla.status).to.equal(0); // Active
    });

    it("Should revert if collateral is less than penalty amount", async function () {
      const lowCollateral = hre.ethers.parseEther("0.5");
      await expect(
        slaManager.connect(provider).createSLA(
          client.address,
          API_ENDPOINT,
          MAX_LATENCY_MS,
          CONSECUTIVE_LIMIT,
          PENALTY_AMOUNT,
          DURATION_SECONDS,
          { value: lowCollateral }
        )
      ).to.be.revertedWith("SLAManager: Staked collateral must be >= penalty amount");
    });

    it("Should revert if client address is zero", async function () {
      await expect(
        slaManager.connect(provider).createSLA(
          hre.ethers.ZeroAddress,
          API_ENDPOINT,
          MAX_LATENCY_MS,
          CONSECUTIVE_LIMIT,
          PENALTY_AMOUNT,
          DURATION_SECONDS,
          { value: COLLATERAL_AMOUNT }
        )
      ).to.be.revertedWith("SLAManager: Client address cannot be zero");
    });
  });

  describe("Telemetry Checks & Consecutive Breaches", function () {
    beforeEach(async function () {
      await slaManager.connect(provider).createSLA(
        client.address,
        API_ENDPOINT,
        MAX_LATENCY_MS,
        CONSECUTIVE_LIMIT,
        PENALTY_AMOUNT,
        DURATION_SECONDS,
        { value: COLLATERAL_AMOUNT }
      );
    });

    it("Should increment failure counter on check failure", async function () {
      await expect(slaManager.connect(oracle).reportBreach(0, 450, false))
        .to.emit(slaManager, "SLACheckFailed")
        .withArgs(0, 1, 450, "High Latency Detected");

      const sla = await slaManager.getSLA(0);
      expect(sla.currentFailures).to.equal(1);
      expect(sla.status).to.equal(0); // Still Active
    });

    it("Should reset failure count on reportSuccess", async function () {
      await slaManager.connect(oracle).reportBreach(0, 500, false);
      let sla = await slaManager.getSLA(0);
      expect(sla.currentFailures).to.equal(1);

      await expect(slaManager.connect(oracle).reportSuccess(0, 120))
        .to.emit(slaManager, "SLACheckPassed")
        .withArgs(0, 120);

      sla = await slaManager.getSLA(0);
      expect(sla.currentFailures).to.equal(0);
    });

    it("Should trigger automatic penalty payout on consecutive failures reaching limit", async function () {
      const clientBalanceBefore = await hre.ethers.provider.getBalance(client.address);
      const providerBalanceBefore = await hre.ethers.provider.getBalance(provider.address);

      // Check 1: failure
      await slaManager.connect(oracle).reportBreach(0, 400, false);
      // Check 2: failure
      await slaManager.connect(oracle).reportBreach(0, 450, false);

      // Check 3: reaches limit (3) -> Triggers breach
      const tx = await slaManager.connect(oracle).reportBreach(0, 520, false);

      const refundExcess = COLLATERAL_AMOUNT - PENALTY_AMOUNT; // 0.5 ETH

      await expect(tx)
        .to.emit(slaManager, "SLABreached")
        .withArgs(0, PENALTY_AMOUNT, client.address, refundExcess);

      const sla = await slaManager.getSLA(0);
      expect(sla.status).to.equal(1); // Breached
      expect(sla.stakedCollateral).to.equal(0);

      const clientBalanceAfter = await hre.ethers.provider.getBalance(client.address);
      const providerBalanceAfter = await hre.ethers.provider.getBalance(provider.address);

      expect(clientBalanceAfter - clientBalanceBefore).to.equal(PENALTY_AMOUNT);
      expect(providerBalanceAfter - providerBalanceBefore).to.equal(refundExcess);
    });

    it("Should trigger breach payout when service downtime strikes reach limit", async function () {
      const clientBalanceBefore = await hre.ethers.provider.getBalance(client.address);

      // Check 1: down (failure count 1)
      await slaManager.connect(oracle).reportBreach(0, 0, true);
      // Check 2: down (failure count 2)
      await slaManager.connect(oracle).reportBreach(0, 0, true);
      // Check 3: down (failure count 3 -> triggers breach)
      await expect(slaManager.connect(oracle).reportBreach(0, 0, true))
        .to.emit(slaManager, "SLABreached");

      const sla = await slaManager.getSLA(0);
      expect(sla.status).to.equal(1); // Breached

      const clientBalanceAfter = await hre.ethers.provider.getBalance(client.address);
      expect(clientBalanceAfter - clientBalanceBefore).to.equal(PENALTY_AMOUNT);
    });

    it("Should revert reportBreach if called by non-oracle", async function () {
      await expect(
        slaManager.connect(attacker).reportBreach(0, 600, false)
      ).to.be.revertedWith("SLAManager: Caller is not the authorized oracle");
    });
  });

  describe("SLA Resolution & Termination", function () {
    beforeEach(async function () {
      await slaManager.connect(provider).createSLA(
        client.address,
        API_ENDPOINT,
        MAX_LATENCY_MS,
        CONSECUTIVE_LIMIT,
        PENALTY_AMOUNT,
        DURATION_SECONDS,
        { value: COLLATERAL_AMOUNT }
      );
    });

    it("Should revert resolveSLA before duration expires", async function () {
      await expect(
        slaManager.connect(provider).resolveSLA(0)
      ).to.be.revertedWith("SLAManager: SLA duration has not yet expired");
    });

    it("Should allow provider to resolve and receive collateral refund after expiration", async function () {
      // Advance time by 3601 seconds
      await hre.network.provider.send("evm_increaseTime", [DURATION_SECONDS + 1]);
      await hre.network.provider.send("evm_mine");

      const providerBalBefore = await hre.ethers.provider.getBalance(provider.address);

      const tx = await slaManager.connect(provider).resolveSLA(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(slaManager, "SLAResolved")
        .withArgs(0, COLLATERAL_AMOUNT, provider.address);

      const sla = await slaManager.getSLA(0);
      expect(sla.status).to.equal(3); // Completed
      expect(sla.stakedCollateral).to.equal(0);

      const providerBalAfter = await hre.ethers.provider.getBalance(provider.address);
      expect(providerBalAfter + gasCost - providerBalBefore).to.equal(COLLATERAL_AMOUNT);
    });
  });
});
