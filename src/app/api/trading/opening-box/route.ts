import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcStats } from '@/lib/trading/strategies/opening-box'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') ?? 'QQQ/USD'
  const mode = (searchParams.get('mode') ?? 'PAPER') as 'PAPER' | 'LIVE'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)

  try {
    const [today, history] = await Promise.all([
      prisma.openingBoxTrade.findMany({
        where: {
          date: new Date().toISOString().slice(0, 10),
          mode,
        },
        orderBy: { createdAt: 'asc' },
      }).catch(() => []),

      prisma.openingBoxTrade.findMany({
        where: { symbol, mode, status: 'DONE' },
        orderBy: { date: 'desc' },
        take: limit,
      }).catch(() => []),
    ])

    const stats = calcStats(history)

    return NextResponse.json({ today, history, stats, symbol, mode })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
