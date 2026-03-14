import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  // Validate CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    const expectedAuth = `Bearer ${cronSecret}`
    if (authHeader !== expectedAuth) {
      // Also check x-cron-secret header for Vercel cron
      const headerSecret = request.headers.get('x-cron-secret')
      if (headerSecret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
  }

  const start = Date.now()

  try {
    const { AgentOrchestrator } = await import('@/agents/orchestrator')
    const orchestrator = new AgentOrchestrator()

    const result = await orchestrator.runCycle()
    await orchestrator.disconnect()

    const duration = Date.now() - start

    return NextResponse.json({
      success: true,
      duration,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = Date.now() - start
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CRON /api/cron/trading]', error)

    return NextResponse.json(
      {
        success: false,
        duration,
        errors: [message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
