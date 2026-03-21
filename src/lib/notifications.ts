/**
 * Alert notification delivery system.
 * Evaluates alert conditions and delivers via configured channels (webhook, email stub).
 */

import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'
import type { Alert, AlertType } from '@prisma/client'

const log = createLogger('notifications')

// ─── Channel types ───────────────────────────────────────────────────────────

interface WebhookChannel {
  type: 'webhook'
  url: string
}

interface EmailChannel {
  type: 'email'
  address: string
}

type AlertChannel = WebhookChannel | EmailChannel

// ─── Condition evaluation ────────────────────────────────────────────────────

interface AlertConditions {
  ticker?: string
  politician?: string
  institution?: string
  tradeType?: string
  minAmount?: number
  keywords?: string[]
}

interface AlertEvent {
  type: AlertType
  ticker?: string
  politician?: string
  institution?: string
  tradeType?: string
  amount?: number
  title: string
  description: string
  url?: string
}

function conditionsMatch(conditions: AlertConditions, event: AlertEvent): boolean {
  if (conditions.ticker && event.ticker !== conditions.ticker) return false
  if (conditions.politician && event.politician !== conditions.politician) return false
  if (conditions.institution && event.institution !== conditions.institution) return false
  if (conditions.tradeType && event.tradeType !== conditions.tradeType) return false
  if (conditions.minAmount && (event.amount ?? 0) < conditions.minAmount) return false
  if (conditions.keywords?.length) {
    const text = `${event.title} ${event.description}`.toLowerCase()
    const hasKeyword = conditions.keywords.some((kw) => text.includes(kw.toLowerCase()))
    if (!hasKeyword) return false
  }
  return true
}

// ─── Delivery ────────────────────────────────────────────────────────────────

async function deliverWebhook(channel: WebhookChannel, event: AlertEvent, alertName: string): Promise<boolean> {
  try {
    const response = await fetch(channel.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: alertName,
        event: {
          type: event.type,
          title: event.title,
          description: event.description,
          ticker: event.ticker,
          url: event.url,
        },
        timestamp: new Date().toISOString(),
      }),
    })
    if (!response.ok) {
      log.warn(`Webhook delivery failed: ${response.status}`, { url: channel.url })
      return false
    }
    return true
  } catch (err) {
    log.error('Webhook delivery error', err, { url: channel.url })
    return false
  }
}

async function deliverEmail(_channel: EmailChannel, event: AlertEvent, alertName: string): Promise<boolean> {
  // Email delivery stub — integrate with your email provider (Resend, SendGrid, etc.)
  log.info(`Email notification (stub): "${alertName}" → ${_channel.address}`, {
    title: event.title,
  })
  return true
}

async function deliverToChannel(channel: AlertChannel, event: AlertEvent, alertName: string): Promise<boolean> {
  switch (channel.type) {
    case 'webhook':
      return deliverWebhook(channel, event, alertName)
    case 'email':
      return deliverEmail(channel, event, alertName)
    default:
      log.warn(`Unknown channel type: ${(channel as { type: string }).type}`)
      return false
  }
}

// ─── Main processing ─────────────────────────────────────────────────────────

/**
 * Process an event against all active alerts.
 * Returns the number of alerts that fired.
 */
export async function processAlertEvent(event: AlertEvent): Promise<number> {
  const alerts = await prisma.alert.findMany({
    where: { isActive: true, alertType: event.type },
  })

  let firedCount = 0

  for (const alert of alerts) {
    const conditions = alert.conditions as unknown as AlertConditions
    if (!conditionsMatch(conditions, event)) continue

    const channels = alert.channels as unknown as AlertChannel[]
    if (!Array.isArray(channels) || channels.length === 0) continue

    let delivered = false
    for (const channel of channels) {
      const ok = await deliverToChannel(channel, event, alert.name)
      if (ok) delivered = true
    }

    if (delivered) {
      firedCount++
      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          lastFiredAt: new Date(),
          fireCount: { increment: 1 },
        },
      })
      log.info(`Alert fired: "${alert.name}"`, { alertId: alert.id, event: event.type })
    }
  }

  return firedCount
}

/**
 * Fire a trading system alert (used by the orchestrator for trade events).
 */
export async function notifyTradeEvent(params: {
  symbol: string
  side: 'BUY' | 'SELL'
  price: number
  strategy: string
  pnl?: number
}): Promise<void> {
  const event: AlertEvent = {
    type: 'STOCK_ACTIVITY',
    ticker: params.symbol,
    title: `${params.side} ${params.symbol} @ ${params.price.toFixed(2)}`,
    description: `Strategy: ${params.strategy}${params.pnl != null ? ` | PnL: ${params.pnl > 0 ? '+' : ''}${params.pnl.toFixed(2)}` : ''}`,
    tradeType: params.side,
  }

  await processAlertEvent(event)
}

/**
 * Fire a congress trade alert.
 */
export async function notifyCongressTrade(params: {
  politician: string
  ticker: string
  tradeType: string
  amount: string
  reportedDate: string
}): Promise<void> {
  const event: AlertEvent = {
    type: 'CONGRESS_TRADE',
    ticker: params.ticker,
    politician: params.politician,
    tradeType: params.tradeType,
    title: `${params.politician} ${params.tradeType} ${params.ticker}`,
    description: `Amount: ${params.amount} | Reported: ${params.reportedDate}`,
  }

  await processAlertEvent(event)
}
