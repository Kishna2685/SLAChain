import React from "react";
import { Cpu, Activity, Zap, CheckCircle, AlertTriangle } from "lucide-react";

export default function OracleStatusWidget({ oracleStatus }) {
  const isOnline = Boolean(oracleStatus?.running);

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h4 className="font-bold text-sm text-slate-100">
            Autonomous Oracle Bot Telemetry
          </h4>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isOnline ? "bg-emerald-400 shadow-neon-emerald animate-pulse" : "bg-slate-500"
            }`}
          ></span>
          <span className="text-xs font-code font-semibold text-slate-300">
            {isOnline ? "OPERATIONAL" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-code">
        <div className="p-2.5 rounded-xl bg-cyber-900 border border-slate-800/80">
          <div className="text-slate-500">Monitored SLAs</div>
          <div className="text-sm font-bold text-cyan-400 mt-1">
            {oracleStatus?.monitoredSLACount ?? 0} Active
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-cyber-900 border border-slate-800/80">
          <div className="text-slate-500">Pings Executed</div>
          <div className="text-sm font-bold text-emerald-400 mt-1">
            {oracleStatus?.pingsTotal ?? 0}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-cyber-900 border border-slate-800/80">
          <div className="text-slate-500">Breaches Caught</div>
          <div className="text-sm font-bold text-rose-400 mt-1">
            {oracleStatus?.breachesDetected ?? 0}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-cyber-900 border border-slate-800/80">
          <div className="text-slate-500">On-Chain Tx Sent</div>
          <div className="text-sm font-bold text-purple-400 mt-1">
            {oracleStatus?.transactionsSent ?? 0}
          </div>
        </div>
      </div>

      {oracleStatus?.oracleWalletAddress && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-code text-slate-400">
          <span>Oracle Bot Wallet:</span>
          <span className="text-slate-300">{oracleStatus.oracleWalletAddress}</span>
        </div>
      )}
    </div>
  );
}
