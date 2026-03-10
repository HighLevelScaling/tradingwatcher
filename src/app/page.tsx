"use client"
import { useState } from "react"
import Link from "next/link"
import {
  TrendingUp, Bell, Landmark, Building2, Users, ChevronDown, ChevronUp,
  Zap, BarChart2, Eye, ArrowRight, Check, Menu, X, Star
} from "lucide-react"
import { AnimatedNumber } from "@/components/shared/AnimatedNumber"

const TICKER_TRADES = [
  { name: "Nancy Pelosi", ticker: "NVDA", type: "BUY", amount: "$500K", color: "text-green-400" },
  { name: "Tommy Tuberville", ticker: "GOOGL", type: "SELL", amount: "$50K", color: "text-red-400" },
  { name: "Dan Crenshaw", ticker: "TSLA", type: "SELL", amount: "$100K", color: "text-red-400" },
  { name: "Ro Khanna", ticker: "AAPL", type: "BUY", amount: "$250K", color: "text-green-400" },
  { name: "Berkshire Hathaway", ticker: "AAPL", type: "SELL", amount: "$800M", color: "text-red-400" },
  { name: "Marjorie Taylor Greene", ticker: "META", type: "BUY", amount: "$50K", color: "text-green-400" },
  { name: "Josh Gottheimer", ticker: "AMZN", type: "BUY", amount: "$250K", color: "text-green-400" },
  { name: "Tiger Global", ticker: "NVDA", type: "BUY", amount: "$120M", color: "text-green-400" },
  { name: "Michael McCaul", ticker: "MSFT", type: "SELL", amount: "$75K", color: "text-red-400" },
  { name: "Austin Scott", ticker: "AMD", type: "BUY", amount: "$15K", color: "text-green-400" },
  { name: "Citadel", ticker: "SPY", type: "BUY", amount: "$2.1B", color: "text-green-400" },
  { name: "Steve Scalise", ticker: "JPM", type: "BUY", amount: "$30K", color: "text-green-400" },
]

const FEATURES = [
  {
    icon: Landmark,
    gradient: "from-blue-500 to-indigo-600",
    title: "Congress Trades",
    desc: "Track every stock transaction filed by senators and representatives. Get notified the moment disclosures hit the STOCK Act database."
  },
  {
    icon: Building2,
    gradient: "from-emerald-500 to-teal-600",
    title: "13F Institutional Filings",
    desc: "Monitor quarterly 13F filings from 580+ hedge funds and institutions. Know what Berkshire, Citadel, and Bridgewater are buying."
  },
  {
    icon: Users,
    gradient: "from-violet-500 to-purple-600",
    title: "Notable Traders",
    desc: "Follow Warren Buffett, Michael Burry, Bill Ackman, Ray Dalio, and more. Track their disclosed positions in real-time."
  },
  {
    icon: Bell,
    gradient: "from-orange-500 to-red-600",
    title: "Real-time Alerts",
    desc: "Set custom alerts for any ticker, politician, or fund. Get email notifications the moment a new filing matches your criteria."
  },
  {
    icon: BarChart2,
    gradient: "from-pink-500 to-rose-600",
    title: "Stock Activity",
    desc: "See which stocks are most traded by insiders right now. Price charts, trade history, and institutional ownership all in one place."
  },
  {
    icon: Eye,
    gradient: "from-cyan-500 to-blue-600",
    title: "Portfolio Mirror",
    desc: "Build a shadow portfolio that mirrors your favorite politicians or fund managers. Track your theoretical performance vs. reality."
  },
]

const BLOG_POSTS = [
  {
    slug: "how-congress-beats-the-market",
    category: "ANALYSIS",
    title: "How Congress Members Consistently Beat the Market",
    excerpt: "Congressional trading data reveals legislators outperform the S&P 500 by 12% annually on average.",
    readMinutes: 8,
    date: "Jan 20, 2025",
  },
  {
    slug: "understanding-13f-filings",
    category: "EDUCATION",
    title: "Understanding 13F Filings: A Complete Guide",
    excerpt: "Every quarter, institutional investors managing over $100M must disclose their holdings to the SEC.",
    readMinutes: 6,
    date: "Jan 15, 2025",
  },
  {
    slug: "q1-2025-institutional-moves",
    category: "INSIDER ACTIVITY",
    title: "Q1 2025: The Biggest Institutional Moves You Missed",
    excerpt: "From Berkshire&apos;s massive Apple reduction to Tiger Global&apos;s aggressive AI pivot.",
    readMinutes: 10,
    date: "Jan 10, 2025",
  },
]

