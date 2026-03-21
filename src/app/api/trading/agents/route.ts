import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const agents = await prisma.tradingAgent.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { trades: true, signals: true },
        },
        signals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            type: true,
            direction: true,
            strength: true,
            symbol: true,
            createdAt: true,
          },
        },
        trades: {
          where: { status: 'OPEN' },
          select: { id: true },
        },
      },
    })

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('[GET /api/trading/agents]', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}
