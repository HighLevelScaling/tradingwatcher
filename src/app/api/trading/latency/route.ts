import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Latest reading per exchange
  const exchanges = await prisma.tradingExchange.findMany({
    where: { isActive: true },
    select: {
      exchangeId: true,
      name: true,
      lastLatencyMs: true,
      lastLatencyAt: true,
      isPrimary: true,
      sandbox: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { lastLatencyMs: 'asc' }],
  }).catch(() => [])

  // Last 10 readings per exchange for sparkline
  const history = await prisma.exchangeLatency.findMany({
    where: { measuredAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    orderBy: { measuredAt: 'asc' },
    select: { exchangeId: true, latencyMs: true, tier: true, measuredAt: true },
  }).catch(() => [])

  return NextResponse.json({ exchanges, history })
}
