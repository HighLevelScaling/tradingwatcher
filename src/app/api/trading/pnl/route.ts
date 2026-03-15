import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') ?? '24', 10)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const snapshots = await (prisma as any).pnLSnapshot.findMany({
      where: { timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    })

    // Latest snapshot for summary
    const latest = await (prisma as any).pnLSnapshot.findFirst({
      orderBy: { timestamp: 'desc' },
    })

    return NextResponse.json({
      snapshots,
      summary: latest
        ? {
            totalPnl: latest.totalPnl,
            dayPnl: latest.dayPnl,
            openPositions: latest.openPositions,
            equity: latest.equity,
            cash: latest.cash,
            timestamp: latest.timestamp,
          }
        : {
            totalPnl: 0,
            dayPnl: 0,
            openPositions: 0,
            equity: 0,
            cash: 0,
            timestamp: null,
          },
    })
  } catch (error) {
    console.error('[GET /api/trading/pnl]', error)
    return NextResponse.json(
      { error: 'Failed to fetch P&L data' },
      { status: 500 }
    )
  }
}
