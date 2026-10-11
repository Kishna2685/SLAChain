import { ethers } from "ethers";
import axios from "axios";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "6000", 10);
const ORACLE_STATUS_PORT = parseInt(process.env.ORACLE_STATUS_PORT || "4001", 10);

// Default Hardhat Account #1 private key (oracle role)
const DEFAULT_ORACLE_KEY =
  process.env.ORACLE_PRIVATE_KEY ||
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

let oracleState = {
  running: true,
  lastPollTimestamp: null,
  monitoredSLACount: 0,
  pingsTotal: 0,
  breachesDetected: 0,
  transactionsSent: 0,
  recentLogs: [],
  contractAddress: null,
  oracleWalletAddress: null,
};

function addLog(level, message, metadata = {}) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = { id: Date.now() + Math.random(), timestamp, level, message, metadata };
  oracleState.recentLogs.unshift(entry);
  if (oracleState.recentLogs.length > 50) oracleState.recentLogs.pop();

  const colors = {
    INFO: "\x1b[36m",
    SUCCESS: "\x1b[32m",
    WARN: "\x1b[33m",
    ERROR: "\x1b[31m",
    BREACH: "\x1b[35m",
    RESET: "\x1b[0m",
  };

  const col = colors[level] || colors.INFO;
  console.log(`[${timestamp}] ${col}[${level}]${colors.RESET} ${message}`);
}

async function loadContract(provider, wallet) {
  const deploymentPath = path.join(__dirname, "..", "deployed-contract.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Deployment file not found at ${deploymentPath}. Please run 'npm run deploy:local' first.`
    );
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contract = new ethers.Contract(deployment.address, deployment.abi, wallet);
  oracleState.contractAddress = deployment.address;
  return { contract, deployment };
}

async function pingEndpoint(url, timeoutMs = 6000) {
  const startTime = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      headers: { "User-Agent": "Web3-SLA-Oracle/1.0" },
      validateStatus: () => true, // capture all status codes
    });

    const elapsed = Date.now() - startTime;
    const isDown = response.status >= 400;

    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      latencyMs: elapsed,
      isDown,
      error: isDown ? `HTTP ${response.status} ${response.statusText || ""}` : null,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      statusCode: 0,
      latencyMs: elapsed,
      isDown: true,
      error: err.code === "ECONNABORTED" ? "Timeout" : (err.message || "Network Error"),
    };
  }
}

