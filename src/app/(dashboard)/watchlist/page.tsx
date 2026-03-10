"use client"
import { useState } from "react"
import { Search, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react"

const TABS = ["Stocks", "Politicians", "Institutions", "Traders"]

const WATCHLIST_STOCKS = [
  { ticker: "NVDA", name: "NVIDIA Corporation", price: "$875.40", change: "+3.2%", positive: true },
  { ticker: "AAPL", name: "Apple Inc.", price: "$218.24", change: "+1.1%", positive: true },
  { ticker: "TSLA", name: "Tesla Inc.", price: "$248.50", change: "-0.8%", positive: false },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: "$175.98", change: "+2.4%", positive: true },
  { ticker: "META", name: "Meta Platforms Inc.", price: "$594.26", change: "+4.1%", positive: true },
]

const WATCHLIST_POLITICIANS = [
  { name: "Nancy Pelosi", party: "DEMOCRAT", state: "CA", lastTrade: "NVDA BUY - Jan 15", trades: 12 },
  { name: "Tommy Tuberville", party: "REPUBLICAN", state: "AL", lastTrade: "GOOGL BUY - Jan 10", trades: 9 },
  { name: "Ro Khanna", party: "DEMOCRAT", state: "CA", lastTrade: "AAPL BUY - Jan 5", trades: 8 },
]

const WATCHLIST_INSTITUTIONS = [
  { name: "Berkshire Hathaway", aum: "$900B", lastFiling: "Nov 15, 2024", initials: "BH", gradient: "from-orange-500 to-amber-600" },
  { name: "Citadel", aum: "$63B", lastFiling: "Nov 14, 2024", initials: "CI", gradient: "from-violet-500 to-purple-600" },
]

export default function WatchlistPage() {
  const [activeTab, setActiveTab] = useState("Stocks")
  const [stocks, setStocks] = useState(WATCHLIST_STOCKS)
  const [politicians, setPoliticians] = useState(WATCHLIST_POLITICIANS)
  const [institutions] = useState(WATCHLIST_INSTITUTIONS)
  const [searchValue, setSearchValue] = useState("")

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Watchlist</h1>
        <p className="text-slate-500 text-sm mt-1">Track your favorite stocks, politicians, and institutions</p>
      </div>

      {/* Search + Add */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab.toLowerCase()} to add...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-[#12121a] border border-[#2e2e45] text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors">
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1e1e2e] pb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-[#1e1e2e]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stocks Tab */}
      {activeTab === "Stocks" && (
        <div className="space-y-3">
          {stocks.map((stock) => (
            <div key={stock.ticker} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 flex items-center gap-4 hover:border-[#2e2e45] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <span className="font-mono font-bold text-xs text-indigo-300">{stock.ticker.slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-bold text-sm text-white">{stock.ticker}</p>
                <p className="text-xs text-slate-500 truncate">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{stock.price}</p>
                <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${stock.positive ? "text-green-400" : "text-red-400"}`}>
                  {stock.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stock.change}
                </div>
              </div>
              <button
                onClick={() => setStocks(s => s.filter(st => st.ticker !== stock.ticker))}
                className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {stocks.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">No stocks in watchlist. Search above to add stocks.</p>
            </div>
          )}
        </div>
      )}

      {/* Politicians Tab */}
      {activeTab === "Politicians" && (
        <div className="space-y-3">
          {politicians.map((pol) => (
            <div key={pol.name} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 flex items-center gap-4 hover:border-[#2e2e45] transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${pol.party === "DEMOCRAT" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}>
                {pol.party === "DEMOCRAT" ? "D" : "R"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{pol.name}</p>
                <p className="text-xs text-slate-500">{pol.state} · {pol.trades} trades tracked</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Latest:</p>
                <p className="text-xs text-slate-300">{pol.lastTrade}</p>
              </div>
              <button
                onClick={() => setPoliticians(p => p.filter(po => po.name !== pol.name))}
                className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Institutions Tab */}
      {activeTab === "Institutions" && (
        <div className="space-y-3">
          {institutions.map((inst) => (
            <div key={inst.name} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 flex items-center gap-4 hover:border-[#2e2e45] transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${inst.gradient} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                {inst.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{inst.name}</p>
                <p className="text-xs text-slate-500">AUM: {inst.aum}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Last filing:</p>
                <p className="text-xs text-slate-300">{inst.lastFiling}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Traders Tab */}
      {activeTab === "Traders" && (
        <div className="text-center py-16">
          <TrendingUp className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">No traders in watchlist</p>
          <p className="text-slate-500 text-sm mb-6">Follow notable traders to track their disclosed positions.</p>
          <a href="/traders" className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Browse Traders
          </a>
        </div>
      )}
    </div>
  )
}
