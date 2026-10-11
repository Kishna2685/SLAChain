import React, { useState } from "react";
import { useWeb3, HARDHAT_ACCOUNTS } from "../context/Web3Context";
import { Shield, Activity, Wallet, ChevronDown, Plus, ExternalLink, RefreshCw, Cpu } from "lucide-react";

export default function Navbar({ onOpenCreateModal, oracleStatus }) {
  const {
    account,
    balance,
    chainId,
    isMetaMask,
    activeAccountIndex,
    selectLocalAccount,
    connectMetaMask,
    fetchSLAs,
    loading,
  } = useWeb3();

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const shortenAddress = (addr) => {
    if (!addr) return "Not Connected";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-500/20 glass-panel bg-cyber-900/90">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-neon-cyan">
            <Shield className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-200 to-purple-400">
                AEGIS // SLA
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                Web3 Protocol
              </span>
            </div>
            <p className="text-xs text-slate-400 font-code flex items-center space-x-1">
              <span>Autonomous Telemetry & Penalty Settlement</span>
            </p>
          </div>
        </div>

        {/* Center / Network & Oracle Quick Info */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyber-850/80 border border-slate-700/60 text-xs font-code">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Chain:</span>
            <span className="text-emerald-400 font-medium">
              {chainId === 31337 ? "Hardhat Node (31337)" : `Chain ID ${chainId || "Local"}`}
            </span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyber-850/80 border border-cyan-500/30 text-xs font-code">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Oracle:</span>
            <span className={oracleStatus?.running ? "text-cyan-400 font-bold" : "text-amber-400 font-medium"}>
              {oracleStatus?.running ? "ACTIVE (Polling)" : "Standby"}
            </span>
          </div>
        </div>

        {/* Right Actions & Wallet */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchSLAs()}
            disabled={loading}
            className="p-2 rounded-lg bg-cyber-800 hover:bg-cyber-700 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition"
            title="Refresh on-chain SLA data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm shadow-neon-cyan transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            <span>Create & Stake SLA</span>
          </button>

          {/* Account Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center space-x-2.5 px-3.5 py-2 rounded-lg bg-cyber-850 border border-cyan-500/30 hover:border-cyan-400/60 transition shadow-inner"
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500/30 to-cyan-500/30 border border-cyan-400/40 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-200 font-code">
                  {shortenAddress(account)}
                </div>
                <div className="text-[10px] text-cyan-400 font-semibold font-code">
                  {parseFloat(balance).toFixed(3)} ETH
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showAccountDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl glass-panel bg-cyber-900 border border-cyan-500/30 shadow-2xl p-2 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-700/60 mb-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Testnet Wallet Role
                  </div>
                  <div className="text-xs text-slate-300 font-code truncate mt-0.5">
                    {account}
                  </div>
                </div>

                <div className="space-y-1">
                  {HARDHAT_ACCOUNTS.map((acc, idx) => (
                    <button
                      key={acc.address}
                      onClick={() => {
                        selectLocalAccount(idx);
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                        activeAccountIndex === idx && !isMetaMask
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "hover:bg-cyber-800 text-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{acc.role}</div>
                        <div className="text-[10px] font-code text-slate-400">
                          {shortenAddress(acc.address)}
                        </div>
                      </div>
                      {activeAccountIndex === idx && !isMetaMask && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-neon-cyan"></span>
                      )}
                    </button>
                  ))}

                  <div className="pt-2 mt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        connectMetaMask();
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                        isMetaMask
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                          : "hover:bg-cyber-800 text-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-purple-300">MetaMask Browser Wallet</div>
                        <div className="text-[10px] text-slate-400">Connect via Injected Web3</div>
                      </div>
                      {isMetaMask && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
