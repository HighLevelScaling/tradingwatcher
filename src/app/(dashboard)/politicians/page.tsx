"use client"
import { useState } from "react"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { DelayedDataBanner } from "@/components/trades/DelayedDataBanner"

const ALL_TRADES = [
  { id: 1, name: "Nancy Pelosi", party: "DEMOCRAT", chamber: "HOUSE", state: "CA", ticker: "NVDA", action: "BUY", amount: "$250,001–$500,000", date: "Jan 15, 2025", returnPct: 12.4 },
  { id: 2, name: "Tommy Tuberville", party: "REPUBLICAN", chamber: "SENATE", state: "AL", ticker: "GOOGL", action: "BUY", amount: "$15,001–$50,000", date: "Jan 10, 2025", returnPct: 3.2 },
  { id: 3, name: "Dan Crenshaw", party: "REPUBLICAN", chamber: "HOUSE", state: "TX", ticker: "TSLA", action: "SELL", amount: "$50,001–$100,000", date: "Jan 8, 2025", returnPct: -5.1 },
  { id: 4, name: "Ro Khanna", party: "DEMOCRAT", chamber: "HOUSE", state: "CA", ticker: "AAPL", action: "BUY", amount: "$100,001–$250,000", date: "Jan 5, 2025", returnPct: 8.7 },
  { id: 5, name: "Marjorie Taylor Greene", party: "REPUBLICAN", chamber: "HOUSE", state: "GA", ticker: "META", action: "BUY", amount: "$15,001–$50,000", date: "Jan 3, 2025", returnPct: 15.2 },
  { id: 6, name: "Josh Gottheimer", party: "DEMOCRAT", chamber: "HOUSE", state: "NJ", ticker: "AMZN", action: "BUY", amount: "$100,001–$250,000", date: "Jan 2, 2025", returnPct: 7.3 },
  { id: 7, name: "Michael McCaul", party: "REPUBLICAN", chamber: "HOUSE", state: "TX", ticker: "MSFT", action: "SELL", amount: "$50,001–$100,000", date: "Dec 28, 2024", returnPct: -2.1 },
  { id: 8, name: "Alan Lowenthal", party: "DEMOCRAT", chamber: "HOUSE", state: "CA", ticker: "NFLX", action: "BUY", amount: "$15,001–$50,000", date: "Dec 25, 2024", returnPct: 9.8 },
  { id: 9, name: "Austin Scott", party: "REPUBLICAN", chamber: "HOUSE", state: "GA", ticker: "AMD", action: "BUY", amount: "$1,001–$15,000", date: "Dec 18, 2024", returnPct: 9.2 },
  { id: 10, name: "Greg Gianforte", party: "REPUBLICAN", chamber: "HOUSE", state: "MT", ticker: "JPM", action: "BUY", amount: "$50,001–$100,000", date: "Dec 15, 2024", returnPct: 6.1 },
  { id: 11, name: "Shelley Moore Capito", party: "REPUBLICAN", chamber: "SENATE", state: "WV", ticker: "JPM", action: "BUY", amount: "$15,001–$50,000", date: "Dec 20, 2024", returnPct: 4.8 },
  { id: 12, name: "Kevin Brady", party: "REPUBLICAN", chamber: "HOUSE", state: "TX", ticker: "DIS", action: "SELL", amount: "$15,001–$50,000", date: "Dec 15, 2024", returnPct: -1.4 },
  { id: 13, name: "Steve Scalise", party: "REPUBLICAN", chamber: "HOUSE", state: "LA", ticker: "BAC", action: "BUY", amount: "$15,001–$50,000", date: "Dec 12, 2024", returnPct: 5.3 },
  { id: 14, name: "Jeff Van Drew", party: "REPUBLICAN", chamber: "HOUSE", state: "NJ", ticker: "CRM", action: "BUY", amount: "$1,001–$15,000", date: "Dec 10, 2024", returnPct: 11.2 },
  { id: 15, name: "Thomas Massie", party: "REPUBLICAN", chamber: "HOUSE", state: "KY", ticker: "INTC", action: "SELL", amount: "$15,001–$50,000", date: "Dec 8, 2024", returnPct: -8.4 },
  { id: 16, name: "Debbie Lesko", party: "REPUBLICAN", chamber: "HOUSE", state: "AZ", ticker: "SNAP", action: "SELL", amount: "$1,001–$15,000", date: "Dec 5, 2024", returnPct: -12.1 },
  { id: 17, name: "Brian Mast", party: "REPUBLICAN", chamber: "HOUSE", state: "FL", ticker: "NVDA", action: "BUY", amount: "$50,001–$100,000", date: "Dec 3, 2024", returnPct: 18.7 },
  { id: 18, name: "David Rouzer", party: "REPUBLICAN", chamber: "HOUSE", state: "NC", ticker: "AAPL", action: "BUY", amount: "$15,001–$50,000", date: "Dec 1, 2024", returnPct: 7.9 },
  { id: 19, name: "French Hill", party: "REPUBLICAN", chamber: "HOUSE", state: "AR", ticker: "GOOGL", action: "BUY", amount: "$50,001–$100,000", date: "Nov 28, 2024", returnPct: 14.3 },
  { id: 20, name: "Susie Lee", party: "DEMOCRAT", chamber: "HOUSE", state: "NV", ticker: "TSLA", action: "BUY", amount: "$15,001–$50,000", date: "Nov 25, 2024", returnPct: 22.6 },
  { id: 21, name: "Nancy Pelosi", party: "DEMOCRAT", chamber: "HOUSE", state: "CA", ticker: "AAPL", action: "SELL", amount: "$500,001–$1,000,000", date: "Nov 20, 2024", returnPct: 3.1 },
  { id: 22, name: "Ro Khanna", party: "DEMOCRAT", chamber: "HOUSE", state: "CA", ticker: "AMD", action: "BUY", amount: "$50,001–$100,000", date: "Nov 18, 2024", returnPct: 16.2 },
  { id: 23, name: "Dan Crenshaw", party: "REPUBLICAN", chamber: "HOUSE", state: "TX", ticker: "XOM", action: "BUY", amount: "$15,001–$50,000", date: "Nov 15, 2024", returnPct: 4.4 },
  { id: 24, name: "Josh Gottheimer", party: "DEMOCRAT", chamber: "HOUSE", state: "NJ", ticker: "MSFT", action: "BUY", amount: "$50,001–$100,000", date: "Nov 12, 2024", returnPct: 9.7 },
  { id: 25, name: "Tommy Tuberville", party: "REPUBLICAN", chamber: "SENATE", state: "AL", ticker: "NVDA", action: "BUY", amount: "$50,001–$100,000", date: "Nov 10, 2024", returnPct: 31.2 },
  { id: 26, name: "Steve Scalise", party: "REPUBLICAN", chamber: "HOUSE", state: "LA", ticker: "META", action: "BUY", amount: "$15,001–$50,000", date: "Nov 8, 2024", returnPct: 19.4 },
  { id: 27, name: "Kevin Brady", party: "REPUBLICAN", chamber: "HOUSE", state: "TX", ticker: "AMZN", action: "BUY", amount: "$100,001–$250,000", date: "Nov 5, 2024", returnPct: 12.8 },
  { id: 28, name: "Shelley Moore Capito", party: "REPUBLICAN", chamber: "SENATE", state: "WV", ticker: "WFC", action: "SELL", amount: "$15,001–$50,000", date: "Nov 3, 2024", returnPct: -3.2 },
  { id: 29, name: "Marjorie Taylor Greene", party: "REPUBLICAN", chamber: "HOUSE", state: "GA", ticker: "TSLA", action: "BUY", amount: "$50,001–$100,000", date: "Nov 1, 2024", returnPct: 28.7 },
  { id: 30, name: "Debbie Lesko", party: "REPUBLICAN", chamber: "HOUSE", state: "AZ", ticker: "NFLX", action: "BUY", amount: "$15,001–$50,000", date: "Oct 28, 2024", returnPct: 6.3 },
]