async function checkSLA(sla, contract) {
  oracleState.pingsTotal++;
  const slaId = Number(sla.id);
  const endpoint = sla.apiEndpoint;
  const maxLatency = Number(sla.maxLatencyMs);
  const consecutiveLimit = Number(sla.consecutiveFailureLimit);

  // Always re-read current on-chain failures to avoid stale snapshot data
  let currentFailures = 0;
  try {
    const freshSLA = await contract.getSLA(slaId);
    // If SLA is no longer Active (status != 0), skip it
    if (Number(freshSLA.status) !== 0) {
      addLog("INFO", `SLA #${slaId} is no longer Active (status=${Number(freshSLA.status)}). Skipping.`);
      return;
    }
    currentFailures = Number(freshSLA.currentFailures);
  } catch (err) {
    addLog("ERROR", `Failed to fetch fresh SLA #${slaId} state: ${err.message}`);
    return;
  }

  addLog("INFO", `Checking SLA #${slaId} [${endpoint}] | Current strikes: ${currentFailures}/${consecutiveLimit} | Threshold: <=${maxLatency}ms`);

  const result = await pingEndpoint(endpoint);

  // Check if breached: down OR latency exceeded
  const isLatencyBreached = result.latencyMs > maxLatency;
  const isServiceBreached = result.isDown || isLatencyBreached;

  if (isServiceBreached) {
    oracleState.breachesDetected++;
    const reason = result.isDown
      ? `Service Down (${result.error})`
      : `High Latency (${result.latencyMs}ms > ${maxLatency}ms)`;

    const newStrikeCount = currentFailures + 1;
    addLog("WARN", `⚠️ Fault Detected for SLA #${slaId}: ${reason} → Strike ${newStrikeCount}/${consecutiveLimit}`);

    try {
      addLog("INFO", `Submitting reportBreach tx for SLA #${slaId}...`);
      const tx = await contract.reportBreach(slaId, result.latencyMs, result.isDown);
      oracleState.transactionsSent++;
      addLog("INFO", `Tx sent: ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();

      if (newStrikeCount >= consecutiveLimit) {
        addLog(
          "BREACH",
          `💥 SLA #${slaId} BREACH TRIGGERED! All ${consecutiveLimit}/${consecutiveLimit} strikes used. Penalty ETH transferred to client. Block #${receipt.blockNumber}`
        );
      } else {
        addLog(
          "WARN",
          `SLA #${slaId} strike recorded: ${newStrikeCount}/${consecutiveLimit} consecutive failures. ${consecutiveLimit - newStrikeCount} more until breach.`
        );
      }
    } catch (err) {
      // If SLA was already breached (e.g. race condition), handle gracefully
      if (err.message?.includes("not active") || err.reason?.includes("not active")) {
        addLog("INFO", `SLA #${slaId} already breached or terminated. Skipping reportBreach.`);
      } else {
        addLog("ERROR", `Failed to submit reportBreach for SLA #${slaId}: ${err.reason || err.message}`);
      }
    }
  } else {
    addLog(
      "SUCCESS",
      `✅ SLA #${slaId} Healthy (${result.latencyMs}ms <= ${maxLatency}ms, HTTP ${result.statusCode})`
    );

    // If there were previous failures, reset consecutive failures
    if (currentFailures > 0) {
      try {
        addLog("INFO", `Resetting consecutive failure counter for SLA #${slaId} (was at ${currentFailures} strikes)...`);
        const tx = await contract.reportSuccess(slaId, result.latencyMs);
        oracleState.transactionsSent++;
        await tx.wait();
        addLog("SUCCESS", `SLA #${slaId} failure counter reset to 0 after healthy response.`);
      } catch (err) {
        if (err.message?.includes("not active") || err.reason?.includes("not active")) {
          addLog("INFO", `SLA #${slaId} no longer active. Skipping reportSuccess.`);
        } else {
          addLog("ERROR", `Failed to call reportSuccess for SLA #${slaId}: ${err.reason || err.message}`);
        }
      }
    }
  }
}

async function runOracleLoop(contract) {
  while (oracleState.running) {
    try {
      oracleState.lastPollTimestamp = new Date().toISOString();
      // Always fetch fresh list of Active SLAs from chain each loop
      const activeSLAs = await contract.getActiveSLAs();
      oracleState.monitoredSLACount = activeSLAs.length;

      if (activeSLAs.length === 0) {
        addLog("INFO", "No active SLAs found on-chain. Waiting for providers to stake...");
      } else {
        addLog("INFO", `Scanning ${activeSLAs.length} active SLA contract(s)...`);
        for (const sla of activeSLAs) {
          await checkSLA(sla, contract);
        }
      }
    } catch (err) {
      addLog("ERROR", `Oracle loop execution error: ${err.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// Start Status HTTP Server for Frontend live polling
function startStatusServer() {
  const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/oracle/status" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          {
            ...oracleState,
            pollIntervalMs: POLL_INTERVAL_MS,
            uptimeSeconds: Math.floor(process.uptime()),
          },
          null,
          2
        )
      );
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });

  server.listen(ORACLE_STATUS_PORT, () => {
    console.log(`📡 Oracle Telemetry API listening on http://localhost:${ORACLE_STATUS_PORT}/oracle/status`);
  });
}

async function main() {
  console.log("==================================================");
  console.log("🤖 Starting Web3 SLA Monitoring Oracle Bot...");
  console.log("==================================================");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEFAULT_ORACLE_KEY, provider);
  oracleState.oracleWalletAddress = wallet.address;

  console.log(`🔗 RPC Provider : ${RPC_URL}`);
  console.log(`🔑 Oracle Wallet: ${wallet.address}`);

  const { contract, deployment } = await loadContract(provider, wallet);
  console.log(`📄 SLA Contract : ${deployment.address}`);
  console.log(`⏱️  Poll Interval: ${POLL_INTERVAL_MS} ms`);
  console.log("==================================================");

  startStatusServer();
  await runOracleLoop(contract);
}

main().catch((err) => {
  console.error("❌ Fatal Oracle Error:", err);
  process.exit(1);
});
