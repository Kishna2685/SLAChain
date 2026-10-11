import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import {
  Shield,
  Activity,
  AlertOctagon,
  CheckCircle,
  ExternalLink,
  Clock,
  Coins,
  ChevronRight,
  Play,
  RotateCcw,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import axios from "axios";

export default function SLACard({ sla }) {
  const { account, resolveSLA, terminateSLA, contractAddress } = useWeb3();
  const [isResolving, setIsResolving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const isProvider = account?.toLowerCase() === sla.provider?.toLowerCase();
  const isClient = account?.toLowerCase() === sla.client?.toLowerCase();

  const isExpired = Date.now() / 1000 >= sla.expiresAt;
  const canResolve = sla.status === 0 && isExpired && isProvider;
  const isActive = sla.status === 0;

  const handleResolve = async () => {
    try {
      setIsResolving(true);
      await resolveSLA(sla.id);
    } catch (err) {
      alert("Resolution failed: " + (err.reason || err.message));
    } finally {
      setIsResolving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await terminateSLA(sla.id);
      setShowConfirmDelete(false);
    } catch (err) {
      alert("Termination failed: " + (err.reason || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDirectPing = async () => {
    setIsTesting(true);
    const start = Date.now();
    try {
      const res = await axios.get(sla.apiEndpoint, {
        timeout: 5000,
        validateStatus: () => true,
      });
      const latency = Date.now() - start;
      setTestResult({
        status: res.status,
        latency,
        isBreach: latency > sla.maxLatencyMs || res.status >= 400,
      });
    } catch (err) {
      const latency = Date.now() - start;
      setTestResult({
        status: "ERR",
        latency,
        isBreach: true,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const shorten = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const statusConfig = {
    0: {
      label: "ACTIVE",
      bg: "bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-neon-emerald",
      dot: "bg-emerald-400 animate-pulse",
    },
    1: {
      label: "BREACHED (PENALTY PAID)",
      bg: "bg-rose-950/60 text-rose-400 border-rose-500/40 shadow-neon-crimson",
      dot: "bg-rose-500",
    },
    2: {
      label: "DELETED / TERMINATED",
      bg: "bg-slate-800/60 text-slate-400 border-slate-700",
      dot: "bg-slate-500",
    },
    3: {
      label: "COMPLETED / RESOLVED",
      bg: "bg-blue-950/60 text-blue-400 border-blue-500/40",
      dot: "bg-blue-400",
    },
  };

  const currentStatus = statusConfig[sla.status] || statusConfig[0];

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3.5 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-code font-bold text-xs text-cyan-400">
              #{sla.id}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-200">
                SLA Agreement #{sla.id}
              </div>
              <div className="text-[11px] text-slate-400 font-code truncate max-w-[160px] sm:max-w-xs">
                {sla.apiEndpoint}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center space-x-1.5 ${currentStatus.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`}></span>
              <span>{currentStatus.label}</span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal / Inline Overlay */}
        {showConfirmDelete && (
          <div className="mb-4 p-4 rounded-xl bg-rose-950/80 border-2 border-rose-500/60 text-xs shadow-2xl animate-fadeIn">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-rose-200 text-sm">
                  Delete & Terminate SLA #{sla.id}?
                </div>
                <div className="text-rose-200/80 text-xs mt-1 leading-relaxed">
                  This will cancel the agreement on the blockchain and refund your{" "}
                  <span className="font-bold text-white underline">
                    {sla.stakedCollateralEth} ETH
                  </span>{" "}
                  staked collateral back to your wallet.
                </div>
                <div className="mt-3 flex items-center space-x-2.5">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-neon-crimson transition flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? "Terminating on Blockchain..." : "Yes, Delete & Refund ETH"}</span>
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Failure Strikes Bar */}
        <div className="mb-4 p-3 rounded-xl bg-cyber-900 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-medium flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Consecutive Failure Strikes</span>
            </span>
            <span className={`font-code font-bold ${sla.status === 1 ? "text-rose-400" : "text-slate-200"}`}>
              {sla.status === 1
                ? `${sla.consecutiveFailureLimit} / ${sla.consecutiveFailureLimit} strikes (BREACHED)`
                : `${sla.currentFailures} / ${sla.consecutiveFailureLimit} strikes`}
            </span>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center space-x-1.5">
            {Array.from({ length: sla.consecutiveFailureLimit }).map((_, idx) => {
              const isFilled = sla.status === 1 || idx < sla.currentFailures;
              return (
                <div
                  key={idx}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    isFilled
                      ? "bg-rose-500 shadow-neon-crimson"
                      : "bg-slate-800 border border-slate-700/50"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyber-850/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Max Latency Limit</div>
            <div className="text-sm font-bold text-cyan-300 font-code mt-0.5">
              &le; {sla.maxLatencyMs} ms
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-cyber-850/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Penalty Payout</div>
            <div className="text-sm font-bold text-rose-400 font-code mt-0.5">
              {sla.penaltyAmountEth} ETH
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-cyber-850/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Staked Collateral</div>
            <div className="text-sm font-bold text-purple-400 font-code mt-0.5">
              {sla.stakedCollateralEth} ETH
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-cyber-850/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Agreement Age</div>
            <div className="text-sm font-bold text-slate-300 font-code mt-0.5">
              {Math.max(0, Math.floor((Date.now() / 1000 - sla.createdAt) / 60))}m ago
            </div>
          </div>
        </div>

        {/* Counterparty addresses */}
        <div className="space-y-1.5 text-xs font-code mb-4 p-2.5 rounded-xl bg-cyber-900 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Provider:</span>
            <span className="text-slate-300 flex items-center space-x-1">
              <span>{shorten(sla.provider)}</span>
              {isProvider && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-bold">
                  YOU
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Client / Beneficiary:</span>
            <span className="text-slate-300 flex items-center space-x-1">
              <span>{shorten(sla.client)}</span>
              {isClient && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900 text-purple-300 border border-purple-500/30 font-bold">
                  YOU
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions Toolbar */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDirectPing}
            disabled={isTesting}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyber-800 hover:bg-cyber-700 text-slate-300 hover:text-cyan-300 text-xs font-medium border border-slate-700 transition"
          >
            <Play className={`w-3 h-3 ${isTesting ? "animate-spin" : ""}`} />
            <span>{isTesting ? "Probing..." : "Test Ping"}</span>
          </button>

          {testResult && (
            <span
              className={`text-xs font-code font-bold ${
                testResult.isBreach ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {testResult.status} ({testResult.latency}ms)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {canResolve && (
            <button
              onClick={handleResolve}
              disabled={isResolving}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs shadow-neon-emerald transition"
            >
              <RotateCcw className={`w-3 h-3 ${isResolving ? "animate-spin" : ""}`} />
              <span>{isResolving ? "Resolving..." : "Resolve & Claim"}</span>
            </button>
          )}

          {/* Prominent Delete SLA Button */}
          {isActive && !showConfirmDelete && (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-500/40 text-xs font-bold transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete SLA</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
