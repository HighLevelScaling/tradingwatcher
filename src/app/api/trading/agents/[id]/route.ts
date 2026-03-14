import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as {
      isActive?: boolean
      mode?: 'PAPER' | 'LIVE'
      status?: string
    }

    const updateData: Record<string, unknown> = {}

    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive
    if (body.mode === 'PAPER' || body.mode === 'LIVE') updateData.mode = body.mode
    if (body.status) updateData.status = body.status

    const agent = await (prisma as any).tradingAgent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('[PATCH /api/trading/agents/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}