export default function PoliticiansPage() {
  const [party, setParty] = useState("All")
  const [chamber, setChamber] = useState("All")
  const [tradeType, setTradeType] = useState("All")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  let filtered = ALL_TRADES
  if (party !== "All") filtered = filtered.filter(t => t.party === party.toUpperCase())
  if (chamber !== "All") filtered = filtered.filter(t => t.chamber === chamber.toUpperCase())
  if (tradeType !== "All") filtered = filtered.filter(t => t.action === tradeType)
  if (search) filtered = filtered.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.ticker.toLowerCase().includes(search.toLowerCase()))

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Congress Trades</h1>
        <p className="text-slate-500 text-sm mt-1">Track every stock trade filed by US senators and representatives</p>
      </div>

      <DelayedDataBanner />

      {/* Filters */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search politician or ticker..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#0a0a0f] border border-[#2e2e45] text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Party filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">Party:</span>
            {["All", "Democrat", "Republican"].map((p) => (
              <button key={p} onClick={() => { setParty(p); setPage(1) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${party === p ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-white hover:bg-[#2e2e45]"}`}>
                {p}
              </button>
            ))}
          </div>

          {/* Chamber filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">Chamber:</span>
            {["All", "Senate", "House"].map((c) => (
              <button key={c} onClick={() => { setChamber(c); setPage(1) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chamber === c ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-white hover:bg-[#2e2e45]"}`}>
                {c}
              </button>
            ))}
          </div>

          {/* Trade type filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">Type:</span>
            {["All", "BUY", "SELL"].map((t) => (
              <button key={t} onClick={() => { setTradeType(t); setPage(1) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tradeType === t ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-white hover:bg-[#2e2e45]"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Politician</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Party</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticker</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Trade Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2e]">
              {paginated.map((trade) => (
                <tr key={trade.id} className="hover:bg-[#1e1e2e]/50 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{trade.name}</p>
                      <p className="text-xs text-slate-500">{trade.state} · {trade.chamber}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      trade.party === "DEMOCRAT"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }`}>
                      {trade.party === "DEMOCRAT" ? "D" : "R"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono font-bold text-sm text-white">{trade.ticker}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      trade.action === "BUY"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }`}>
                      {trade.action === "BUY" ? "▲" : "▼"} {trade.action}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="text-sm text-slate-400">{trade.amount}</span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-sm text-slate-400">{trade.date}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`text-sm font-semibold ${trade.returnPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {trade.returnPct >= 0 ? "+" : ""}{trade.returnPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#1e1e2e]">
          <p className="text-sm text-slate-500">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#2e2e45] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-300 px-2">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#2e2e45] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
