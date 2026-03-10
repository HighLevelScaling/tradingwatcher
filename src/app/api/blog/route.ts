import { NextRequest, NextResponse } from "next/server"
const POSTS = [
  { id: "1", slug: "how-congress-beats-the-market", title: "How Congress Members Consistently Beat the Market", excerpt: "Congressional trading data reveals a startling pattern: legislators outperform the S&P 500 by an average of 12% annually.", author: "TradingWatcher Team", category: "ANALYSIS", publishedAt: "2025-01-20", readMinutes: 8, coverGradient: "from-indigo-500 to-violet-600" },
  { id: "2", slug: "understanding-13f-filings", title: "Understanding 13F Filings: A Complete Guide", excerpt: "Every quarter, institutional investors managing over $100M must disclose their holdings to the SEC.", author: "Research Team", category: "EDUCATION", publishedAt: "2025-01-15", readMinutes: 6, coverGradient: "from-blue-500 to-cyan-600" },
  { id: "3", slug: "q1-2025-institutional-moves", title: "Q1 2025: The Biggest Institutional Moves You Missed", excerpt: "From Berkshire's massive Apple reduction to Tiger Global's AI pivot.", author: "TradingWatcher Team", category: "INSIDER_ACTIVITY", publishedAt: "2025-01-10", readMinutes: 10, coverGradient: "from-emerald-500 to-teal-600" },
]
export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")
  const posts = category && category !== "ALL" ? POSTS.filter(p => p.category === category) : POSTS
  return NextResponse.json({ posts, total: posts.length })
}
