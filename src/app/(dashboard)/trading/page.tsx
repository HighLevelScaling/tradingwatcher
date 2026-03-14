"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bot,
  Activity,
  Play,
  Square,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { PnLDisplay } from '@/components/trading/PnLDisplay'
import { AgentCard } from '@/components/trading/AgentCard'
import { TradeFeed } from '@/components/trading/TradeFeed'
import { SignalFeed } from '@/components/trading/SignalFeed'
import { PnLChart } from '@/components/trading/PnLChart'
import { ArbitrageMonitor } from '@/components/trading/ArbitrageMonitor'
import { MarketStatus } from '@/components/trading/MarketStatus'
import SessionIndicator from '@/components/trading/SessionIndicator'
import KimchiMonitor from '@/components/trading/KimchiMonitor'
import LatencyMonitor from '@/components/trading/LatencyMonitor'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TradingAgent {
  id: string
  name: string
  type: string
  status: string
  mode: string
  totalPnl: number
  todayPnl: number
  winRate: number
  totalTrades: number
  lastRunAt: string | null
  isActive: boolean
  lastError: string | null
  _count: { trades: number; signals: number }
  trades: { id: string }[]
}

interface Trade {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  qty: number
  entryPrice: number
  exitPrice?: number | null
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  mode: 'PAPER' | 'LIVE'
  pnl?: number | null
  pnlPct?: number | null
  strategy: string
  timeframe: string
  createdAt: string
  agent?: { name: string; type: string } | null
}

interface Signal {
  id: string
  symbol: string
  type: 'MOMENTUM' | 'MEAN_REVERSION' | 'BREAKOUT' | 'ARBITRAGE'
  direction: 'BUY' | 'SELL'
  strength: number
  price: number
  timeframe: string
  actedOn: boolean
  createdAt: string
  agent?: { name: string } | null
}

interface PnLSnapshot {
  id: string
  totalPnl: number
  dayPnl: number
  equity: number
  cash: number
  openPositions: number
  timestamp: string
}

interface ArbitrageOpportunity {
  id: string
  type: string
  symbols: string[]
  spreadPct: number
  zScore: number
  estimatedPnl: number
  status: 'DETECTED' | 'EXECUTED' | 'EXPIRED' | 'CLOSED'
  actedOn: boolean
  detectedAt: string
  metadata?: Record<string, unknown> | null
}

interface StreamData {
  agents: TradingAgent[]
  latestTrade: Trade | null
  latestSignal: Signal | null
  pnl: PnLSnapshot | null
  arbitrage: ArbitrageOpportunity[]
  timestamp: string
}

// ─── Control Button ───────────────────────────────────────────────────────────