const FAQS = [
  {
    q: "Where does your data come from?",
    a: "We aggregate data from multiple official sources including the SEC EDGAR database, the House and Senate financial disclosure portals, and Capitol Trades API. All data is sourced directly from official government filings."
  },
  {
    q: "How delayed is the free tier data?",
    a: "Free tier users see data delayed by 48 hours. PRO users get live data as soon as we process new filings, typically within minutes of a disclosure being published."
  },
  {
    q: "Is this legal to use for trading decisions?",
    a: "Absolutely. Congressional disclosure data is public information mandated by the STOCK Act of 2012. Using public disclosures to inform your investment decisions is completely legal and is the same information institutional investors use."
  },
  {
    q: "How often is 13F data updated?",
    a: "13F filings are required quarterly (within 45 days of quarter end). We process new filings within hours of them appearing on EDGAR and alert subscribers immediately."
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. You can cancel your PRO or Enterprise subscription at any time from your account settings. You&apos;ll retain access until the end of your current billing period."
  },
  {
    q: "Do you offer a free trial of PRO?",
    a: "We offer a 7-day free trial of the PRO tier. No credit card required to start. You&apos;ll have full access to live data, unlimited alerts, and all PRO features during the trial."
  },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-[#1e1e2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm">TW</div>
                <span className="text-lg font-bold text-white">TradingWatcher</span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</Link>
                <Link href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link>
                <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">Blog</Link>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-[#1e1e2e]">
                Sign In
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25">
                Get Started Free
              </Link>
            </div>
            <button
              className="md:hidden p-2 text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1e1e2e] bg-[#0a0a0f] px-4 py-4 space-y-3">
            <Link href="#features" className="block text-sm text-slate-400 hover:text-white py-2">Features</Link>
            <Link href="#pricing" className="block text-sm text-slate-400 hover:text-white py-2">Pricing</Link>
            <Link href="/blog" className="block text-sm text-slate-400 hover:text-white py-2">Blog</Link>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" className="block text-center px-4 py-2.5 text-sm text-slate-300 border border-[#2e2e45] rounded-lg hover:bg-[#1e1e2e]">Sign In</Link>
              <Link href="/register" className="block text-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white">Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#12121a] border border-[#2e2e45] text-sm text-slate-300 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Live Congressional Tracking
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight">
            Follow the{" "}
            <span className="gradient-text">Smart Money</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Track every trade made by politicians, hedge funds, and top investors the moment it&apos;s disclosed.
            Real-time congressional trading data, 13F institutional filings, and notable trader activity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/30">
              <Zap className="w-4 h-4" />
              Start Free
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#2e2e45] text-slate-200 font-semibold text-base hover:bg-[#1e1e2e] hover:border-indigo-500/30 transition-all">
              View Live Trades
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: 12847, label: "Congress Trades", suffix: "+" },
              { value: 580, label: "Institutions Tracked", suffix: "+" },
              { value: 28, label: "AUM Monitored", prefix: "$", suffix: "T" },
              { value: 45000, label: "Active Users", suffix: "+" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#12121a]/80 border border-[#1e1e2e] rounded-xl p-4">
                <div className="text-2xl font-bold text-white">
                  <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Ticker */}
      <section className="bg-[#0d0d14] border-y border-[#1e1e2e] py-4 overflow-hidden">
        <div className="overflow-hidden">
          <div className="animate-ticker">
            {[...TICKER_TRADES, ...TICKER_TRADES].map((trade, i) => (
              <div key={i} className="flex items-center gap-1.5 px-6 whitespace-nowrap">
                <span className={`font-semibold text-sm ${trade.color}`}>
                  {trade.type === "BUY" ? "▲" : "▼"} {trade.name}
                </span>
                <span className="text-slate-500 text-sm">•</span>
                <span className="font-mono font-bold text-sm text-white">{trade.ticker}</span>
                <span className="text-slate-500 text-sm">•</span>
                <span className={`text-xs font-semibold ${trade.color}`}>{trade.type}</span>
                <span className="text-slate-500 text-sm">•</span>
                <span className="text-slate-300 text-sm">{trade.amount}</span>
                <span className="text-[#2e2e45] text-sm mx-4">|</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            POWERFUL FEATURES
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Why TradingWatcher?</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">Everything you need to follow the money and make informed investment decisions.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="group bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 hover:border-indigo-500/30 transition-all hover:bg-[#12121a]/80">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-[#0d0d14] border-y border-[#1e1e2e]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-slate-400 text-lg">Three simple steps to follow the smart money</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Politicians & Funds File",
                desc: "Congress members file trades within 45 days via the STOCK Act. Institutions submit 13F quarterly. We monitor all sources 24/7.",
                icon: Landmark,
                gradient: "from-indigo-500 to-blue-600"
              },
              {
                step: "02",
                title: "We Detect & Analyze",
                desc: "Our system processes every new filing in real-time, enriches it with market data, calculates returns, and flags significant activity.",
                icon: Zap,
                gradient: "from-violet-500 to-purple-600"
              },
              {
                step: "03",
                title: "You Get Alerted & Act",
                desc: "Receive instant notifications for trades that match your criteria. View full context, historical patterns, and make informed decisions.",
                icon: Bell,
                gradient: "from-emerald-500 to-teal-600"
              },
            ].map((item, i) => (
              <div key={i} className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 text-center">
                <div className="text-5xl font-black text-[#1e1e2e] mb-4">{item.step}</div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400 text-lg mb-8">Start free. Upgrade when you&apos;re ready to follow the smart money live.</p>
          <div className="inline-flex items-center gap-3 bg-[#12121a] border border-[#1e1e2e] rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!annual ? "bg-[#2e2e45] text-white" : "text-slate-400 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? "bg-[#2e2e45] text-white" : "text-slate-400 hover:text-white"}`}
            >
              Annual
              <span className="text-xs text-emerald-400 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Free</h3>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-slate-500 pb-1">/mo</span>
              </div>
              <p className="text-slate-400 text-sm">Get started for free</p>
            </div>
            <ul className="space-y-3 mb-8">
              {["Delayed data (48h lag)", "2 alerts max", "10 watchlist items", "Basic congress trades", "Public blog access"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-slate-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block w-full text-center px-4 py-3 rounded-xl border border-[#2e2e45] text-slate-200 font-semibold text-sm hover:bg-[#1e1e2e] transition-colors">
              Get Started Free
            </Link>
          </div>

          <div className="relative bg-[#12121a] border-2 border-indigo-500/50 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold flex items-center gap-1">
                <Star className="w-3 h-3" /> Most Popular
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-black text-white">${annual ? "15" : "19"}</span>
                <span className="text-slate-500 pb-1">/mo</span>
              </div>
              {annual && <p className="text-xs text-emerald-400 font-semibold mb-1">Billed $182/year</p>}
              <p className="text-slate-400 text-sm">For serious investors</p>
            </div>
            <ul className="space-y-3 mb-8">
              {["Live real-time data", "Unlimited alerts", "Unlimited watchlist", "All congress + institutional data", "Notable trader tracking", "Email notifications", "API access (1000 req/day)"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=pro" className="block w-full text-center px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25">
              Start 7-Day Free Trial
            </Link>
          </div>

          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Enterprise</h3>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-black text-white">${annual ? "79" : "99"}</span>
                <span className="text-slate-500 pb-1">/mo</span>
              </div>
              {annual && <p className="text-xs text-emerald-400 font-semibold mb-1">Billed $950/year</p>}
              <p className="text-slate-400 text-sm">For teams &amp; institutions</p>
            </div>
            <ul className="space-y-3 mb-8">
              {["Everything in Pro", "Team seats (5 users)", "White-label reports", "Priority support", "Custom data exports", "Dedicated account manager", "Unlimited API access"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-violet-400 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=enterprise" className="block w-full text-center px-4 py-3 rounded-xl border border-[#2e2e45] text-slate-200 font-semibold text-sm hover:bg-[#1e1e2e] transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Blog */}
      <section className="py-24 bg-[#0d0d14] border-y border-[#1e1e2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Market Intelligence Blog</h2>
              <p className="text-slate-400">Analysis, education, and insights on smart money movements.</p>
            </div>
            <Link href="/blog" className="hidden sm:flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium">
              View all posts <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all">
                <div className="h-40 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                  <BarChart2 className="w-12 h-12 text-indigo-500/50" />
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
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          <p className="text-slate-400">Everything you need to know about TradingWatcher.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-[#1e1e2e]/50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-semibold text-white pr-4">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5">
                  <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Band */}
      <section className="py-24 bg-gradient-to-br from-indigo-600/20 via-violet-600/20 to-[#0a0a0f] border-t border-[#1e1e2e]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to follow the smart money?</h2>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            Join 45,000+ investors who track congressional trades and institutional filings with TradingWatcher.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/30">
              <Zap className="w-4 h-4" />
              Get Started Free
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#2e2e45] text-slate-200 font-semibold text-base hover:bg-[#1e1e2e] transition-colors">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] bg-[#0a0a0f] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm">TW</div>
                <span className="text-lg font-bold text-white">TradingWatcher</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Follow the smart money. Real-time congressional trades, 13F filings, and notable trader activity.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: [
                  { label: "Congress Trades", href: "/politicians" },
                  { label: "Institutions", href: "/institutions" },
                  { label: "Notable Traders", href: "/traders" },
                  { label: "Alerts", href: "/alerts" },
                ]
              },
              {
                title: "Company",
                links: [
                  { label: "About", href: "/about" },
                  { label: "Blog", href: "/blog" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Changelog", href: "/changelog" },
                ]
              },
              {
                title: "Legal",
                links: [
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Cookie Policy", href: "/cookies" },
                  { label: "Disclaimer", href: "/disclaimer" },
                ]
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[#1e1e2e] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">&copy; 2025 TradingWatcher. All rights reserved.</p>
            <p className="text-xs text-slate-600">Not financial advice. Data sourced from public government disclosures.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
