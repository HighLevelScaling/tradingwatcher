import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    return NextResponse.json({ status: 'ok', db: 'connected', timestamp })
  } catch {
    return NextResponse.json(
      { status: 'degraded', db: 'unreachable', timestamp },
      { status: 503 }
    )
  }
}
