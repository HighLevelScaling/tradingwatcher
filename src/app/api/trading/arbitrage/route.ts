import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '10', 10)

    const opportunities = await (prisma as any).arbitrageOpportunity.findMany({
      orderBy: { detectedAt: 'desc' },
      take: Math.min(limit, 50),
    })

    return NextResponse.json({ opportunities })
  } catch (error) {
    console.error('[GET /api/trading/arbitrage]', error)
    return NextResponse.json(
      { error: 'Failed to fetch arbitrage opportunities' },
      { status: 500 }
    )
  }
}
