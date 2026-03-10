"use client"
import { useState } from "react"
import Link from "next/link"
import { Clock, User, ArrowRight, Mail } from "lucide-react"

const CATEGORIES = ["All", "Analysis", "Education", "News", "Strategy", "Insider Activity"]

const POSTS = [
  {
    slug: "how-congress-beats-the-market",
    category: "ANALYSIS",
    title: "How Congress Members Consistently Beat the Market",
    excerpt: "Congressional trading data reveals a startling pattern: legislators outperform the S&P 500 by an average of 12% annually. This isn't coincidence — it's information asymmetry at work.",
    author: "TradingWatcher Team",
    date: "Jan 20, 2025",
    readMinutes: 8,
    featured: true,
    gradient: "from-indigo-500 to-violet-600",
  },
  {
    slug: "understanding-13f-filings",
    category: "EDUCATION",
    title: "Understanding 13F Filings: A Complete Guide",
    excerpt: "Every quarter, institutional investors managing over $100M must disclose their holdings to the SEC. Here's everything you need to know.",
    author: "Research Team",
    date: "Jan 15, 2025",
    readMinutes: 6,
    featured: false,
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    slug: "q1-2025-institutional-moves",
    category: "INSIDER ACTIVITY",
    title: "Q1 2025: The Biggest Institutional Moves You Missed",
    excerpt: "From Berkshire's massive Apple reduction to Tiger Global's aggressive AI pivot. The biggest 13F revelations of the quarter.",
    author: "TradingWatcher Team",
    date: "Jan 10, 2025",
    readMinutes: 10,
    featured: false,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    slug: "building-portfolio-mirroring-smart-money",
    category: "STRATEGY",
    title: "Building a Portfolio by Mirroring Smart Money",
    excerpt: "A step-by-step approach to using congressional and institutional trade data to construct a market-beating portfolio.",
    author: "TradingWatcher Team",
    date: "Jan 5, 2025",
    readMinutes: 7,
    featured: false,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    slug: "top-5-stocks-congress-bought",
    category: "ANALYSIS",
    title: "Top 5 Stocks Congress Bought This Quarter",
    excerpt: "NVDA leads the pack by a wide margin. Here are the 5 stocks most purchased by members of Congress in Q4 2024.",
    author: "Data Team",
    date: "Dec 30, 2024",
    readMinutes: 5,
    featured: false,
    gradient: "from-pink-500 to-rose-600",
  },
  {
    slug: "what-is-the-stock-act",
    category: "EDUCATION",
    title: "What is the STOCK Act and Why It Matters",
    excerpt: "The Stop Trading on Congressional Knowledge Act of 2012 — how it works, its limitations, and how to use it to your advantage.",
    author: "Research Team",
    date: "Dec 25, 2024",
    readMinutes: 4,
    featured: false,
    gradient: "from-amber-500 to-orange-600",
  },
]

const CATEGORY_MAP: Record<string, string> = {
  "ANALYSIS": "Analysis",
  "EDUCATION": "Education",
  "INSIDER ACTIVITY": "Insider Activity",
  "STRATEGY": "Strategy",
  "NEWS": "News",
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All")
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  const featured = POSTS[0]
  const rest = POSTS.slice(1)

  const filteredRest = activeCategory === "All"
    ? rest
    : rest.filter(p => CATEGORY_MAP[p.category] === activeCategory || p.category === activeCategory.toUpperCase())

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-[#1e1e2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm">TW</div>
            <span className="text-lg font-bold text-white">TradingWatcher</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-[#1e1e2e]">Sign In</Link>
            <Link href="/register" className="text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-2 hover:opacity-90 transition-opacity">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Market Intelligence Blog</h1>
          <p className="text-slate-400 text-lg">Analysis, education, and insights on smart money movements.</p>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-[#12121a] text-slate-400 border border-[#1e1e2e] hover:text-white hover:border-[#2e2e45]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured post */}
        {(activeCategory === "All" || activeCategory === "Analysis") && (
          <Link href={`/blog/${featured.slug}`} className="group block bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all mb-8">
            <div className="grid md:grid-cols-2">
              <div className={`h-64 md:h-auto bg-gradient-to-br ${featured.gradient} flex items-center justify-center`}>
                <div className="text-center text-white">
                  <div className="text-6xl font-black opacity-20">TW</div>
                  <p className="text-sm font-semibold mt-2 opacity-60">TradingWatcher Research</p>
                </div>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                    {featured.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    Featured
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
                  {featured.title}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{featured.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{featured.author}</span>
                  <span>{featured.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{featured.readMinutes} min read</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium group-hover:text-indigo-300 transition-colors">
                  Read Article <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Post grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredRest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all">
              <div className={`h-40 bg-gradient-to-br ${post.gradient} flex items-center justify-center`}>
                <div className="text-4xl font-black text-white/20">TW</div>
              </div>
              <div className="p-6">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{post.category}</span>
                <h3 className="text-base font-semibold text-white mt-2 mb-2 group-hover:text-indigo-300 transition-colors">{post.title}</h3>
                <p className="text-slate-400 text-sm line-clamp-2 mb-4">{post.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.readMinutes} min read</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-8 text-center">
          <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Get Smart Money Alerts in Your Inbox</h2>
          <p className="text-slate-400 mb-6">Weekly digest of the most important congressional trades, institutional moves, and market intelligence.</p>
          {subscribed ? (
            <p className="text-emerald-400 font-semibold">You&apos;re subscribed!</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-11 px-4 rounded-xl border border-[#2e2e45] bg-[#12121a] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <button
                onClick={() => { if (email) setSubscribed(true) }}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Subscribe Free
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
