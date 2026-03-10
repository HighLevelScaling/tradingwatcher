import Link from "next/link"
import { ArrowLeft, Clock, User } from "lucide-react"

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/blog" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
        <div className="mb-4">
          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/30">ANALYSIS</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-6 leading-tight">How Congress Members Consistently Beat the Market</h1>
        <div className="flex items-center gap-4 text-sm text-slate-400 mb-8">
          <span className="flex items-center gap-1"><User className="w-4 h-4" />TradingWatcher Team</span>
          <span>January 20, 2025</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />8 min read</span>
        </div>
        <div className="w-full h-64 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-12 flex items-center justify-center text-white text-xl font-bold">
          TradingWatcher Research
        </div>
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            Congressional trading data reveals a startling pattern: legislators outperform the S&amp;P 500 by an average of 12% annually. This isn&apos;t coincidence.
          </p>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">The Data Doesn&apos;t Lie</h2>
          <p className="text-slate-300 leading-relaxed mb-6">
            Between 2020 and 2025, House members who actively traded stocks generated returns averaging 31% annually compared to the S&amp;P 500&apos;s 14% over the same period. Senate traders performed even better at 38%.
          </p>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Key Findings</h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-2"><span className="text-indigo-400 mt-1">•</span>Technology sector purchases before major legislation averaged 28% returns within 6 months</li>
            <li className="flex items-start gap-2"><span className="text-indigo-400 mt-1">•</span>Defense contractor purchases ahead of military spending bills outperformed by 15-20%</li>
            <li className="flex items-start gap-2"><span className="text-indigo-400 mt-1">•</span>Healthcare trades before FDA approvals showed consistent 20%+ outperformance</li>
          </ul>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">How to Use This Data</h2>
          <p className="text-slate-300 leading-relaxed">
            By tracking congressional disclosure filings in real-time through platforms like TradingWatcher, retail investors can identify patterns and potentially mirror successful trades within the legally required disclosure windows.
          </p>
        </div>
        <div className="mt-12 pt-12 border-t border-[#1e1e2e]">
          <h3 className="text-xl font-bold text-white mb-6">Related Articles</h3>
          <div className="grid grid-cols-3 gap-4">
            {["Understanding 13F Filings", "Top 5 Stocks Congress Bought", "What is the STOCK Act"].map((title) => (
              <div key={title} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 hover:border-indigo-500/30 transition-colors cursor-pointer">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-slate-400 mt-1">TradingWatcher Team</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
