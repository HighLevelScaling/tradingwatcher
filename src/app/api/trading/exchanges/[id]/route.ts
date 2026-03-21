import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

// PATCH /api/trading/exchanges/:id — update name, sandbox, isPrimary, isActive, label
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { name, sandbox, isPrimary, isActive, label, apiKey, secretKey } = body

  if (isPrimary) {
    await prisma.tradingExchange.updateMany({
      where: { isPrimary: true, NOT: { id } },
      data: { isPrimary: false },
    })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (sandbox !== undefined) data.sandbox = sandbox
  if (isPrimary !== undefined) data.isPrimary = isPrimary
  if (isActive !== undefined) data.isActive = isActive
  if (label !== undefined) data.label = label
  if (apiKey !== undefined) data.apiKey = encrypt(apiKey)
  if (secretKey !== undefined) data.secretKey = encrypt(secretKey)

  const exchange = await prisma.tradingExchange.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      exchangeId: true,
      sandbox: true,
      isPrimary: true,
      isActive: true,
      label: true,
    },
  })

  return NextResponse.json({ exchange })
}

// DELETE /api/trading/exchanges/:id — remove an exchange
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.tradingExchange.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
