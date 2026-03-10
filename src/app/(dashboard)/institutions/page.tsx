"use client"
import { useState } from "react"
import { Search, Building2, Lock } from "lucide-react"
import Link from "next/link"

const INSTITUTIONS = [
  {
    name: "Berkshire Hathaway",
    aum: "$900B",
    holdings: 47,
    topTickers: ["AAPL", "BAC", "CVX"],
    lastFiling: "Nov 15, 2024",
    gradient: "from-orange-500 to-amber-600",
    initials: "BH"
  },
  {
    name: "Bridgewater Associates",
    aum: "$150B",
    holdings: 312,
    topTickers: ["GLD", "SPY", "EEM"],
    lastFiling: "Nov 14, 2024",
    gradient: "from-blue-500 to-indigo-600",
    initials: "BA"
  },
  {
    name: "Renaissance Technologies",
    aum: "$60B",
    holdings: 3800,
    topTickers: ["NVDA", "MSFT", "AAPL"],
    lastFiling: "Nov 14, 2024",
    gradient: "from-emerald-500 to-teal-600",
    initials: "RT"
  },
  {
    name: "Citadel",
    aum: "$63B",
    holdings: 5200,
    topTickers: ["SPY", "QQQ", "IWM"],
    lastFiling: "Nov 14, 2024",
    gradient: "from-violet-500 to-purple-600",
    initials: "CI"
  },
  {
    name: "Two Sigma",
    aum: "$60B",
    holdings: 4100,
    topTickers: ["AAPL", "GOOGL", "MSFT"],
    lastFiling: "Nov 13, 2024",
    gradient: "from-cyan-500 to-blue-600",
    initials: "TS"
  },
  {
    name: "D.E. Shaw",
    aum: "$55B",
    holdings: 3600,
    topTickers: ["AMZN", "META", "NVDA"],
    lastFiling: "Nov 13, 2024",
    gradient: "from-pink-500 to-rose-600",
    initials: "DE"
  },
  {
    name: "Vanguard Group",
    aum: "$8.1T",
    holdings: 12800,
    topTickers: ["AAPL", "MSFT", "NVDA"],
    lastFiling: "Nov 12, 2024",
    gradient: "from-red-500 to-rose-600",
    initials: "VG"
  },
  {
    name: "BlackRock",
    aum: "$10T",
    holdings: 14200,
    topTickers: ["AAPL", "MSFT", "AMZN"],
    lastFiling: "Nov 12, 2024",
    gradient: "from-slate-500 to-slate-700",
    initials: "BR"
  },
  {
    name: "Fidelity Investments",
    aum: "$4.9T",
    holdings: 9800,
    topTickers: ["NVDA", "AAPL", "META"],
    lastFiling: "Nov 11, 2024",
    gradient: "from-green-500 to-emerald-600",
    initials: "FI"
  },
  {
    name: "JPMorgan Asset Mgmt",
    aum: "$2.9T",
    holdings: 7200,
    topTickers: ["MSFT", "GOOGL", "AAPL"],
    lastFiling: "Nov 11, 2024",
    gradient: "from-blue-400 to-blue-600",
    initials: "JP"
  },
  {
    name: "Goldman Sachs AM",
    aum: "$2.4T",
    holdings: 6100,
    topTickers: ["SPY", "NVDA", "AMZN"],
    lastFiling: "Nov 10, 2024",
    gradient: "from-yellow-500 to-amber-600",
    initials: "GS"
  },
  {
    name: "Tiger Global",
    aum: "$50B",
    holdings: 280,
    topTickers: ["NVDA", "META", "NFLX"],
    lastFiling: "Nov 10, 2024",
    gradient: "from-orange-400 to-red-500",
    initials: "TG"
  },
]

export default function InstitutionsPage() {
  const [search, setSearch] = useState("")

  const filtered = search
    ? INSTITUTIONS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : INSTITUTIONS

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Institutional 13F Filings</h1>
        <p className="text-slate-500 text-sm mt-1">Track quarterly holdings from hedge funds and major institutions</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Institutions Tracked", value: "580+" },
          { label: "Total AUM Monitored", value: "$28.4T" },
          { label: "Holdings Tracked", value: "2.1M+" },
          { label: "Last Updated", value: "2h ago" },
        ].map((s) => (
          <div key={s.label} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search institutions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-lg bg-[#12121a] border border-[#2e2e45] text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((inst) => (
          <div key={inst.name} className="group bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 hover:border-indigo-500/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${inst.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                {inst.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{inst.name}</p>
                <p className="text-xs text-slate-500">AUM: {inst.aum}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Holdings</span>
                <span className="text-slate-300 font-medium">{inst.holdings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Last Filing</span>
                <span className="text-slate-300">{inst.lastFiling}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {inst.topTickers.map((ticker) => (
                <span key={ticker} className="px-2 py-0.5 rounded-full bg-[#1e1e2e] border border-[#2e2e45] text-xs font-mono font-semibold text-slate-300">
                  {ticker}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Upgrade gate card */}
        <div className="bg-[#12121a] border border-dashed border-[#2e2e45] rounded-xl p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
          <Lock className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-white mb-1">580+ More Institutions</p>
          <p className="text-xs text-slate-500 mb-4">Upgrade to PRO to unlock all institutional data including hedge funds and smaller managers.</p>
          <Link href="/pricing" className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity">
            Upgrade to PRO
          </Link>
        </div>
      </div>

      {/* Bottom count */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#12121a] border border-[#1e1e2e] text-sm text-slate-400">
          <Building2 className="w-4 h-4 text-indigo-400" />
          Showing 12 of 580+ institutions. <Link href="/pricing" className="text-indigo-400 hover:text-indigo-300 font-medium">Upgrade for full access.</Link>
        </div>
      </div>
    </div>
  )
}
