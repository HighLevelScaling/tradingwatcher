import { NextRequest, NextResponse } from "next/server"

const STOCKS = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "NVDA", name: "NVIDIA Corporation" },
  { ticker: "TSLA", name: "Tesla Inc." },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "MSFT", name: "Microsoft Corporation" },
  { ticker: "AMZN", name: "Amazon.com Inc." },
  { ticker: "META", name: "Meta Platforms Inc." },
  { ticker: "JPM", name: "JPMorgan Chase" },
  { ticker: "AMD", name: "Advanced Micro Devices" },
  { ticker: "DIS", name: "Walt Disney Co." },
]

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase() || ""
  const results = q
    ? STOCKS.filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 5)
    : STOCKS.slice(0, 5)
  return NextResponse.json({ results })
}
