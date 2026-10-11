import React, { useState } from "react";
import { useWeb3, HARDHAT_ACCOUNTS } from "../context/Web3Context";
import { X, Shield, ArrowRight, Zap, Info, Check } from "lucide-react";
import confetti from "canvas-confetti";

export default function CreateSLAModal({ isOpen, onClose }) {
  const { createSLA, account, balance } = useWeb3();

  const [clientAddress, setClientAddress] = useState(
    HARDHAT_ACCOUNTS[1]?.address || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  );
  const [apiEndpoint, setApiEndpoint] = useState("http://localhost:4000/health");
  const [maxLatencyMs, setMaxLatencyMs] = useState("250");
  const [consecutiveLimit, setConsecutiveLimit] = useState("3");
  const [penaltyAmountEth, setPenaltyAmountEth] = useState("0.5");
  const [collateralEth, setCollateralEth] = useState("0.8");
  const [durationMinutes, setDurationMinutes] = useState("10");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const applyPreset = (preset) => {
    setMaxLatencyMs(preset.latency);
    setConsecutiveLimit(preset.limit);
    setPenaltyAmountEth(preset.penalty);
    setCollateralEth(preset.collateral);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!clientAddress || !apiEndpoint) {
      setErrorMsg("Please provide client address and API endpoint.");
      return;
    }

    const penalty = parseFloat(penaltyAmountEth);
    const collateral = parseFloat(collateralEth);

    if (isNaN(penalty) || penalty <= 0) {
      setErrorMsg("Penalty amount must be greater than 0 ETH.");
      return;
    }

    if (isNaN(collateral) || collateral < penalty) {
      setErrorMsg("Staked collateral must be greater than or equal to penalty amount.");
      return;
    }

    try {
      setIsSubmitting(true);
      const durationSec = Math.max(60, parseInt(durationMinutes || "10", 10) * 60);

      await createSLA({
        clientAddress,
        apiEndpoint,
        maxLatencyMs: parseInt(maxLatencyMs, 10),
        consecutiveFailureLimit: parseInt(consecutiveLimit, 10),
        penaltyAmountEth,
        collateralEth,
        durationSeconds: durationSec,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.reason || err.message || "Failed to create SLA contract.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel bg-cyber-900 border border-cyan-500/30 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Register SLA & Stake Collateral
              </h2>
              <p className="text-xs text-slate-400 font-code">
                Lock escrow collateral to guarantee microservice performance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            SLA Tier Presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                applyPreset({ latency: "150", limit: "2", penalty: "0.8", collateral: "1.2" })
              }
              className="p-2.5 rounded-xl bg-cyber-850 hover:bg-cyber-800 border border-slate-800 hover:border-cyan-500/40 text-left transition"
            >
              <div className="text-xs font-bold text-cyan-400">⚡ Ultra Fast</div>
              <div className="text-[11px] text-slate-400">150ms / 2 strikes</div>
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset({ latency: "300", limit: "3", penalty: "0.5", collateral: "0.8" })
              }
              className="p-2.5 rounded-xl bg-cyber-850 hover:bg-cyber-800 border border-slate-800 hover:border-purple-500/40 text-left transition"
            >
              <div className="text-xs font-bold text-purple-400">⚖️ Standard API</div>
              <div className="text-[11px] text-slate-400">300ms / 3 strikes</div>
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset({ latency: "800", limit: "5", penalty: "0.2", collateral: "0.4" })
              }
              className="p-2.5 rounded-xl bg-cyber-850 hover:bg-cyber-800 border border-slate-800 hover:border-emerald-500/40 text-left transition"
            >
              <div className="text-xs font-bold text-emerald-400">📦 Batch Pipeline</div>
              <div className="text-[11px] text-slate-400">800ms / 5 strikes</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Endpoint */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Microservice Health API Endpoint
            </label>
            <input
              type="text"
              required
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="http://localhost:4000/health"
              className="w-full px-3.5 py-2.5 rounded-xl glass-input font-code text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              The Oracle bot will periodically ping this URL (HTTP GET) and measure round-trip latency.
            </p>
          </div>

          {/* Client Address */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Client / Beneficiary Address
              </label>
              <button
                type="button"
                onClick={() => setClientAddress(HARDHAT_ACCOUNTS[1]?.address)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Use Hardhat Account #2 (Client)
              </button>
            </div>
            <input
              type="text"
              required
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3.5 py-2.5 rounded-xl glass-input font-code text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              If terms are breached, the penalty payout will be transferred directly to this wallet.
            </p>
          </div>

          {/* Thresholds Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Max Allowable Latency (ms)
              </label>
              <input
                type="number"
                min="10"
                max="10000"
                required
                value={maxLatencyMs}
                onChange={(e) => setMaxLatencyMs(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input font-code text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Consecutive Failure Limit
              </label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={consecutiveLimit}
                onChange={(e) => setConsecutiveLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input font-code text-sm"
              />
            </div>
          </div>

          {/* Financials Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Penalty Payout Amount (ETH)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={penaltyAmountEth}
                onChange={(e) => setPenaltyAmountEth(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input font-code text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Collateral to Stake (ETH)
              </label>
              <input
                type="number"
                step="0.01"
                min={penaltyAmountEth}
                required
                value={collateralEth}
                onChange={(e) => setCollateralEth(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input font-code text-sm"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Agreement Duration (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="43200"
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input font-code text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              After this duration expires without breach, the provider can withdraw remaining collateral.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm shadow-neon-cyan transition transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-black stroke-[3]" />
              <span>{isSubmitting ? "Signing & Staking ETH..." : "Stake Collateral & Deploy"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
