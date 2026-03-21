import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const backtests = await prisma.backtest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        agent: { select: { name: true } },
      },
    })

    return NextResponse.json({ backtests })
  } catch (error) {
    console.error('[GET /api/trading/backtests]', error)
    return NextResponse.json(
      { error: 'Failed to fetch backtests' },
      { status: 500 }
    )
  }
}
