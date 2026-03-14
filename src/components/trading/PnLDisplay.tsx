"use client"

import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react'

interface Props {
  totalPnl: number
  dayPnl: number
  equity: number
  cash: number
}

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  className = '',
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 })
  const display = useTransform(spring, (v) =>
    `${prefix}${v >= 0 ? '' : '-'}${Math.abs(v).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  )
  const [displayValue, setDisplayValue] = useState(
    `${prefix}${value >= 0 ? '' : '-'}${Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  )

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v))
    return unsubscribe
  }, [display])

  return <span className={className}>{displayValue}</span>
}

export function PnLDisplay({ totalPnl, dayPnl, equity, cash }: Props) {
  const isPositive = totalPnl >= 0
  const isDayPositive = dayPnl >= 0
  const equityPct = equity > 0 ? (dayPnl / equity) * 100 : 0

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Total P&L
        </span>
        {/* Live pulse */}
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-2 h-2 rounded-full ${isPositive ? 'bg-green-400' : 'bg-red-400'}`}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? 'PROFIT' : 'LOSS'}
          </span>
        </div>
      </div>

      {/* Main P&L number */}
      <div className={`flex items-center gap-2 mb-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? (
          <TrendingUp className="w-7 h-7 shrink-0" />
        ) : (
          <TrendingDown className="w-7 h-7 shrink-0" />
        )}
        <AnimatedNumber
          value={totalPnl}
          prefix="$"
          decimals={2}
          className="text-4xl font-bold tabular-nums"
        />
      </div>

      {/* Day P&L */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-slate-500">Today:</span>
        <span
          className={`text-sm font-semibold tabular-nums ${
            isDayPositive ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isDayPositive ? '+' : ''}${dayPnl.toFixed(2)}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
            isDayPositive
              ? 'bg-green-400/10 text-green-400'
              : 'bg-red-400/10 text-red-400'
          }`}
        >
          {isDayPositive ? '+' : ''}
          {equityPct.toFixed(2)}%
        </span>
      </div>

      {/* Equity & Cash */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#12121a] border border-[#2e2e45] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-slate-500">Equity</span>
          </div>
          <AnimatedNumber
            value={equity}
            prefix="$"
            decimals={2}
            className="text-sm font-semibold text-white tabular-nums"
          />
        </div>
        <div className="bg-[#12121a] border border-[#2e2e45] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-slate-500">Cash</span>
          </div>
          <AnimatedNumber
            value={cash}
            prefix="$"
            decimals={2}
            className="text-sm font-semibold text-white tabular-nums"
          />
        </div>
      </div>
    </div>
  )
}
