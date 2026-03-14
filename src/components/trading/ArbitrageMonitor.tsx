"use client"

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { GitMerge, TrendingUp, TrendingDown } from 'lucide-react'

type ArbitrageStatus = 'DETECTED' | 'EXECUTED' | 'EXPIRED' | 'CLOSED'

interface Opportunity {
  id: string
  type: string
  symbols: string[]
  spreadPct: number
  zScore: number
  estimatedPnl: number
  status: ArbitrageStatus
  actedOn: boolean
  detectedAt: Date | string
  metadata?: Record<string, unknown> | null
}

interface Props {
  opportunities: Opportunity[]
}

const STATUS_CONFIG: Record<ArbitrageStatus, { label: string; className: string }> = {
  DETECTED: { label: 'Detected', className: 'bg-yellow-400/10 text-yellow-400' },
  EXECUTED: { label: 'Executed', className: 'bg-green-400/10 text-green-400' },
  EXPIRED: { label: 'Expired', className: 'bg-slate-500/10 text-slate-500' },
  CLOSED: { label: 'Closed', className: 'bg-indigo-400/10 text-indigo-400' },
}

function ZScoreBadge({ value }: { value: number }) {
  const abs = Math.abs(value)
  let color = 'text-slate-400 bg-slate-400/10'
  if (abs > 3) color = value > 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
  else if (abs > 2) color = value > 0 ? 'text-yellow-400 bg-yellow-400/10' : 'text-orange-400 bg-orange-400/10'

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${color}`}>
      {value > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {value.toFixed(2)}σ
    </span>
  )
}

export function ArbitrageMonitor({ opportunities }: Props) {
  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Arbitrage Monitor</span>
        </div>
        <span className="text-xs text-slate-500">{opportunities.length} detected</span>
      </div>

      {/* Table */}
      {opportunities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
          <GitMerge className="w-8 h-8 mb-2 opacity-30" />
          <span className="text-sm">No arbitrage opportunities</span>
          <span className="text-xs mt-1">Z-score threshold: |z| &gt; 2.0</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-[#1e1e2e]">
                <th className="text-left px-4 py-2 font-medium">Pair</th>
                <th className="text-right px-3 py-2 font-medium">Spread</th>
                <th className="text-right px-3 py-2 font-medium">Z-Score</th>
                <th className="text-right px-3 py-2 font-medium">Est. PnL</th>
                <th className="text-center px-3 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Age</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => {
                const statusCfg = STATUS_CONFIG[opp.status]
                const direction = (opp.metadata?.direction ?? {}) as Record<string, string>

                return (
                  <motion.tr
                    key={opp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-[#1e1e2e] hover:bg-[#12121a] transition-colors"
                  >
                    {/* Pair */}
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        {opp.symbols.map((sym) => (
                          <div key={sym} className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{sym}</span>
                            {direction[sym] && (
                              <span
                                className={`text-[10px] font-semibold ${
                                  direction[sym] === 'BUY' ? 'text-green-400' : 'text-red-400'
                                }`}
                              >
                                {direction[sym]}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Spread % */}
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-slate-300 tabular-nums">
                        {(opp.spreadPct * 100).toFixed(3)}%
                      </span>
                    </td>

                    {/* Z-Score */}
                    <td className="px-3 py-2.5 text-right">
                      <ZScoreBadge value={opp.zScore} />
                    </td>

                    {/* Estimated P&L */}
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-green-400 tabular-nums font-semibold">
                        +${opp.estimatedPnl.toFixed(2)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </td>

                    {/* Age */}
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {formatDistanceToNow(new Date(opp.detectedAt), { addSuffix: true })}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
