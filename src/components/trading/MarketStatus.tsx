"use client"

import { useEffect, useState } from 'react'
import { Clock, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

function isDST(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()
  return Math.max(jan, jul) !== date.getTimezoneOffset()
}

function toETTime(date: Date): Date {
  const offset = isDST(date) ? -4 : -5
  return new Date(date.getTime() + offset * 60 * 60 * 1000)
}

function isMarketOpen(date: Date): boolean {
  const et = toETTime(date)
  const day = et.getUTCDay()
  if (day === 0 || day === 6) return false
  const mins = et.getUTCHours() * 60 + et.getUTCMinutes()
  return mins >= 9 * 60 + 30 && mins < 16 * 60
}

function getNextMarketEvent(date: Date): { label: string; time: string } {
  const et = toETTime(date)
  const day = et.getUTCDay()
  const mins = et.getUTCHours() * 60 + et.getUTCMinutes()
  const openMins = 9 * 60 + 30
  const closeMins = 16 * 60

  if (isMarketOpen(date)) {
    // Show time to close
    const minutesLeft = closeMins - mins
    const h = Math.floor(minutesLeft / 60)
    const m = minutesLeft % 60
    return { label: 'Closes in', time: `${h}h ${m}m` }
  }

  // Show when market next opens
  let daysUntil = 0
  if (day === 6) daysUntil = 2
  else if (day === 0) daysUntil = 1
  else if (mins >= closeMins) daysUntil = day === 5 ? 3 : 1

  const nextOpenET = new Date(et)
  nextOpenET.setUTCDate(nextOpenET.getUTCDate() + daysUntil)
  nextOpenET.setUTCHours(9, 30, 0, 0)
  const offset = isDST(date) ? -4 : -5
  const nextOpenUTC = new Date(nextOpenET.getTime() - offset * 60 * 60 * 1000)
  const minsUntilOpen = Math.round((nextOpenUTC.getTime() - date.getTime()) / 60000)

  if (minsUntilOpen > 60 * 24) {
    const days = Math.floor(minsUntilOpen / (60 * 24))
    const hours = Math.floor((minsUntilOpen % (60 * 24)) / 60)
    return { label: 'Opens in', time: `${days}d ${hours}h` }
  }
  const h = Math.floor(minsUntilOpen / 60)
  const m = minsUntilOpen % 60
  return { label: 'Opens in', time: `${h}h ${m}m` }
}

export function MarketStatus() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const open = isMarketOpen(now)
  const event = getNextMarketEvent(now)

  const etTime = toETTime(now)
  const etFormatted = etTime.toISOString().replace('T', ' ').substring(0, 19) + ' ET'

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-white">Market Status</span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          className={`w-3 h-3 rounded-full ${open ? 'bg-green-400' : 'bg-red-400'}`}
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
          transition={{ duration: open ? 1.5 : 3, repeat: Infinity }}
        />
        <span
          className={`text-xl font-bold ${open ? 'text-green-400' : 'text-red-400'}`}
        >
          {open ? 'OPEN' : 'CLOSED'}
        </span>
      </div>

      {/* Next event */}
      <div className="bg-[#12121a] border border-[#2e2e45] rounded-xl px-3 py-2.5 mb-3">
        <p className="text-xs text-slate-500 mb-0.5">{event.label}</p>
        <p className="text-base font-bold text-white">{event.time}</p>
      </div>

      {/* Current ET time */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        <span className="tabular-nums">{etFormatted}</span>
      </div>
    </div>
  )
}
