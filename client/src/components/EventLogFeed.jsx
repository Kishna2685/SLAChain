import React, { useState } from "react";
import { ListFilter, Radio, ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function EventLogFeed({ events = [] }) {
  const [filter, setFilter] = useState("ALL");

  const filteredEvents = events.filter((e) => {
    if (filter === "ALL") return true;
    return e.type === filter;
  });

  const getEventIcon = (type) => {
    switch (type) {
      case "BREACH":
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case "FAULT":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "RESOLVED":
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case "BREACH":
        return "bg-rose-950/60 text-rose-300 border-rose-500/40";
      case "FAULT":
        return "bg-amber-950/60 text-amber-300 border-amber-500/40";
      case "RESOLVED":
        return "bg-cyan-950/60 text-cyan-300 border-cyan-500/40";
      default:
        return "bg-emerald-950/60 text-emerald-300 border-emerald-500/40";
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h4 className="font-bold text-sm text-slate-100">
            Live On-Chain Event & Telemetry Stream
          </h4>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 text-[11px] font-code">
          {["ALL", "FAULT", "BREACH", "CREATED"].map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(tag)}
              className={`px-2 py-0.5 rounded-md transition ${
                filter === tag
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-code">
            Awaiting on-chain contract events & oracle pings...
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-3 rounded-xl bg-cyber-900/90 border border-slate-800/80 hover:border-slate-700 transition text-xs font-code flex items-start justify-between gap-2"
            >
              <div className="flex items-start space-x-2.5">
                <div className="mt-0.5">{getEventIcon(evt.type)}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{evt.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold border ${getBadgeStyle(
                        evt.type
                      )}`}
                    >
                      {evt.type}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{evt.details}</div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 whitespace-nowrap">
                {evt.timestamp}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
