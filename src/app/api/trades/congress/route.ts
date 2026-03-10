import { NextRequest, NextResponse } from "next/server"

const TRADES = [
  { id: "1", politician: "Nancy Pelosi", party: "DEMOCRAT", chamber: "HOUSE", state: "CA", ticker: "NVDA", assetName: "NVIDIA Corporation", tradeType: "BUY", amount: "$250,001 - $500,000", tradeDate: "2025-01-15", reportedDate: "2025-01-29", returnPct: 12.4 },
  { id: "2", politician: "Tommy Tuberville", party: "REPUBLICAN", chamber: "SENATE", state: "AL", ticker: "GOOGL", assetName: "Alphabet Inc.", tradeType: "BUY", amount: "$15,001 - $50,000", tradeDate: "2025-01-10", reportedDate: "2025-01-24", returnPct: 3.2 },
  { id: "3", politician: "Dan Crenshaw", party: "REPUBLICAN", chamber: "HOUSE", state: "TX", ticker: "TSLA", assetName: "Tesla Inc.", tradeType: "SELL", amount: "$50,001 - $100,000", tradeDate: "2025-01-08", reportedDate: "2025-01-22", returnPct: -5.1 },
  { id: "4", politician: "Ro Khanna", party: "DEMOCRAT", chamber: "HOUSE", state: "CA", ticker: "AAPL", assetName: "Apple Inc.", tradeType: "BUY", amount: "$100,001 - $250,000", tradeDate: "2025-01-05", reportedDate: "2025-01-19", returnPct: 8.7 },
  { id: "5", politician: "Marjorie Taylor Greene", party: "REPUBLICAN", chamber: "HOUSE", state: "GA", ticker: "META", assetName: "Meta Platforms", tradeType: "BUY", amount: "$15,001 - $50,000", tradeDate: "2025-01-03", reportedDate: "2025-01-17", returnPct: 15.2 },
  { id: "6", politician: "Josh Gottheimer", party: "DEMOCRAT", chamber: "HOUSE", state: "NJ", ticker: "AMZN", assetName: "Amazon.com Inc.", tradeType: "BUY", amount: "$100,001 - $250,000", tradeDate: "2025-01-02", reportedDate: "2025-01-16", returnPct: 7.3 },
  { id: "7", politician: "Michael McCaul", party: "REPUBLICAN", chamber: "HOUSE", state: "TX", ticker: "MSFT", assetName: "Microsoft Corporation", tradeType: "SELL", amount: "$50,001 - $100,000", tradeDate: "2024-12-28", reportedDate: "2025-01-11", returnPct: -2.1 },
  { id: "8", politician: "Shelley Moore Capito", party: "REPUBLICAN", chamber: "SENATE", state: "WV", ticker: "JPM", assetName: "JPMorgan Chase", tradeType: "BUY", amount: "$15,001 - $50,000", tradeDate: "2024-12-20", reportedDate: "2025-01-03", returnPct: 4.8 },
  { id: "9", politician: "Austin Scott", party: "REPUBLICAN", chamber: "HOUSE", state: "GA", ticker: "AMD", assetName: "Advanced Micro Devices", tradeType: "BUY", amount: "$1,001 - $15,000", tradeDate: "2024-12-18", reportedDate: "2025-01-01", returnPct: 9.2 },
  { id: "10", politician: "Kevin Brady", party: "REPUBLICAN", chamber: "HOUSE", state: "TX", ticker: "DIS", assetName: "Walt Disney Co.", tradeType: "SELL", amount: "$15,001 - $50,000", tradeDate: "2024-12-15", reportedDate: "2024-12-29", returnPct: -1.4 },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const tradeType = searchParams.get("tradeType")
  const party = searchParams.get("party")

  let trades = [...TRADES]
  if (tradeType && tradeType !== "ALL") trades = trades.filter(t => t.tradeType === tradeType)
  if (party && party !== "ALL") trades = trades.filter(t => t.party === party)

  const start = (page - 1) * limit
  const paginated = trades.slice(start, start + limit)

  return NextResponse.json({ trades: paginated, total: trades.length, page, pages: Math.ceil(trades.length / limit) })
}
