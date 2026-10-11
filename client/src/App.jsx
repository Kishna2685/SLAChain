import React, { useState, useEffect } from "react";
import { useWeb3, HARDHAT_ACCOUNTS } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import MetricsOverview from "./components/MetricsOverview";
import MockApiControlPanel from "./components/MockApiControlPanel";
import SLACard from "./components/SLACard";
import CreateSLAModal from "./components/CreateSLAModal";
import OracleStatusWidget from "./components/OracleStatusWidget";
import EventLogFeed from "./components/EventLogFeed";
import { Shield, Plus, Activity, Zap, CheckCircle2, Layers, Cpu, Server } from "lucide-react";
import axios from "axios";

export default function App() {
  const { slas, loading, events, createSLA, isConnected, balance } = useWeb3();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [oracleStatus, setOracleStatus] = useState(null);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  // Poll Oracle Telemetry Status
  useEffect(() => {
    const fetchOracleStatus = async () => {
      try {
        const res = await axios.get("http://localhost:4001/oracle/status", {
          timeout: 2000,
        });
        setOracleStatus(res.data);
      } catch (err) {
        setOracleStatus(null);
      }
    };

    fetchOracleStatus();
    const interval = setInterval(fetchOracleStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Quick 1-click Demo SLA creator
  const createDemoSLA = async () => {
    try {
      setIsCreatingDemo(true);
      await createSLA({
        clientAddress: HARDHAT_ACCOUNTS[1]?.address || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        apiEndpoint: "http://localhost:4000/health",
        maxLatencyMs: 250,
        consecutiveFailureLimit: 3,
        penaltyAmountEth: "0.5",
        collateralEth: "0.8",
        durationSeconds: 3600,
      });
    } catch (err) {
      alert("Failed to create demo SLA: " + (err.reason || err.message));
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const filteredSLAs = slas.filter((sla) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return sla.status === 0;
    if (statusFilter === "BREACHED") return sla.status === 1;
    if (statusFilter === "COMPLETED") return sla.status === 3;
    return true;
  });

  return (
    <div className="min-h-screen bg-cyber-900 text-slate-100 cyber-grid flex flex-col justify-between">
      <div>
        <Navbar onOpenCreateModal={() => setIsModalOpen(true)} oracleStatus={oracleStatus} />

        <main className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-10 space-y-10">
          
          {/* Hero Banner */}
          <div className="relative rounded-3xl p-8 sm:p-10 overflow-hidden glass-panel border border-cyan-500/30 bg-gradient-to-r from-cyber-900 via-cyber-850 to-cyber-900">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-code mb-4">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Zero-Trust Autonomous Service Level Agreement Protocol</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Automated SLA Telemetry & <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-200 to-purple-400">
                  On-Chain Penalty Execution
                </span>
              </h1>
              <p className="mt-3.5 text-slate-400 text-sm sm:text-base leading-relaxed">
                Microservice providers stake ETH collateral against strict SLA guarantees (latency, availability).
                An autonomous off-chain Oracle continuously audits API health and enforces instant on-chain penalty transfers to clients upon breach.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3.5">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm shadow-neon-cyan transition-all transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4 text-black stroke-[3]" />
                  <span>Stake Collateral & Create SLA</span>
                </button>

                {slas.length === 0 && (
                  <button
                    onClick={createDemoSLA}
                    disabled={isCreatingDemo}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyber-800 hover:bg-cyber-700 text-cyan-300 border border-cyan-500/40 font-semibold text-sm transition"
                  >
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span>{isCreatingDemo ? "Deploying..." : "Deploy 1-Click Demo SLA"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Overview Cards */}
          <MetricsOverview slas={slas} oracleStatus={oracleStatus} />

          {/* Microservice Chaos & Simulation Panel */}
          <MockApiControlPanel apiBaseUrl="http://localhost:4000" slas={slas} />

          {/* SLA Registry Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-slate-100">
                  Live SLA Contract Registry
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-code font-bold">
                  {slas.length} Active Agmts
                </span>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-cyber-850 border border-slate-800 text-xs font-code">
                {["ALL", "ACTIVE", "BREACHED", "COMPLETED"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg transition font-medium ${
                      statusFilter === tab
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* SLA Grid */}
            {filteredSLAs.length === 0 ? (
              <div className="p-12 text-center rounded-2xl glass-panel border border-dashed border-slate-800">
                <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-300">No SLA Agreements Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  No contracts match the selected filter. Create your first microservice SLA agreement or launch a 1-click demo SLA above.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition"
                >
                  Create New SLA Agreement
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSLAs.map((sla) => (
                  <SLACard key={sla.id} sla={sla} />
                ))}
              </div>
            )}
          </div>

          {/* Telemetry & Audit Stream Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OracleStatusWidget oracleStatus={oracleStatus} />
            <EventLogFeed events={events} />
          </div>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-cyber-900/80 mt-16 py-6 text-center text-xs text-slate-500 font-code">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>AegisSLA Protocol // Autonomous Smart Contract Escrow & SLA Enforcement</div>
          <div className="text-slate-400">Hardhat &bull; Solidity 0.8.20 &bull; Ethers v6 &bull; Express Oracle</div>
        </div>
      </footer>

      {/* Modal */}
      <CreateSLAModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
