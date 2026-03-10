"use client"
import { useState } from "react"
import { TrendingUp, TrendingDown, Building2, Bell, Flame, ArrowUp } from "lucide-react"

const ACTIVITY_FEED = [
  { id: 1, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Nancy Pelosi", ticker: "NVDA", action: "BUY", amount: "$250K–$500K", time: "2h ago" },
  { id: 2, source: "Institution", sourceColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", entity: "Berkshire Hathaway", ticker: "AAPL", action: "SELL", amount: "$800M", time: "3h ago" },
  { id: 3, source: "Trader", sourceColor: "bg-violet-500/20 text-violet-400 border-violet-500/30", entity: "Michael Burry", ticker: "GOOGL", action: "BUY", amount: "$12M", time: "5h ago" },
  { id: 4, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Tommy Tuberville", ticker: "TSLA", action: "SELL", amount: "$15K–$50K", time: "6h ago" },
  { id: 5, source: "Institution", sourceColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", entity: "Citadel", ticker: "SPY", action: "BUY", amount: "$2.1B", time: "7h ago" },
  { id: 6, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Ro Khanna", ticker: "AAPL", action: "BUY", amount: "$100K–$250K", time: "8h ago" },
  { id: 7, source: "Trader", sourceColor: "bg-violet-500/20 text-violet-400 border-violet-500/30", entity: "Bill Ackman", ticker: "HHH", action: "BUY", amount: "$50M", time: "10h ago" },
  { id: 8, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Dan Crenshaw", ticker: "XOM", action: "BUY", amount: "$15K–$50K", time: "12h ago" },
  { id: 9, source: "Institution", sourceColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", entity: "Tiger Global", ticker: "NVDA", action: "BUY", amount: "$120M", time: "14h ago" },
  { id: 10, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Marjorie Taylor Greene", ticker: "META", action: "BUY", amount: "$15K–$50K", time: "16h ago" },
  { id: 11, source: "Trader", sourceColor: "bg-violet-500/20 text-violet-400 border-violet-500/30", entity: "Warren Buffett", ticker: "CVX", action: "SELL", amount: "$300M", time: "18h ago" },
  { id: 12, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Josh Gottheimer", ticker: "AMZN", action: "BUY", amount: "$100K–$250K", time: "20h ago" },
  { id: 13, source: "Institution", sourceColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", entity: "Bridgewater", ticker: "GLD", action: "BUY", amount: "$450M", time: "22h ago" },
  { id: 14, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Michael McCaul", ticker: "MSFT", action: "SELL", amount: "$50K–$100K", time: "1d ago" },
  { id: 15, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Austin Scott", ticker: "AMD", action: "BUY", amount: "$1K–$15K", time: "1d ago" },
  { id: 16, source: "Trader", sourceColor: "bg-violet-500/20 text-violet-400 border-violet-500/30", entity: "David Tepper", ticker: "BABA", action: "SELL", amount: "$25M", time: "1d ago" },
  { id: 17, source: "Institution", sourceColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", entity: "Two Sigma", ticker: "MSFT", action: "BUY", amount: "$89M", time: "1d ago" },
  { id: 18, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Kevin Brady", ticker: "DIS", action: "SELL", amount: "$15K–$50K", time: "2d ago" },
  { id: 19, source: "Congress", sourceColor: "bg-blue-500/20 text-blue-400 border-blue-500/30", entity: "Shelley Moore Capito", ticker: "JPM", action: "BUY", amount: "$15K–$50K", time: "2d ago" },
  { id: 20, source: "Trader", sourceColor: "bg-violet-500/20 text-violet-400 border-violet-500/30", entity: "Stan Druckenmiller", ticker: "NFLX", action: "BUY", amount: "$18M", time: "2d ago" },
]

const TRENDING_STOCKS = [
  { ticker: "NVDA", name: "NVIDIA", trades: 47, change: "+3.2%" },
  { ticker: "AAPL", name: "Apple", trades: 38, change: "+1.1%" },
  { ticker: "TSLA", name: "Tesla", trades: 31, change: "-0.8%" },
  { ticker: "GOOGL", name: "Alphabet", trades: 24, change: "+2.4%" },
  { ticker: "META", name: "Meta", trades: 19, change: "+4.1%" },
]

const ACTIVE_POLITICIANS = [
  { name: "Nancy Pelosi", party: "D", trades: 12, returnPct: 24.3 },
  { name: "Tommy Tuberville", party: "R", trades: 9, returnPct: 8.1 },
  { name: "Ro Khanna", party: "D", trades: 8, returnPct: 15.7 },
  { name: "Dan Crenshaw", party: "R", trades: 7, returnPct: 6.2 },
  { name: "Josh Gottheimer", party: "D", trades: 6, returnPct: 11.4 },
]

const FILTER_TABS = ["All", "Congress", "Institutions", "Traders"]

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState("All")

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  const filtered = activeFilter === "All" ? ACTIVITY_FEED : ACTIVITY_FEED.filter(t => t.source === activeFilter.replace("Institutions", "Institution").replace("Traders", "Trader"))

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">{today}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            title: "Today&apos;s Trades",
            value: "24",
            sub: "+8 from yesterday",
            icon: TrendingUp,
            positive: true,
            iconColor: "text-indigo-400",
            iconBg: "bg-indigo-500/20"
          },
          {
            title: "New 13F Filings",
            value: "7",
            sub: "this quarter",
            icon: Building2,
            positive: null,
            iconColor: "text-emerald-400",
            iconBg: "bg-emerald-500/20"
          },
          {
            title: "Alerts Fired",
            value: "3",
            sub: "in the last 24h",
            icon: Bell,
            positive: null,
            iconColor: "text-amber-400",
            iconBg: "bg-amber-500/20"
          },
          {
            title: "Hot Ticker",
            value: "NVDA",
            sub: "Most traded today",
            icon: Flame,
            positive: null,
            iconColor: "text-red-400",
            iconBg: "bg-red-500/20"
          },
        ].map((kpi) => (
          <div key={kpi.title} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 font-medium">{kpi.title.replace("&apos;", "'")}</p>
              <div className={`w-8 h-8 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
            <div className="flex items-center gap-1">
              {kpi.positive && <ArrowUp className="w-3 h-3 text-green-400" />}
              <p className="text-xs text-slate-500">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#1e1e2e] pb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === tab
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-[#1e1e2e]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e1e2e]">
              <h2 className="text-base font-semibold text-white">Live Activity Feed</h2>
            </div>
            <div className="divide-y divide-[#1e1e2e]">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#1e1e2e]/50 transition-colors cursor-pointer">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${item.sourceColor}`}>
                    {item.source}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-300 font-medium truncate block">{item.entity}</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-white shrink-0">{item.ticker}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                    item.action === "BUY"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}>
                    {item.action === "BUY" ? "▲" : "▼"} {item.action}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0 hidden sm:block">{item.amount}</span>
                  <span className="text-xs text-slate-600 shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Trending Stocks */}
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e1e2e] flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h2 className="text-base font-semibold text-white">Trending Stocks</h2>
            </div>
            <div className="divide-y divide-[#1e1e2e]">
              {TRENDING_STOCKS.map((stock, i) => (
                <div key={stock.ticker} className="flex items-center gap-3 px-5 py-3 hover:bg-[#1e1e2e]/50 transition-colors cursor-pointer">
                  <span className="text-xs text-slate-600 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-bold text-sm text-white">{stock.ticker}</span>
                    <span className="text-xs text-slate-500 ml-2">{stock.trades} trades</span>
                  </div>
                  <span className={`text-xs font-semibold ${stock.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                    {stock.change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Active Politicians */}
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e1e2e] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Most Active Politicians</h2>
            </div>
            <div className="divide-y divide-[#1e1e2e]">
              {ACTIVE_POLITICIANS.map((pol) => (
                <div key={pol.name} className="flex items-center gap-3 px-5 py-3 hover:bg-[#1e1e2e]/50 transition-colors cursor-pointer">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    pol.party === "D" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {pol.party}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-300 block truncate">{pol.name}</span>
                    <span className="text-xs text-slate-600">{pol.trades} trades</span>
                  </div>
                  <span className="text-xs font-semibold text-green-400">+{pol.returnPct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Watchlist CTA */}
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-semibold text-white">Your Watchlist</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Track specific stocks, politicians, and funds.</p>
            <a href="/watchlist" className="block w-full text-center px-3 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm font-semibold border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors">
              + Add to Watchlist
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
