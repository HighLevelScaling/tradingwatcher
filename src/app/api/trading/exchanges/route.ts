import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/trading/exchanges — list all configured exchanges
export async function GET() {
  const exchanges = await prisma.tradingExchange.findMany({
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      exchangeId: true,
      sandbox: true,
      isPrimary: true,
      isActive: true,
      label: true,
      createdAt: true,
      // Never return keys in list response
    },
  })
  return NextResponse.json({ exchanges })
}

// POST /api/trading/exchanges — add a new exchange
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, exchangeId, apiKey, secretKey, sandbox, isPrimary, label } = body

  if (!name || !exchangeId || !apiKey || !secretKey) {
    return NextResponse.json(
      { error: 'name, exchangeId, apiKey, secretKey are required' },
      { status: 400 }
    )
  }

  // If this one is primary, unset any existing primary
  if (isPrimary) {
    await prisma.tradingExchange.updateMany({
      where: { isPrimary: true },
      data: { isPrimary: false },
    })
  }

  const exchange = await prisma.tradingExchange.create({
    data: {
      name,
      exchangeId: exchangeId.toLowerCase().trim(),
      apiKey,
      secretKey,
      sandbox: sandbox ?? true,
      isPrimary: isPrimary ?? false,
      isActive: true,
      label: label ?? null,
    },
    select: {
      id: true,
      name: true,
      exchangeId: true,
      sandbox: true,
      isPrimary: true,
      isActive: true,
      label: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ exchange }, { status: 201 })
}
