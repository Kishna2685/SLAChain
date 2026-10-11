import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("==================================================");
  console.log("🚀 Deploying SLAManager Contract...");
  console.log("==================================================");

  const [deployer, oracleSigner, clientSigner] = await hre.ethers.getSigners();
  console.log(`📡 Deployer Address : ${deployer.address}`);
  console.log(`🤖 Oracle Signer    : ${oracleSigner ? oracleSigner.address : deployer.address}`);

  const oracleAddress = oracleSigner ? oracleSigner.address : deployer.address;

  const SLAManagerFactory = await hre.ethers.getContractFactory("SLAManager");
  const slaManager = await SLAManagerFactory.deploy(oracleAddress);
  await slaManager.waitForDeployment();

  const contractAddress = await slaManager.getAddress();
  console.log(`✅ SLAManager deployed at: ${contractAddress}`);

  // Create initial demo SLA if local network
  const network = await hre.ethers.provider.getNetwork();
  console.log(`🌐 Network Chain ID     : ${network.chainId}`);

  const contractArtifact = await hre.artifacts.readArtifact("SLAManager");

  const deploymentData = {
    address: contractAddress,
    chainId: Number(network.chainId),
    oracleAddress: oracleAddress,
    deployerAddress: deployer.address,
    clientAddress: clientSigner ? clientSigner.address : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    abi: contractArtifact.abi,
    deployedAt: new Date().toISOString(),
  };

  // Save to root for Oracle and scripts
  fs.writeFileSync(
    path.join(__dirname, "..", "deployed-contract.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  // Save to client directory
  const clientContractsDir = path.join(__dirname, "..", "client", "src", "contracts");
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(clientContractsDir, "deployedContract.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("💾 Saved deployment info to deployed-contract.json and client/src/contracts/deployedContract.json");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
