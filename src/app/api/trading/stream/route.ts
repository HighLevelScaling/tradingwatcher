import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function fetchStreamData() {
  const [agents, latestTrade, latestSignal, pnlSummary, arbitrage] = await Promise.allSettled([
    (prisma as any).tradingAgent.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { trades: true, signals: true } },
        trades: { where: { status: 'OPEN' }, select: { id: true } },
      },
    }),
    (prisma as any).agentTrade.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { agent: { select: { name: true } } },
    }),
    (prisma as any).tradingSignal.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { agent: { select: { name: true } } },
    }),
    (prisma as any).pnLSnapshot.findFirst({
      orderBy: { timestamp: 'desc' },
    }),
    (prisma as any).arbitrageOpportunity.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    agents: agents.status === 'fulfilled' ? agents.value : [],
    latestTrade: latestTrade.status === 'fulfilled' ? latestTrade.value : null,
    latestSignal: latestSignal.status === 'fulfilled' ? latestSignal.value : null,
    pnl: pnlSummary.status === 'fulfilled' ? pnlSummary.value : null,
    arbitrage: arbitrage.status === 'fulfilled' ? arbitrage.value : [],
    timestamp: new Date().toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let interval: ReturnType<typeof setInterval> | null = null

      const sendEvent = async () => {
        if (closed) return
        try {
          const data = await fetchStreamData()
          const event = `data: ${JSON.stringify({ type: 'update', data })}\n\n`
          controller.enqueue(encoder.encode(event))
        } catch {
          // DB errors are transient — keep the stream alive
        }
      }

      // Send initial data immediately
      sendEvent()

      // Then every 3 seconds
      interval = setInterval(sendEvent, 3000)

      // Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        closed = true
        if (interval) clearInterval(interval)
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
