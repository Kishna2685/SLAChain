# 🚀 AegisSLA — Complete Command Reference & Startup Guide

This document contains every command required to build, test, deploy, and run the entire end-to-end system on your machine.

---

## ⚡ Quick Summary of Ports & Services

| Service | Port / URL | Purpose |
| :--- | :--- | :--- |
| **Hardhat EVM Blockchain** | `http://127.0.0.1:8545` | Local Ethereum blockchain node (Chain ID: `31337`) |
| **Mock Microservice API** | `http://localhost:4000` | Target provider API with simulated failure modes |
| **Monitoring Oracle Bot** | `http://localhost:4001` | Autonomous background bot pinging API & executing penalties |
| **Frontend Web3 Dashboard** | `http://localhost:5173` | React/Tailwind Web3 user dashboard |

---

## 🖥️ How to Start the Entire Project (Step-by-Step)

Open separate terminals in the project root folder (`c:\Users\Kishan\Desktop\BT project`):

### Terminal 1: Start Local Ethereum Blockchain Node
```bash
npm run node
```
* **What it does:** Starts your local Ethereum testnet with 20 pre-funded accounts (10,000 ETH each).
* **Keep this terminal running in the background.**

---

### Terminal 2: Deploy the Smart Contract
```bash
npm run deploy:local
```
* **What it does:** Compiles `contracts/SLAManager.sol`, deploys it to your running local blockchain node, and automatically syncs the contract address & ABI to both the Oracle bot and the React client.
* *Note:* You only run this once when starting the blockchain node.

---

### Terminal 3: Start the Mock Microservice API
```bash
npm run server
```
* **What it does:** Launches the provider's Express server on port `4000`.
* **Health endpoint:** `http://localhost:4000/health`
* **Control endpoint:** `POST/GET http://localhost:4000/toggle-failure/:mode`

---

### Terminal 4: Start the Off-Chain Monitoring Oracle Bot
```bash
npm run oracle
```
* **What it does:** Connects to the smart contract, audits active SLAs every 6 seconds, and automatically executes on-chain transactions if an SLA is breached.
* **Oracle Telemetry API:** `http://localhost:4001/oracle/status`

---

### Terminal 5: Start the Frontend Web3 Dashboard
```bash
npm run client
```
* **What it does:** Launches the Vite React web application.
* **Open in your browser:** **`http://localhost:5173`**

---

## 🎓 How to Run on a Different Computer (College Lab / Friend's PC)

### Step 1 — Put project on GitHub (do this ONCE from your laptop)
```bash
# From the project folder in terminal:
git init
git add .
git commit -m "Initial commit: AegisSLA Web3 Project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2 — Setup on College Computer (prerequisites needed)
First, install on the college computer:
1. **Node.js** (v18 or later): https://nodejs.org/ — download the LTS version installer
2. **Git**: https://git-scm.com/

### Step 3 — Clone & Install on College Computer
```bash
# 1. Clone the project from GitHub
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# 2. Install root dependencies (hardhat, oracle, server)
npm install

# 3. Install frontend dependencies
cd client
npm install
cd ..
```

### Step 4 — Run Everything (same as your laptop)
```bash
# Terminal 1: Start blockchain
npm run node

# Terminal 2: Deploy contract (new terminal)
npm run deploy:local

# Terminal 3: Start mock server (new terminal)
npm run server

# Terminal 4: Start oracle (new terminal)
npm run oracle

# Terminal 5: Start frontend (new terminal)
npm run client
```
Open browser → `http://localhost:5173`

> **Note:** The `deployed-contract.json` file is committed to GitHub so the oracle & frontend auto-connect after `deploy:local`. You don't need MetaMask — the app uses local hardhat wallets by default.

---

## 🧪 Testing & Verification Commands

### Run Smart Contract Automated Tests
```bash
npm test
```
*Executes all unit tests in `test/SLAManager.test.js` to verify staking, consecutive strikes, payouts, and termination.*

### Recompile Solidity Smart Contracts
```bash
npm run compile
```

---

## 📱 Commands for Your Teammate (Remote / Same Wi-Fi)

Your laptop's Wi-Fi IP is: **`192.168.0.101`** *(run `ipconfig` in cmd to find yours)*

### 1. Teammate Opens Dashboard in Browser:
```text
http://192.168.0.101:5173
```

### 2. Teammate Triggers Faults via Browser URL:
* 💥 **Trigger 500 Pod Crash:** `http://192.168.0.101:4000/toggle-failure/error`
* ⏱️ **Trigger Latency Spike (~1400ms):** `http://192.168.0.101:4000/toggle-failure/slow`
* 🟢 **Restore Healthy (~40ms):** `http://192.168.0.101:4000/toggle-failure/normal`

### 3. Teammate Triggers Faults via Terminal (`curl`):
```bash
# Crash server (HTTP 500)
curl -X POST http://192.168.0.101:4000/toggle-failure -H "Content-Type: application/json" -d "{\"mode\":\"error\"}"

# Inject high latency (1400ms)
curl -X POST http://192.168.0.101:4000/toggle-failure -H "Content-Type: application/json" -d "{\"mode\":\"slow\",\"slowLatencyMs\":1400}"
```

### 4. Over the Internet (Anywhere in the World via Tunnel):
```bash
npx localtunnel --port 4000
```
*Give the generated public URL (e.g., `https://example.loca.lt/toggle-failure/error`) to anyone in the world to trigger the breach remotely!*

---

## 🔧 Troubleshooting & Handy Fixes

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"Error: connect ECONNREFUSED 127.0.0.1:8545"** | Blockchain node is not running | Run `npm run node` in Terminal 1 first. |
| **"Contract not connected" in frontend** | Smart contract not deployed yet | Run `npm run deploy:local` in Terminal 2. |
| **"EADDRINUSE: address already in use"** | A previous instance of server/oracle is still open | Close old terminal windows or kill process using `netstat -ano \| findstr :4000`. |
| **SLA stuck on old state** | Hardhat node was restarted without re-deploying | Run `npm run deploy:local` to refresh contract addresses. |
| **Strikes always reset to 0** | Server went back to "normal" mode between oracle polls | Keep server in error/slow mode for 2+ consecutive oracle polls (each poll is 6 seconds). |
| **Strike counter jumps from 0 to BREACHED** | SLA was created with Failure Limit = 1 | Create a new SLA with Failure Limit = 3 or higher to see strikes accumulate. |
