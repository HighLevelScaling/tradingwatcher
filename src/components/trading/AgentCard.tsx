"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  Bot,
  Clock,
  Database,
  Pause,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type AgentStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR' | 'STOPPED'
type AgentType = 'MARKET_DATA' | 'SIGNAL' | 'ARBITRAGE' | 'EXECUTION' | 'LEARNING' | 'SELF_TEST'
type TradingMode = 'PAPER' | 'LIVE'

interface Agent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  mode: TradingMode
  totalPnl: number
  winRate: number
  totalTrades: number
  lastRunAt: Date | string | null
  isActive: boolean
  lastError: string | null
  _count: { trades: number }
}

interface Props {
  agent: Agent
  onToggle?: (agentId: string, isActive: boolean) => void
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  IDLE: { label: 'Idle', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Pause },
  RUNNING: { label: 'Running', color: 'text-green-400', bg: 'bg-green-400/10', icon: Activity },
  PAUSED: { label: 'Paused', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Pause },
  ERROR: { label: 'Error', color: 'text-red-400', bg: 'bg-red-400/10', icon: AlertCircle },
  STOPPED: { label: 'Stopped', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Pause },
}

const TYPE_CONFIG: Record<AgentType, { label: string; icon: React.ElementType; color: string }> = {
  MARKET_DATA: { label: 'Market Data', icon: Database, color: 'text-sky-400' },
  SIGNAL: { label: 'Signal', icon: Zap, color: 'text-yellow-400' },
  ARBITRAGE: { label: 'Arbitrage', icon: TrendingUp, color: 'text-violet-400' },
  EXECUTION: { label: 'Execution', icon: Activity, color: 'text-green-400' },
  LEARNING: { label: 'Learning', icon: Bot, color: 'text-indigo-400' },
  SELF_TEST: { label: 'Self Test', icon: AlertCircle, color: 'text-orange-400' },
}

function ToggleSwitch({
  enabled,
  onChange,
  loading,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  loading: boolean
}) {
  return (
    <button
      onClick={() => !loading && onChange(!enabled)}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-indigo-500' : 'bg-[#2e2e45]'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.span
        layout
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow`}
        animate={{ x: enabled ? '1.1rem' : '0.15rem' }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </button>
  )
}

export function AgentCard({ agent, onToggle }: Props) {
  const [loading, setLoading] = useState(false)
  const statusCfg = STATUS_CONFIG[agent.status]
  const typeCfg = TYPE_CONFIG[agent.type]
  const StatusIcon = statusCfg.icon
  const TypeIcon = typeCfg.icon

  const handleToggle = async (newValue: boolean) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trading/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newValue }),
      })
      if (res.ok && onToggle) {
        onToggle(agent.id, newValue)
      }
    } finally {
      setLoading(false)
    }
  }

  const isPositive = agent.totalPnl >= 0
  const lastRun = agent.lastRunAt
    ? formatDistanceToNow(new Date(agent.lastRunAt), { addSuffix: true })
    : 'Never'

  return (
    <motion.div
      layout
      className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 hover:border-[#2e2e45] transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg bg-[#12121a] ${typeCfg.color}`}>
            <TypeIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{agent.name}</p>
            <span className="text-xs text-slate-500">{typeCfg.label}</span>
          </div>
        </div>
        <ToggleSwitch enabled={agent.isActive} onChange={handleToggle} loading={loading} />
      </div>

      {/* Status + Mode badges */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}
        >
          {agent.status === 'RUNNING' && (
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <StatusIcon className="w-3 h-3" />
          {statusCfg.label}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            agent.mode === 'PAPER'
              ? 'bg-sky-500/10 text-sky-400'
              : 'bg-orange-500/10 text-orange-400'
          }`}
        >
          {agent.mode}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#12121a] rounded-lg p-2 text-center">
          <p
            className={`text-sm font-bold tabular-nums ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}${agent.totalPnl.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">P&L</p>
        </div>
        <div className="bg-[#12121a] rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-white tabular-nums">
            {(agent.winRate * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Win Rate</p>
        </div>
        <div className="bg-[#12121a] rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-white tabular-nums">{agent.totalTrades}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Trades</p>
        </div>
      </div>

      {/* Last run */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        <span>Last run: {lastRun}</span>
      </div>

      {/* Error */}
      {agent.lastError && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400 bg-red-400/5 border border-red-400/20 rounded-lg p-2">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="truncate">{agent.lastError}</span>
        </div>
      )}
    </motion.div>
  )
}
