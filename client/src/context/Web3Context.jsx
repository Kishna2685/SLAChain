import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import defaultDeployment from "../contracts/deployedContract.json";

const Web3Context = createContext();

// Pre-funded Hardhat local accounts for quick one-click testing
export const HARDHAT_ACCOUNTS = [
  {
    name: "Account #0 (Default Provider)",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    role: "Provider / Staker",
  },
  {
    name: "Account #2 (Default Client / Consumer)",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb2f9547b188984d75e1f58b09fc0493b143729",
    role: "Client / Beneficiary",
  },
  {
    name: "Account #1 (Oracle Signer)",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    role: "Monitoring Oracle Bot",
  },
];

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [contract, setContract] = useState(null);
  const [contractAddress, setContractAddress] = useState(defaultDeployment.address || "");
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMetaMask, setIsMetaMask] = useState(false);
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);

  // Initialize Provider (Local Hardhat Node fallback or window.ethereum)
  const initWeb3 = useCallback(async (customPrivateKey = null) => {
    try {
      let currentProvider;
      let currentSigner;
      let userAccount;

      if (customPrivateKey) {
        // Use custom hardhat account via JsonRpcProvider
        currentProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const wallet = new ethers.Wallet(customPrivateKey, currentProvider);
        currentSigner = wallet;
        userAccount = wallet.address;
        setIsMetaMask(false);
      } else if (window.ethereum) {
        // Use browser MetaMask
        currentProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await currentProvider.send("eth_requestAccounts", []);
        currentSigner = await currentProvider.getSigner();
        userAccount = accounts[0];
        setIsMetaMask(true);
      } else {
        // Fallback to local hardhat default wallet
        currentProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const defaultWallet = new ethers.Wallet(HARDHAT_ACCOUNTS[0].privateKey, currentProvider);
        currentSigner = defaultWallet;
        userAccount = defaultWallet.address;
        setIsMetaMask(false);
      }

      setProvider(currentProvider);
      setSigner(currentSigner);
      setAccount(userAccount);
      setIsConnected(true);

      const network = await currentProvider.getNetwork();
      setChainId(Number(network.chainId));

      const bal = await currentProvider.getBalance(userAccount);
      setBalance(ethers.formatEther(bal));

      // Instantiate contract
      if (defaultDeployment.address && defaultDeployment.abi) {
        const slaContract = new ethers.Contract(
          defaultDeployment.address,
          defaultDeployment.abi,
          currentSigner
        );
        setContract(slaContract);
        setContractAddress(defaultDeployment.address);
      }

      return true;
    } catch (err) {
      console.warn("Could not connect to Web3 Provider:", err.message);
      return false;
    }
  }, []);

  // Fetch all SLAs from Smart Contract
  const fetchSLAs = useCallback(async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const rawSLAs = await contract.getAllSLAs();
      const statusLabels = ["Active", "Breached", "Terminated", "Completed"];

      const formatted = rawSLAs.map((item) => ({
        id: Number(item.id),
        provider: item.provider,
        client: item.client,
        apiEndpoint: item.apiEndpoint,
        maxLatencyMs: Number(item.maxLatencyMs),
        consecutiveFailureLimit: Number(item.consecutiveFailureLimit),
        currentFailures: Number(item.currentFailures),
        stakedCollateralEth: ethers.formatEther(item.stakedCollateral),
        penaltyAmountEth: ethers.formatEther(item.penaltyAmount),
        stakedCollateralRaw: item.stakedCollateral,
        penaltyAmountRaw: item.penaltyAmount,
        status: Number(item.status),
        statusLabel: statusLabels[Number(item.status)] || "Unknown",
        createdAt: Number(item.createdAt),
        duration: Number(item.duration),
        expiresAt: Number(item.createdAt) + Number(item.duration),
      }));

      setSlas(formatted);

      if (account && provider) {
        const bal = await provider.getBalance(account);
        setBalance(ethers.formatEther(bal));
      }
    } catch (err) {
      console.error("Error fetching SLAs:", err);
    } finally {
      setLoading(false);
    }
  }, [contract, account, provider]);

  // Create new SLA
  const createSLA = async ({
    clientAddress,
    apiEndpoint,
    maxLatencyMs,
    consecutiveFailureLimit,
    penaltyAmountEth,
    collateralEth,
    durationSeconds = 86400,
  }) => {
    if (!contract) throw new Error("Contract not connected");
    const penaltyWei = ethers.parseEther(penaltyAmountEth.toString());
    const collateralWei = ethers.parseEther(collateralEth.toString());

    const tx = await contract.createSLA(
      clientAddress,
      apiEndpoint,
      maxLatencyMs,
      consecutiveFailureLimit,
      penaltyWei,
      durationSeconds,
      { value: collateralWei }
    );

    const receipt = await tx.wait();
    await fetchSLAs();
    return receipt;
  };

  // Resolve SLA (after duration expires cleanly)
  const resolveSLA = async (slaId) => {
    if (!contract) throw new Error("Contract not connected");
    const tx = await contract.resolveSLA(slaId);
    const receipt = await tx.wait();
    await fetchSLAs();
    return receipt;
  };

  // Terminate / Delete SLA (Refunds remaining collateral to provider)
  const terminateSLA = async (slaId) => {
    if (!contract) throw new Error("Contract not connected");
    const tx = await contract.terminateSLA(slaId);
    const receipt = await tx.wait();
    await fetchSLAs();
    return receipt;
  };

  // Switch to a local preset account
  const selectLocalAccount = async (index) => {
    if (HARDHAT_ACCOUNTS[index]) {
      setActiveAccountIndex(index);
      await initWeb3(HARDHAT_ACCOUNTS[index].privateKey);
    }
  };

  // Connect MetaMask explicitly with auto-network switch/add
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Using local Hardhat testnet signer.");
      return;
    }
    try {
      // 0x7a69 is 31337 in hex (Hardhat chainId)
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x7a69" }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain ID")) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x7a69",
                chainName: "Hardhat Localhost",
                rpcUrls: ["http://127.0.0.1:8545"],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });
        }
      }
      await initWeb3(null);
    } catch (err) {
      console.warn("MetaMask connection or chain switch failed:", err);
      await initWeb3(null);
    }
  };

  // Event Listeners for live real-time contract updates
  useEffect(() => {
    if (!contract) return;

    const onSLACreated = (slaId, provider, client, endpoint, collateral, penalty, maxLat, limit, event) => {
      const log = {
        id: `created-${slaId}-${Date.now()}`,
        type: "CREATED",
        title: `New SLA #${slaId} Created`,
        details: `Endpoint: ${endpoint} | Collateral: ${ethers.formatEther(collateral)} ETH`,
        txHash: event?.log?.transactionHash || "0x...",
        timestamp: new Date().toLocaleTimeString(),
      };
      setEvents((prev) => [log, ...prev.slice(0, 30)]);
      fetchSLAs();
    };

    const onSLACheckFailed = (slaId, failureCount, measuredLatency, reason, event) => {
      const log = {
        id: `failed-${slaId}-${Date.now()}`,
        type: "FAULT",
        title: `⚠️ SLA #${slaId} Fault Detected`,
        details: `Latency: ${measuredLatency}ms | Consecutive: ${failureCount} | Reason: ${reason}`,
        txHash: event?.log?.transactionHash || "0x...",
        timestamp: new Date().toLocaleTimeString(),
      };
      setEvents((prev) => [log, ...prev.slice(0, 30)]);
      fetchSLAs();
    };

    const onSLABreached = (slaId, penaltyPaid, client, refund, event) => {
      const log = {
        id: `breached-${slaId}-${Date.now()}`,
        type: "BREACH",
        title: `💥 SLA #${slaId} BREACHED! Penalty Executed`,
        details: `Transferred ${ethers.formatEther(penaltyPaid)} ETH to Client ${client.slice(0, 8)}...`,
        txHash: event?.log?.transactionHash || "0x...",
        timestamp: new Date().toLocaleTimeString(),
      };
      setEvents((prev) => [log, ...prev.slice(0, 30)]);
      fetchSLAs();
    };

    const onSLAResolved = (slaId, returnedCollateral, provider, event) => {
      const log = {
        id: `resolved-${slaId}-${Date.now()}`,
        type: "RESOLVED",
        title: `🎉 SLA #${slaId} Resolved`,
        details: `Returned ${ethers.formatEther(returnedCollateral)} ETH collateral to provider`,
        txHash: event?.log?.transactionHash || "0x...",
        timestamp: new Date().toLocaleTimeString(),
      };
      setEvents((prev) => [log, ...prev.slice(0, 30)]);
      fetchSLAs();
    };

    const onSLATerminated = (slaId, returnedCollateral, provider, event) => {
      const log = {
        id: `terminated-${slaId}-${Date.now()}`,
        type: "TERMINATED",
        title: `🗑️ SLA #${slaId} Deleted / Terminated`,
        details: `Agreement closed. Refunded ${ethers.formatEther(returnedCollateral)} ETH collateral to provider`,
        txHash: event?.log?.transactionHash || "0x...",
        timestamp: new Date().toLocaleTimeString(),
      };
      setEvents((prev) => [log, ...prev.slice(0, 30)]);
      fetchSLAs();
    };

    contract.on("SLACreated", onSLACreated);
    contract.on("SLACheckFailed", onSLACheckFailed);
    contract.on("SLABreached", onSLABreached);
    contract.on("SLAResolved", onSLAResolved);
    contract.on("SLATerminated", onSLATerminated);

    return () => {
      contract.removeAllListeners();
    };
  }, [contract, fetchSLAs]);

  // Initial load
  useEffect(() => {
    initWeb3(HARDHAT_ACCOUNTS[0].privateKey);
  }, [initWeb3]);

  useEffect(() => {
    if (contract) {
      fetchSLAs();
      const interval = setInterval(fetchSLAs, 4000);
      return () => clearInterval(interval);
    }
  }, [contract, fetchSLAs]);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        balance,
        contract,
        contractAddress,
        chainId,
        isConnected,
        isMetaMask,
        slas,
        loading,
        events,
        activeAccountIndex,
        selectLocalAccount,
        connectMetaMask,
        createSLA,
        resolveSLA,
        terminateSLA,
        deleteSLA: terminateSLA,
        fetchSLAs,
        initWeb3,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
