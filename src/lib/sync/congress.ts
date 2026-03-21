/**
 * Congress trade data sync.
 * Fetches recent congressional trades from the QuiverQuant API
 * and upserts them into the database.
 *
 * API: https://api.quiverquant.com/beta/live/congresstrading
 * Requires QUIVERQUANT_API_KEY env var.
 */

import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'
import { notifyCongressTrade } from '@/lib/notifications'

const log = createLogger('sync:congress')

interface QuiverTrade {
  ReportDate: string
  TransactionDate: string
  Ticker: string
  Representative: string
  Transaction: string   // "Purchase" | "Sale" | "Sale (Full)" | "Sale (Partial)" | "Exchange"
  Amount: string        // "$1,001 - $15,000"
  House: string         // "House" | "Senate"
  Party: string         // "Democrat" | "Republican"
  State: string
  District?: string
  Description?: string
}

function mapTradeType(transaction: string): 'BUY' | 'SELL' | 'EXCHANGE' {
  const lower = transaction.toLowerCase()
  if (lower.includes('purchase')) return 'BUY'
  if (lower.includes('sale')) return 'SELL'
  return 'EXCHANGE'
}

function mapParty(party: string): 'DEMOCRAT' | 'REPUBLICAN' | 'INDEPENDENT' | 'OTHER' {
  const lower = party.toLowerCase()
  if (lower.includes('democrat')) return 'DEMOCRAT'
  if (lower.includes('republican')) return 'REPUBLICAN'
  if (lower.includes('independent')) return 'INDEPENDENT'
  return 'OTHER'
}

function mapChamber(house: string): 'HOUSE' | 'SENATE' {
  return house.toLowerCase() === 'senate' ? 'SENATE' : 'HOUSE'
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function parseAmountRange(amount: string): { low: number; high: number } {
  const cleaned = amount.replace(/[$,]/g, '')
  const match = cleaned.match(/(\d+)\s*-\s*(\d+)/)
  if (match) return { low: parseFloat(match[1]), high: parseFloat(match[2]) }
  const single = cleaned.match(/(\d+)/)
  if (single) return { low: parseFloat(single[1]), high: parseFloat(single[1]) }
  return { low: 0, high: 0 }
}

export async function syncCongressTrades(): Promise<{
  newCount: number
  updatedCount: number
  errors: string[]
}> {
  const apiKey = process.env.QUIVERQUANT_API_KEY
  if (!apiKey) {
    log.warn('QUIVERQUANT_API_KEY not set — skipping congress trade sync')
    return { newCount: 0, updatedCount: 0, errors: ['No API key configured'] }
  }

  const startedAt = new Date()
  let newCount = 0
  let updatedCount = 0
  const errors: string[] = []

  try {
    const response = await fetch('https://api.quiverquant.com/beta/live/congresstrading', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      throw new Error(`QuiverQuant API returned ${response.status}`)
    }

    const trades = (await response.json()) as QuiverTrade[]
    log.info(`Fetched ${trades.length} congress trades from QuiverQuant`)

    for (const trade of trades) {
      try {
        if (!trade.Ticker || !trade.Representative) continue

        const externalId = `qv-${trade.Representative}-${trade.Ticker}-${trade.TransactionDate}`

        // Upsert politician
        const slug = slugify(trade.Representative)
        const politician = await prisma.politician.upsert({
          where: { slug },
          create: {
            slug,
            name: trade.Representative,
            party: mapParty(trade.Party),
            chamber: mapChamber(trade.House),
            state: trade.State ?? '',
            district: trade.District ?? null,
          },
          update: {
            party: mapParty(trade.Party),
            chamber: mapChamber(trade.House),
            state: trade.State ?? '',
          },
        })

        const { low, high } = parseAmountRange(trade.Amount)

        // Upsert trade
        const existing = await prisma.congressTrade.findUnique({
          where: { externalId },
        })

        if (existing) {
          updatedCount++
        } else {
          await prisma.congressTrade.create({
            data: {
              externalId,
              politicianId: politician.id,
              ticker: trade.Ticker,
              assetName: trade.Description ?? null,
              tradeType: mapTradeType(trade.Transaction),
              amount: trade.Amount,
              amountLow: low,
              amountHigh: high,
              tradeDate: new Date(trade.TransactionDate),
              reportedDate: new Date(trade.ReportDate),
              description: trade.Description ?? null,
              source: 'QUIVERQUANT',
            },
          })

          // Update politician trade count
          await prisma.politician.update({
            where: { id: politician.id },
            data: {
              totalTrades: { increment: 1 },
              lastTradeDate: new Date(trade.TransactionDate),
            },
          })

          newCount++

          // Fire notifications for new trades
          await notifyCongressTrade({
            politician: trade.Representative,
            ticker: trade.Ticker,
            tradeType: trade.Transaction,
            amount: trade.Amount,
            reportedDate: trade.ReportDate,
          }).catch(() => {})
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${trade.Ticker}: ${msg}`)
      }
    }

    // Log sync
    await prisma.syncLog.create({
      data: {
        source: 'QUIVERQUANT',
        status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
        recordsNew: newCount,
        recordsUpdated: updatedCount,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
        startedAt,
        completedAt: new Date(),
      },
    })

    log.info(`Congress sync complete: ${newCount} new, ${updatedCount} existing, ${errors.length} errors`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('Congress sync failed', err)
    errors.push(msg)

    await prisma.syncLog.create({
      data: {
        source: 'QUIVERQUANT',
        status: 'FAILED',
        errorMessage: msg,
        startedAt,
        completedAt: new Date(),
      },
    })
  }

  return { newCount, updatedCount, errors }
}
