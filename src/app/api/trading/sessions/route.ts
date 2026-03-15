import { NextResponse } from 'next/server'
import {
  getCurrentSession,
  getNextSession,
  minutesUntilNextSession,
  SESSIONS,
} from '@/lib/trading/sessions'

export async function GET() {
  const current = getCurrentSession()
  const next = getNextSession()
  const minsUntilNext = minutesUntilNextSession()

  return NextResponse.json({
    current,
    next,
    minsUntilNext,
    allSessions: SESSIONS,
    utcHour: new Date().getUTCHours(),
    utcTime: new Date().toUTCString(),
  })
}
