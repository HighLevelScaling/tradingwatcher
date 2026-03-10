"use client"
import { useState } from "react"
import Link from "next/link"
import { Check, X, Star, ChevronDown, ChevronUp, Zap } from "lucide-react"

const FAQS = [
  { q: "Is there a free trial?", a: "Yes! PRO comes with a 7-day free trial. No credit card required to start." },
  { q: "Can I cancel anytime?", a: "Absolutely. Cancel anytime from your account settings. You keep access until the end of your billing period." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards (Visa, Mastercard, Amex) and PayPal via Stripe." },
  { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee if you're not satisfied with PRO or Enterprise." },
  { q: "Can I switch between plans?", a: "Yes. Upgrade or downgrade at any time. Upgrades take effect immediately, downgrades at next billing cycle." },
  { q: "Is my data secure?", a: "We use bank-level encryption and never store sensitive financial information. Payments are processed securely through Stripe." },
]

const COMPARISON = [
  { feature: "Congressional trade data", free: "Delayed 48h", pro: "Live", enterprise: "Live" },
  { feature: "Number of alerts", free: "2 max", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Watchlist items", free: "10 max", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Institutional 13F data", free: "Top 12 only", pro: "All 580+", enterprise: "All 580+" },
  { feature: "Notable trader tracking", free: false, pro: true, enterprise: true },
  { feature: "Email notifications", free: false, pro: true, enterprise: true },
  { feature: "API access", free: false, pro: "1,000 req/day", enterprise: "Unlimited" },
  { feature: "Team seats", free: false, pro: false, enterprise: "5 users" },
  { feature: "White-label reports", free: false, pro: false, enterprise: true },
  { feature: "Dedicated support", free: false, pro: false, enterprise: true },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-slate-400 text-xl mb-8">Start free. Upgrade when you&apos;re ready to follow the smart money live.</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-[#12121a] border border-[#1e1e2e] rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${!annual ? "bg-[#2e2e45] text-white" : "text-slate-400 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? "bg-[#2e2e45] text-white" : "text-slate-400 hover:text-white"}`}
            >
              Annual
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {/* Free */}
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Free</h3>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">$0</span>
                <span className="text-slate-500 pb-2">/mo</span>
              </div>
              <p className="text-slate-400 text-sm">Get started, no credit card needed</p>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Congressional trades (48h delay)",
                "2 custom alerts",
                "10 watchlist items",
                "Top 12 institutions",
                "Public blog access",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />{f}
                </li>
              ))}
              {[
                "Live real-time data",
                "Unlimited alerts",
                "All 580+ institutions",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <X className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block w-full text-center px-4 py-3.5 rounded-xl border border-[#2e2e45] text-slate-200 font-semibold hover:bg-[#1e1e2e] transition-colors">
              Get Started Free
            </Link>
          </div>

          {/* Pro */}
          <div className="relative bg-[#12121a] border-2 border-indigo-500/60 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">
            <div className="absolute -top-5 inset-x-0 flex justify-center">
              <span className="px-5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold flex items-center gap-1.5">
                <Star className="w-3 h-3" /> MOST POPULAR
              </span>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">${annual ? "15" : "19"}</span>
                <span className="text-slate-500 pb-2">/mo</span>
              </div>
              {annual && <p className="text-sm text-emerald-400 font-semibold mb-1">Billed $182/year — save $46</p>}
              <p className="text-slate-400 text-sm">For serious investors</p>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Live congressional trade data",
                "Unlimited custom alerts",
                "Unlimited watchlist",
                "All 580+ institutions",
                "Notable trader tracking",
                "Email notifications",
                "API access (1,000 req/day)",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=pro" className="block w-full text-center px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25">
              Start 7-Day Free Trial
            </Link>
            <p className="text-center text-xs text-slate-500 mt-3">No credit card required</p>
          </div>

          {/* Enterprise */}
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">${annual ? "79" : "99"}</span>
                <span className="text-slate-500 pb-2">/mo</span>
              </div>
              {annual && <p className="text-sm text-emerald-400 font-semibold mb-1">Billed $950/year — save $238</p>}
              <p className="text-slate-400 text-sm">For teams &amp; institutions</p>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Everything in Pro",
                "Team seats (5 users)",
                "White-label reports",
                "Priority 24/7 support",
                "Custom data exports",
                "Dedicated account manager",
                "Unlimited API access",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=enterprise" className="block w-full text-center px-4 py-3.5 rounded-xl border border-[#2e2e45] text-slate-200 font-semibold hover:bg-[#1e1e2e] transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Full Feature Comparison</h2>
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 border-b border-[#1e1e2e]">
              <div className="p-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">Feature</div>
              <div className="p-4 text-center text-sm font-semibold text-slate-300">Free</div>
              <div className="p-4 text-center text-sm font-semibold text-indigo-300 bg-indigo-500/5">Pro</div>
              <div className="p-4 text-center text-sm font-semibold text-slate-300">Enterprise</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className="grid grid-cols-4 border-b border-[#1e1e2e] last:border-0 hover:bg-[#1e1e2e]/30 transition-colors">
                <div className="p-4 text-sm text-slate-300">{row.feature}</div>
                {[row.free, row.pro, row.enterprise].map((val, j) => (
                  <div key={j} className={`p-4 text-center ${j === 1 ? "bg-indigo-500/5" : ""}`}>
                    {val === true ? (
                      <Check className="w-4 h-4 text-green-400 mx-auto" />
                    ) : val === false ? (
                      <X className="w-4 h-4 text-slate-700 mx-auto" />
                    ) : (
                      <span className="text-xs text-slate-300">{val}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Billing FAQ</h2>
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
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/20 rounded-2xl p-12 text-center">
          <Zap className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-3">Start following the smart money today</h2>
          <p className="text-slate-400 mb-8">Join 45,000+ investors. Free forever, upgrade whenever.</p>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/25">
            <Zap className="w-4 h-4" />
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  )
}
