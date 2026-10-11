import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Zap,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  Radio,
  Target,
  ChevronDown,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function MockApiControlPanel({ apiBaseUrl = "http://localhost:4000", slas = [] }) {
  const [apiState, setApiState] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isServerReachable, setIsServerReachable] = useState(true);

  // Selected SLA and Staged Mode for Chaos
  const [selectedSlaId, setSelectedSlaId] = useState(slas[0]?.id ?? 0);
  const [stagedMode, setStagedMode] = useState("slow"); // mode picked by user before confirming
  const [stagedLatency, setStagedLatency] = useState(1400);
  const [appliedNotification, setAppliedNotification] = useState(null);

  // Keep selected SLA in sync if slas change
  useEffect(() => {
    if (slas.length > 0 && !slas.some((s) => s.id === selectedSlaId)) {
      setSelectedSlaId(slas[0].id);
    }
  }, [slas, selectedSlaId]);

  const activeSla = slas.find((s) => s.id === selectedSlaId) || slas[0];

  // Fetch current mock API state
  const fetchState = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/status`, { timeout: 3000 });
      setApiState(res.data);
      setIsServerReachable(true);
    } catch (err) {
      setIsServerReachable(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  // Execute Chaos on the Mock Microservice
  const applyChaos = async () => {
    setIsUpdating(true);
    try {
      const endpoint = activeSla?.apiEndpoint || `${apiBaseUrl}/health`;
      // Extract base URL from SLA endpoint if custom
      let targetBase = apiBaseUrl;
      try {
        const parsed = new URL(endpoint);
        targetBase = `${parsed.protocol}//${parsed.host}`;
      } catch (e) {}

      await axios.post(`${targetBase}/toggle-failure`, {
        mode: stagedMode,
        slowLatencyMs: stagedLatency,
      });

      await fetchState();

      setAppliedNotification({
        slaId: activeSla?.id ?? 0,
        mode: stagedMode,
        latency: stagedLatency,
        timestamp: new Date().toLocaleTimeString(),
      });

      setTimeout(() => setAppliedNotification(null), 8000);
    } catch (err) {
      console.error("Error executing chaos:", err);
      alert("Failed to send chaos command to API server: " + (err.message || "Network error"));
    } finally {
      setIsUpdating(false);
    }
  };

  // Manual Ping directly from browser
  const runManualPing = async () => {
    setIsPinging(true);
    const start = Date.now();
    const targetUrl = activeSla?.apiEndpoint || `${apiBaseUrl}/health`;

    try {
      const res = await axios.get(targetUrl, {
        timeout: 6000,
        validateStatus: () => true,
      });
      const elapsed = Date.now() - start;
      setPingResult({
        timestamp: new Date().toLocaleTimeString(),
        status: res.status,
        latency: elapsed,
        data: res.data,
        isSuccess: res.status >= 200 && res.status < 300,
      });
    } catch (err) {
      const elapsed = Date.now() - start;
      setPingResult({
        timestamp: new Date().toLocaleTimeString(),
        status: 0,
        latency: elapsed,
        error: err.code === "ECONNABORTED" ? "Timeout (>6s)" : (err.message || "Failed"),
        isSuccess: false,
      });
    } finally {
      setIsPinging(false);
      fetchState();
    }
  };

  const currentMode = apiState?.mode || "normal";

  const chaosModes = [
    {
      id: "normal",
      label: "1. Normal Healthy State",
      latencyText: "~40ms",
      desc: "Returns HTTP 200 within SLA latency limits.",
      icon: CheckCircle,
      color: "text-emerald-400",
      activeBg: "bg-emerald-950/50 border-emerald-500/70 shadow-neon-emerald",
      badgeBg: "bg-emerald-500/20 text-emerald-300",
      defaultLatency: 40,
    },
    {
      id: "slow",
      label: "2. High Latency Spike",
      latencyText: "~1400ms",
      desc: `Exceeds SLA threshold (${activeSla?.maxLatencyMs || 250}ms). Accumulates failure strikes.`,
      icon: Clock,
      color: "text-amber-400",
      activeBg: "bg-amber-950/50 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
      badgeBg: "bg-amber-500/20 text-amber-300",
      defaultLatency: 1400,
    },
    {
      id: "error",
      label: "3. Pod Crash (HTTP 500)",
      latencyText: "HTTP 500",
      desc: "Internal database crash. Triggers immediate penalty payout.",
      icon: AlertTriangle,
      color: "text-rose-400",
      activeBg: "bg-rose-950/50 border-rose-500/70 shadow-neon-crimson",
      badgeBg: "bg-rose-500/20 text-rose-300",
      defaultLatency: 40,
    },
    {
      id: "offline",
      label: "4. Network Outage (Hang)",
      latencyText: "Timeout 15s",
      desc: "Gateway hang. Oracle flags downtime and pays penalty.",
      icon: XCircle,
      color: "text-purple-400",
      activeBg: "bg-purple-950/50 border-purple-500/70 shadow-neon-purple",
      badgeBg: "bg-purple-500/20 text-purple-300",
      defaultLatency: 15000,
    },
  ];

  return (
    <div className="glass-panel rounded-3xl border border-cyan-500/30 p-6 sm:p-8 relative overflow-hidden space-y-6">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* Header & Target SLA Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100 tracking-wide">
                Microservice Failure Simulation & Chaos Console
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select target SLA, choose failure condition, and click confirm to test real-time breach detection.
              </p>
            </div>
          </div>
        </div>

        {/* Target SLA Selector Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cyber-900 border border-cyan-500/40 text-xs font-code">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Target SLA:</span>
            {slas.length === 0 ? (
              <span className="text-amber-400 font-bold">No Active SLAs (Deploy 1st)</span>
            ) : (
              <select
                value={selectedSlaId}
                onChange={(e) => setSelectedSlaId(Number(e.target.value))}
                className="bg-cyber-850 text-cyan-300 font-bold px-2 py-1 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400"
              >
                {slas.map((s) => (
                  <option key={s.id} value={s.id}>
                    SLA #{s.id} (Max: {s.maxLatencyMs}ms, {s.consecutiveFailureLimit} strikes)
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={runManualPing}
            disabled={isPinging}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyber-800 hover:bg-cyber-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
          >
            <Play className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-cyan-400" : ""}`} />
            <span>{isPinging ? "Testing..." : "Direct Ping"}</span>
          </button>
        </div>
      </div>

      {/* Target SLA Context Bar */}
      {activeSla && (
        <div className="p-3.5 rounded-2xl bg-cyber-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-code">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-slate-400">Endpoint:</span>
            <span className="text-slate-200 font-bold truncate max-w-xs">{activeSla.apiEndpoint}</span>
          </div>

          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-500">Max Latency: </span>
              <span className="text-cyan-400 font-bold">&le; {activeSla.maxLatencyMs}ms</span>
            </div>
            <div>
              <span className="text-slate-500">Failures: </span>
              <span className="text-amber-400 font-bold">
                {activeSla.currentFailures} / {activeSla.consecutiveFailureLimit} strikes
              </span>
            </div>
            <div>
              <span className="text-slate-500">Penalty: </span>
              <span className="text-rose-400 font-bold">{activeSla.penaltyAmountEth} ETH</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Select Failure Mode Grid */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Step 1: Choose Chaos Simulation Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {chaosModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = stagedMode === mode.id;
            const isCurrentlyActiveOnServer = currentMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setStagedMode(mode.id);
                  setStagedLatency(mode.defaultLatency);
                }}
                className={`p-4 rounded-2xl text-left border-2 transition-all relative cursor-pointer ${
                  isSelected
                    ? mode.activeBg
                    : "bg-cyber-850/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${mode.color}`} />
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${mode.badgeBg}`}>
                    {mode.latencyText}
                  </span>
                </div>

                <div className="font-bold text-sm text-slate-100 mt-2.5">{mode.label}</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">{mode.desc}</div>

                {isCurrentlyActiveOnServer && (
                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center space-x-1.5 text-[10px] font-code text-cyan-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>LIVE ON SERVER</span>
                  </div>
                )}

                {isSelected && !isCurrentlyActiveOnServer && (
                  <div className="mt-3 pt-2 border-t border-cyan-500/40 flex items-center space-x-1.5 text-[10px] font-code text-cyan-300 font-bold">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                    <span>SELECTED (CLICK CONFIRM)</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Confirm & Apply Action Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyber-850 via-cyber-900 to-cyber-850 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 font-code">
            Selected Action for <span className="font-bold text-cyan-300">SLA #{activeSla?.id ?? 0}</span>:
          </div>
          <div className="text-sm font-bold text-slate-100 mt-0.5 flex items-center space-x-2">
            <span>
              Switch Microservice to:{" "}
              <span className="uppercase text-cyan-400 font-code underline">{stagedMode}</span>{" "}
              {stagedMode === "slow" ? `(~${stagedLatency}ms)` : ""}
            </span>
          </div>
        </div>

        <button
          onClick={applyChaos}
          disabled={isUpdating}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-neon-cyan transition transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <Zap className="w-4 h-4 text-black stroke-[3]" />
          <span>
            {isUpdating
              ? "Executing Chaos..."
              : `🚀 Confirm & Execute Chaos on SLA #${activeSla?.id ?? 0}`}
          </span>
        </button>
      </div>

      {/* Applied Confirmation Banner */}
      {appliedNotification && (
        <div className="p-3.5 rounded-xl bg-cyan-950/70 border border-cyan-500/60 text-xs font-code text-cyan-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-cyan-400 animate-bounce" />
            <span>
              <strong>Chaos Command Applied [{appliedNotification.timestamp}]:</strong> Microservice state switched to{" "}
              <span className="uppercase font-bold text-cyan-300">'{appliedNotification.mode}'</span>. The Oracle bot will detect the SLA breach on its next check.
            </span>
          </div>
        </div>
      )}

      {/* Direct Ping Result Readout */}
      {pingResult && (
        <div className="p-3 rounded-xl bg-cyber-900 border border-cyan-500/30 flex items-center justify-between text-xs font-code">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Direct Probe [{pingResult.timestamp}]:</span>
            <span
              className={`font-bold ${
                pingResult.isSuccess ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              HTTP {pingResult.status || "FAIL"} ({pingResult.latency}ms)
            </span>
            {pingResult.error && <span className="text-rose-300">- {pingResult.error}</span>}
          </div>
          <span className="text-slate-500 text-[11px]">Direct browser check</span>
        </div>
      )}
    </div>
  );
}
