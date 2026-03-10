import { ArrowUpRight, ArrowDownRight } from "lucide-react"

const TRADERS = [
  {
    name: "Warren Buffett",
    initials: "WB",
    gradient: "from-orange-500 to-amber-600",
    fund: "Berkshire Hathaway",
    knownFor: "Value investing legend; focuses on undervalued companies with strong moats and long-term growth potential.",
    latestMove: { ticker: "AAPL", action: "SELL", amount: "$800M", date: "Nov 15, 2024" },
    latestMoveColor: "text-red-400",
    latestMoveIcon: ArrowDownRight,
  },
  {
    name: "Michael Burry",
    initials: "MB",
    gradient: "from-red-500 to-rose-600",
    fund: "Scion Asset Management",
    knownFor: "Predicted the 2008 housing crisis. Known for contrarian bets and concentrated short positions.",
    latestMove: { ticker: "GOOGL", action: "BUY", amount: "$12M", date: "Nov 14, 2024" },
    latestMoveColor: "text-green-400",
    latestMoveIcon: ArrowUpRight,
  },
  {
    name: "Bill Ackman",
    initials: "BA",
    gradient: "from-blue-500 to-indigo-600",
    fund: "Pershing Square Capital",
    knownFor: "Activist investor known for high-conviction concentrated positions and high-profile public campaigns.",
    latestMove: { ticker: "HHH", action: "BUY", amount: "$50M", date: "Nov 13, 2024" },
    latestMoveColor: "text-green-400",
    latestMoveIcon: ArrowUpRight,
  },
  {
    name: "Ray Dalio",
    initials: "RD",
    gradient: "from-emerald-500 to-teal-600",
    fund: "Bridgewater Associates",
    knownFor: "Creator of the All-Weather portfolio. Focuses on macro trends and risk parity strategies.",
    latestMove: { ticker: "GLD", action: "BUY", amount: "$450M", date: "Nov 12, 2024" },
    latestMoveColor: "text-green-400",
    latestMoveIcon: ArrowUpRight,
  },
  {
    name: "David Tepper",
    initials: "DT",
    gradient: "from-violet-500 to-purple-600",
    fund: "Appaloosa Management",
    knownFor: "Distressed debt and equity specialist known for bold macro calls and massive risk-on positions.",
    latestMove: { ticker: "BABA", action: "SELL", amount: "$25M", date: "Nov 11, 2024" },
    latestMoveColor: "text-red-400",
    latestMoveIcon: ArrowDownRight,
  },
  {
    name: "Carl Icahn",
    initials: "CI",
    gradient: "from-yellow-500 to-orange-600",
    fund: "Icahn Enterprises",
    knownFor: "Corporate raider turned activist investor. Known for taking large stakes and pushing for management changes.",
    latestMove: { ticker: "CVX", action: "BUY", amount: "$180M", date: "Nov 10, 2024" },
    latestMoveColor: "text-green-400",
    latestMoveIcon: ArrowUpRight,
  },
  {
    name: "George Soros",
    initials: "GS",
    gradient: "from-cyan-500 to-blue-600",
    fund: "Soros Fund Management",
    knownFor: "Broke the Bank of England in 1992. Macro investor known for bold currency and geopolitical bets.",
    latestMove: { ticker: "SPY", action: "BUY", amount: "$340M", date: "Nov 9, 2024" },
    latestMoveColor: "text-green-400",
    latestMoveIcon: ArrowUpRight,
  },
  {
    name: "Stan Druckenmiller",
    initials: "SD",
    gradient: "from-pink-500 to-rose-600",
    fund: "Duquesne Family Office",
    knownFor: "Managed Soros&apos; Quantum Fund. Known for macro investing and impressive decades-long track record.",
    latestMove: { ticker: "NFLX", action: "BUY", amount: "$18M", date: "Nov 8, 2024" },
    latestMoveColor: "text-green-400",
    latestMoveIcon: ArrowUpRight,
  },
]

export default function TradersPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Notable Traders</h1>
        <p className="text-slate-500 text-sm mt-1">Follow disclosed positions from the world&apos;s most successful investors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {TRADERS.map((trader) => (
          <div key={trader.name} className="group bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 hover:border-indigo-500/30 transition-all cursor-pointer">
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${trader.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                {trader.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{trader.name}</p>
                <p className="text-xs text-slate-500 truncate">{trader.fund}</p>
              </div>
            </div>

            {/* Known for */}
            <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-3">{trader.knownFor}</p>

            {/* Latest disclosed move */}
            <div className="bg-[#0a0a0f] rounded-lg p-3 border border-[#2e2e45]">
              <p className="text-xs text-slate-600 mb-2 font-medium uppercase tracking-wide">Latest Disclosed Move</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-white">{trader.latestMove.ticker}</span>
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${trader.latestMoveColor}`}>
                    <trader.latestMoveIcon className="w-3 h-3" />
                    {trader.latestMove.action}
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-medium">{trader.latestMove.amount}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{trader.latestMove.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
