import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hours = Math.min(parseInt(searchParams.get('hours') ?? '24'), 168)

  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const [latest, history] = await Promise.all([
    prisma.kimchiPremium.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.kimchiPremium.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { premiumPct: true, signal: true, createdAt: true },
    }),
  ])

  return NextResponse.json({ latest, history })
}
