import React from "react";
import { ShieldCheck, AlertOctagon, Lock, Banknote, Activity } from "lucide-react";

export default function MetricsOverview({ slas = [], oracleStatus }) {
  const totalSLAs = slas.length;
  const activeSLAs = slas.filter((s) => s.status === 0).length;
  const breachedSLAs = slas.filter((s) => s.status === 1).length;
  const completedSLAs = slas.filter((s) => s.status === 3).length;

  const totalCollateralLocked = slas
    .filter((s) => s.status === 0)
    .reduce((acc, curr) => acc + parseFloat(curr.stakedCollateralEth || 0), 0);

  const totalPenaltiesPaid = slas
    .filter((s) => s.status === 1)
    .reduce((acc, curr) => acc + parseFloat(curr.penaltyAmountEth || 0), 0);

  const stats = [
    {
      label: "Active SLA Contracts",
      value: activeSLAs,
      subtext: `${totalSLAs} Total Registered`,
      icon: ShieldCheck,
      color: "text-cyan-400",
      border: "border-cyan-500/20",
      bgGradient: "from-cyan-950/40 to-cyan-900/10",
      iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    },
    {
      label: "Collateral Staked",
      value: `${totalCollateralLocked.toFixed(2)} ETH`,
      subtext: "Escrowed on Smart Contract",
      icon: Lock,
      color: "text-purple-400",
      border: "border-purple-500/20",
      bgGradient: "from-purple-950/40 to-purple-900/10",
      iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    },
    {
      label: "Executed Breach Penalties",
      value: `${totalPenaltiesPaid.toFixed(2)} ETH`,
      subtext: `${breachedSLAs} Breach Payouts Triggered`,
      icon: AlertOctagon,
      color: "text-rose-400",
      border: "border-rose-500/20",
      bgGradient: "from-rose-950/40 to-rose-900/10",
      iconBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    },
    {
      label: "Oracle Ping Engine",
      value: oracleStatus?.pingsTotal ? `${oracleStatus.pingsTotal} Pings` : "Online",
      subtext: oracleStatus?.pollIntervalMs ? `Interval: ${oracleStatus.pollIntervalMs / 1000}s` : "Interval: 6s",
      icon: Activity,
      color: "text-emerald-400",
      border: "border-emerald-500/20",
      bgGradient: "from-emerald-950/40 to-emerald-900/10",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={i}
            className={`relative p-5 rounded-2xl glass-panel bg-gradient-to-br ${stat.bgGradient} border ${stat.border} transition-all duration-300 hover:translate-y-[-2px]`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>
                <p className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${stat.color} font-code`}>
                  {stat.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{stat.subtext}</p>
              </div>
              <div className={`p-3 rounded-xl border ${stat.iconBg}`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
