"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'

interface Snapshot {
  id: string
  totalPnl: number
  dayPnl: number
  equity: number
  timestamp: Date | string
}

interface Props {
  snapshots: Snapshot[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { timestamp: string } }>
  label?: string
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  const isPositive = value >= 0
  const ts = payload[0].payload?.timestamp

  return (
    <div className="bg-[#12121a] border border-[#2e2e45] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-500 mb-1">
        {ts ? format(new Date(ts), 'MMM d, HH:mm') : ''}
      </p>
      <p className={`text-sm font-bold tabular-nums ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}${value.toFixed(2)}
      </p>
    </div>
  )
}

export function PnLChart({ snapshots }: Props) {
  const data = snapshots.map((s) => ({
    timestamp: s.timestamp,
    pnl: s.totalPnl,
    displayTime: format(new Date(s.timestamp), 'HH:mm'),
  }))

  const isPositive = data.length > 0 ? (data[data.length - 1]?.pnl ?? 0) >= 0 : true
  const strokeColor = isPositive ? '#4ade80' : '#f87171'
  const gradientId = isPositive ? 'greenGradient' : 'redGradient'
  const gradientColor = isPositive ? '#4ade80' : '#f87171'

  const allPnl = data.map((d) => d.pnl)
  const minPnl = Math.min(0, ...allPnl)
  const maxPnl = Math.max(0, ...allPnl)
  const padding = Math.max(Math.abs(maxPnl - minPnl) * 0.1, 5)

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-white">P&L Chart</span>
        <span className="text-xs text-slate-500">Cumulative</span>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          No data yet — waiting for agent cycles...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
            <XAxis
              dataKey="displayTime"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              domain={[minPnl - padding, maxPnl + padding]}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#2e2e45" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: strokeColor, stroke: '#0d0d14', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
