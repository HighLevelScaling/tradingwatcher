import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hours = Math.min(parseInt(searchParams.get('hours') ?? '24'), 168)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any

  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const [latest, history] = await Promise.all([
    db.kimchiPremium.findFirst({ orderBy: { createdAt: 'desc' } }),
    db.kimchiPremium.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { premiumPct: true, signal: true, createdAt: true },
    }),
  ])

  return NextResponse.json({ latest, history })
}