function ControlButton({
  label,
  icon: Icon,
  onClick,
  variant = 'default',
  loading = false,
}: {
  label: string
  icon: React.ElementType
  onClick: () => void
  variant?: 'default' | 'green' | 'red'
  loading?: boolean
}) {
  const colorMap = {
    default: 'bg-[#1e1e2e] hover:bg-[#2e2e45] text-slate-300',
    green: 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20',
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-transparent transition-all ${colorMap[variant]} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      {label}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TradingPage() {
  const [agents, setAgents] = useState<TradingAgent[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [snapshots, setSnapshots] = useState<PnLSnapshot[]>([])
  const [pnlSummary, setPnlSummary] = useState<{
    totalPnl: number
    dayPnl: number
    equity: number
    cash: number
    openPositions: number
  }>({ totalPnl: 0, dayPnl: 0, equity: 0, cash: 0, openPositions: 0 })
  const [arbitrage, setArbitrage] = useState<ArbitrageOpportunity[]>([])
  const [cycleLoading, setCycleLoading] = useState(false)
  const [allActive, setAllActive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const eventSourceRef = useRef<EventSource | null>(null)

  // Fetch initial data
  const loadInitialData = useCallback(async () => {
    const [tradesRes, signalsRes, pnlRes, arbRes] = await Promise.allSettled([
      fetch('/api/trading/trades?limit=50'),
      fetch('/api/trading/signals?limit=20'),
      fetch('/api/trading/pnl?hours=24'),
      fetch('/api/trading/arbitrage?limit=10'),
    ])

    if (tradesRes.status === 'fulfilled' && tradesRes.value.ok) {
      const data = await tradesRes.value.json() as { trades: Trade[] }
      setTrades(data.trades ?? [])
    }
    if (signalsRes.status === 'fulfilled' && signalsRes.value.ok) {
      const data = await signalsRes.value.json() as { signals: Signal[] }
      setSignals(data.signals ?? [])
    }
    if (pnlRes.status === 'fulfilled' && pnlRes.value.ok) {
      const data = await pnlRes.value.json() as { snapshots: PnLSnapshot[]; summary: typeof pnlSummary }
      setSnapshots(data.snapshots ?? [])
      if (data.summary) setPnlSummary(data.summary)
    }
    if (arbRes.status === 'fulfilled' && arbRes.value.ok) {
      const data = await arbRes.value.json() as { opportunities: ArbitrageOpportunity[] }
      setArbitrage(data.opportunities ?? [])
    }
  }, [])

  // SSE for real-time updates
  useEffect(() => {
    loadInitialData()

    const es = new EventSource('/api/trading/stream')
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as { type: string; data: StreamData }
        if (parsed.type === 'update') {
          const { data } = parsed
          if (data.agents?.length) setAgents(data.agents)
          if (data.arbitrage) setArbitrage(data.arbitrage)
          if (data.pnl) {
            setPnlSummary({
              totalPnl: data.pnl.totalPnl,
              dayPnl: data.pnl.dayPnl,
              equity: data.pnl.equity,
              cash: data.pnl.cash,
              openPositions: data.pnl.openPositions,
            })
          }
          if (data.latestTrade) {
            setTrades((prev) => {
              const exists = prev.some((t) => t.id === data.latestTrade!.id)
              if (exists) return prev
              return [data.latestTrade!, ...prev].slice(0, 50)
            })
          }
          if (data.latestSignal) {
            setSignals((prev) => {
              const exists = prev.some((s) => s.id === data.latestSignal!.id)
              if (exists) return prev
              return [data.latestSignal!, ...prev].slice(0, 20)
            })
          }
          setLastUpdate(new Date().toLocaleTimeString())
        }
      } catch {
        // Malformed event — skip
      }
    }

    es.onerror = () => {
      // EventSource auto-reconnects
    }

    return () => {
      es.close()
    }
  }, [loadInitialData])

  const handleCycle = async () => {
    setCycleLoading(true)
    try {
      await fetch('/api/trading/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cycle' }),
      })
      await loadInitialData()
    } finally {
      setCycleLoading(false)
    }
  }

  const handleToggleAll = async (start: boolean) => {
    setAllActive(start)
    await fetch('/api/trading/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: start ? 'start' : 'stop' }),
    })
  }

  const handleAgentToggle = (agentId: string, isActive: boolean) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, isActive } : a))
    )
  }

  const openPositions = agents.reduce((sum, a) => sum + (a.trades?.length ?? 0), 0)
  const totalAgentPnl = agents.reduce((sum, a) => sum + a.totalPnl, 0)
  const activeAgents = agents.filter((a) => a.isActive).length

  return (
    <div className="space-y-5 pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Autonomous Crypto Trading System</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-sky-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-xs text-sky-400 font-medium">Test Farm (Paper — exchange testnet)</span>
              </div>
              <span className="text-xs text-slate-600">|</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400/50" />
                <span className="text-xs text-slate-500">Live Trading: Off</span>
              </div>
              <span className="text-xs text-slate-600">|</span>
              <span className="text-xs text-slate-500">
                BTC/USDT · ETH/USDT · SOL/USDT · BNB/USDT · XRP/USDT · AVAX/USDT
              </span>
              {lastUpdate && (
                <>
                  <span className="text-xs text-slate-600">|</span>
                  <span className="text-xs text-slate-500">Updated: {lastUpdate}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <ControlButton
            label="Run Cycle"
            icon={RefreshCw}
            onClick={handleCycle}
            loading={cycleLoading}
          />
          <ControlButton
            label="Start All"
            icon={Play}
            onClick={() => handleToggleAll(true)}
            variant="green"
          />
          <ControlButton
            label="Stop All"
            icon={Square}
            onClick={() => handleToggleAll(false)}
            variant="red"
          />
        </div>
      </div>

      {/* Row 1: P&L + Market Status + Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PnLDisplay
          totalPnl={pnlSummary.totalPnl}
          dayPnl={pnlSummary.dayPnl}
          equity={pnlSummary.equity}
          cash={pnlSummary.cash}
        />
        <MarketStatus />
        <SessionIndicator />

        {/* Portfolio Stats */}
        <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Portfolio</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Open Positions', value: openPositions, color: 'text-yellow-400' },
              { label: 'Active Agents', value: activeAgents, color: 'text-green-400' },
              {
                label: 'Total Agent P&L',
                value: `${totalAgentPnl >= 0 ? '+' : ''}${totalAgentPnl.toFixed(2)} USDT`,
                color: totalAgentPnl >= 0 ? 'text-green-400' : 'text-red-400',
              },
              {
                label: 'Today Agent P&L',
                value: `${pnlSummary.dayPnl >= 0 ? '+' : ''}${pnlSummary.dayPnl.toFixed(2)} USDT`,
                color: pnlSummary.dayPnl >= 0 ? 'text-green-400' : 'text-red-400',
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#12121a] border border-[#2e2e45] rounded-xl p-3">
                <p className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* System activity indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Activity className="w-3.5 h-3.5" />
            <span>SSE stream active — updates every 3s · 24/7 crypto</span>
          </div>
        </div>
      </div>

      {/* Row 2: P&L Chart + Arbitrage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PnLChart snapshots={snapshots} />
        </div>
        <div className="space-y-4">
          <ArbitrageMonitor opportunities={arbitrage} />
          <KimchiMonitor />
          <LatencyMonitor />
        </div>
      </div>

      {/* Row 3: Agents Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">Trading Agents</span>
          <span className="text-xs text-slate-500">({agents.length} total)</span>
        </div>
        {agents.length === 0 ? (
          <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-8 text-center text-slate-500">
            <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No agents initialized yet</p>
            <p className="text-xs mt-1">Click &quot;Run Cycle&quot; to bootstrap the system</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent as Parameters<typeof AgentCard>[0]['agent']}
                onToggle={handleAgentToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Row 4: Trade Feed + Signal Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TradeFeed trades={trades} />
        <SignalFeed signals={signals} />
      </div>
    </div>
  )
}
