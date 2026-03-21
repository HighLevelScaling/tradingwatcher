import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') as 'PAPER' | 'LIVE' | null
    const status = searchParams.get('status') as 'OPEN' | 'CLOSED' | 'CANCELLED' | null
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)

    const where: Record<string, unknown> = {}
    if (mode && (mode === 'PAPER' || mode === 'LIVE')) where.mode = mode
    if (status) where.status = status

    const trades = await prisma.agentTrade.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        agent: {
          select: { name: true, type: true },
        },
      },
    })

    return NextResponse.json({ trades })
  } catch (error) {
    console.error('[GET /api/trading/trades]', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}
