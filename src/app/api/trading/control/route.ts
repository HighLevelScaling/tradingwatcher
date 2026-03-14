import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      action: 'start' | 'stop' | 'cycle'
      agentId?: string
    }

    if (body.action === 'cycle') {
      // Import here to avoid loading the orchestrator in every route
      const { AgentOrchestrator } = await import('@/agents/orchestrator')
      const orchestrator = new AgentOrchestrator()
      const result = await orchestrator.runCycle()
      await orchestrator.disconnect()
      return NextResponse.json({ success: true, ...result })
    }

    if (body.action === 'start' || body.action === 'stop') {
      const isActive = body.action === 'start'

      if (body.agentId) {
        await (prisma as any).tradingAgent.update({
          where: { id: body.agentId },
          data: { isActive },
        })
      } else {
        // Toggle all agents
        await (prisma as any).tradingAgent.updateMany({ data: { isActive } })
      }

      return NextResponse.json({
        success: true,
        message: `Agents ${isActive ? 'started' : 'stopped'}`,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[POST /api/trading/control]', error)
    return NextResponse.json(
      { error: 'Control action failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
