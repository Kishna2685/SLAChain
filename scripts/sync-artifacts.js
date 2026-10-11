import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "SLAManager.sol",
  "SLAManager.json"
);

if (fs.existsSync(artifactPath)) {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const initialDeployment = {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Standard first deployed contract address on Hardhat node
    chainId: 31337,
    oracleAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    deployerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    clientAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    abi: artifact.abi,
    deployedAt: new Date().toISOString(),
  };

  // Root deployed-contract.json
  fs.writeFileSync(
    path.join(__dirname, "..", "deployed-contract.json"),
    JSON.stringify(initialDeployment, null, 2)
  );

  // Client contracts dir
  const clientContractsDir = path.join(__dirname, "..", "client", "src", "contracts");
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(clientContractsDir, "deployedContract.json"),
    JSON.stringify(initialDeployment, null, 2)
  );

  console.log("✅ Synced contract ABI and fallback config to client & root.");
} else {
  console.error("❌ Artifact not found. Run npx hardhat compile first.");
}
