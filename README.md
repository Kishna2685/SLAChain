# SLAChain: An Automated Blockchain Framework for Real-Time Service Level Agreement Enforcement and Penalty Execution

> **Autonomous SLA monitoring and penalty execution system built on Ethereum smart contracts. Microservice providers stake ETH collateral against strict SLA guarantees (latency, availability). An off-chain Oracle continuously audits API health and automatically triggers on-chain penalty transfers to clients upon breach.**

---

## 🚀 Quick Start (One Click)

**Just double-click `start-all.bat`** — it will automatically:
1. Check if Node.js is installed
2. Install all dependencies (`npm install`) if missing
3. Compile the Solidity smart contracts
4. Start the local Ethereum blockchain (Hardhat)
5. Deploy the `SLAManager` smart contract
6. Launch the Mock API server, Oracle bot, and React dashboard
7. Open `http://localhost:5173` in your browser

> **Only prerequisite:** [Node.js LTS](https://nodejs.org/) must be installed.

---

## 🧱 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       SLAChain System                           │
│                                                                 │
│  ┌──────────────┐     ┌───────────────┐     ┌───────────────┐  │
│  │  Provider    │────▶│ SLAManager.sol│◀────│  Oracle Bot   │  │
│  │  Stakes ETH  │     │ Smart Contract│     │  Monitors API │  │
│  └──────────────┘     └───────┬───────┘     └───────┬───────┘  │
│                               │ Penalty ETH          │ Pings    │
│                               ▼                      ▼          │
│                       ┌───────────────┐     ┌───────────────┐  │
│                       │  Client Gets  │     │  Mock API /   │  │
│                       │  Paid on Breach│    │  Microservice │  │
│                       └───────────────┘     └───────────────┘  │
│                                                                 │
│                  ┌──────────────────────────┐                   │
│                  │   React Web3 Dashboard   │                   │
│                  │   http://localhost:5173  │                   │
│                  └──────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Services & Ports

| Service | Port | Description |
|:---|:---|:---|
| **Hardhat EVM Node** | `8545` | Local Ethereum blockchain (Chain ID: 31337) |
| **Mock Microservice API** | `4000` | Provider API with failure simulation modes |
| **Oracle Monitor Bot** | `4001` | Off-chain SLA auditor & breach executor |
| **React Frontend** | `5173` | Web3 dashboard for SLA management |

---

## 🔬 Tech Stack

| Layer | Technology |
|:---|:---|
| Smart Contract | Solidity 0.8.20, OpenZeppelin (Ownable, ReentrancyGuard) |
| Blockchain Dev | Hardhat 2.x, Hardhat Toolbox |
| Off-chain Oracle | Node.js, Ethers.js v6, Axios |
| Mock Server | Express.js, CORS |
| Frontend | React 18, Vite, Tailwind CSS, Ethers.js v6 |
| Web3 Wallet | MetaMask / Hardhat local wallets |

---

## 📂 Project Structure

```
SLAChain/
├── contracts/
│   └── SLAManager.sol        # Core Solidity smart contract
├── scripts/
│   └── deploy.js             # Hardhat deployment script
├── test/
│   └── SLAManager.test.js    # Full unit test suite
├── oracle/
│   └── monitor.js            # Off-chain monitoring oracle bot
├── server/
│   └── mockApi.js            # Mock microservice with failure simulation
├── client/                   # React + Vite frontend dashboard
│   └── src/
│       ├── App.jsx
│       ├── context/Web3Context.jsx
│       └── components/
├── start-all.bat             # One-click launcher (auto-installs everything)
├── deployed-contract.json    # Auto-generated after deploy
└── COMMANDS.md               # Full command reference guide
```

---

## 🧪 How It Works

1. **Provider** creates an SLA by staking ETH collateral into the smart contract, defining:
   - Target API endpoint to monitor
   - Maximum allowed response latency (ms)
   - Consecutive failure limit before breach
   - Penalty amount to pay client on breach

2. **Oracle Bot** polls the API endpoint every 6 seconds. On each check:
   - ✅ Healthy → `reportSuccess()` resets failure counter
   - ⚠️ High Latency / Error → `reportBreach()` increments strike counter
   - 💥 Strike limit reached → contract auto-transfers penalty ETH to client

3. **Client** automatically receives penalty ETH on breach — no manual claim needed.

4. **Provider** can resolve the SLA after the duration expires (collateral returned) or terminate early.

---

## 🛠️ Manual Commands (if not using start-all.bat)

See [`COMMANDS.md`](./COMMANDS.md) for the full step-by-step guide.

```bash
# Terminal 1 — Start blockchain
npm run node

# Terminal 2 — Deploy contract
npm run deploy:local

# Terminal 3 — Start mock API
npm run server

# Terminal 4 — Start oracle
npm run oracle

# Terminal 5 — Start frontend
npm run client
```

---

## 🧬 Smart Contract: SLAManager.sol

| Function | Caller | Description |
|:---|:---|:---|
| `createSLA(...)` | Provider | Stakes ETH and registers SLA terms |
| `reportBreach(slaId, latency, isDown)` | Oracle | Records a failure strike; auto-pays penalty on limit |
| `reportSuccess(slaId, latency)` | Oracle | Resets consecutive failure counter |
| `resolveSLA(slaId)` | Provider | Closes SLA after duration; refunds remaining collateral |
| `terminateSLA(slaId)` | Provider | Early termination; refunds remaining collateral |
| `getActiveSLAs()` | Anyone | Returns all currently active SLA agreements |

---

## 👤 Authors

**Kishan** — [github.com/Kishna2685](https://github.com/Kishna2685)

---

## 📄 License

MIT License
