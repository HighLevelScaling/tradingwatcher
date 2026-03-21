import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  return handleSync(request)
}

export async function POST(request: NextRequest) {
  return handleSync(request)
}

async function handleSync(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    const headerSecret = request.headers.get('x-cron-secret')
    if (authHeader !== `Bearer ${cronSecret}` && headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const start = Date.now()

  try {
    const { syncCongressTrades } = await import('@/lib/sync/congress')
    const result = await syncCongressTrades()

    return NextResponse.json({
      success: true,
      duration: Date.now() - start,
      congress: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON /api/cron/sync]', error)
    return NextResponse.json(
      {
        success: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
