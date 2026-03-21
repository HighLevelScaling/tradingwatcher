# TradingWatcher

Full-stack trading intelligence platform: track congressional trades, institutional 13F filings, and run autonomous crypto trading strategies.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Radix UI, Recharts
- **Backend:** Next.js API routes, SSE streaming, CCXT exchange integration
- **Database:** PostgreSQL via Prisma ORM (Supabase)
- **Auth:** NextAuth v5
- **Payments:** Stripe (FREE / PRO / ENTERPRISE tiers)
- **Deployment:** Vercel

## Features

### Congressional & Institutional Tracking
- Congress trade monitoring with QuiverQuant data sync
- 13F institutional filing tracker (SEC/EDGAR)
- Notable trader position tracking
- Per-ticker, per-politician, per-institution watchlists
- Custom alerts with webhook delivery

### Autonomous Crypto Trading
- **7 AI agents:** Market Data, Momentum, Mean Reversion, Arbitrage, Execution, Learning, Self-Test
- **Opening Box strategy:** Intraday state-machine strategy for QQQ/USD
- **Multi-exchange support:** Unlimited CCXT exchanges via env vars or DB management UI
- **Kimchi premium monitor:** KRW premium signal integration
- **Session-aware thresholds:** Adjusts signal sensitivity by market session
- **Latency monitoring:** Per-exchange latency tracking with arbitrage safety checks
- **P&L dashboard:** Real-time SSE-powered trading dashboard
- **Risk management:** Position sizing, daily loss limits, max position caps
- **Self-optimizing:** Learning agent tunes RSI/BB parameters from trade results

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (or Supabase)
- Exchange API keys (Binance, Bybit, etc.)

### Setup

```bash
# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Exchange (numbered — add as many as needed)
EXCHANGE_1_ID=binance
EXCHANGE_1_API_KEY=
EXCHANGE_1_SECRET=
EXCHANGE_1_SANDBOX=true
EXCHANGE_1_PRIMARY=true

# Data sources
QUIVERQUANT_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Cron protection
CRON_SECRET=
```

### Cron Jobs (Vercel)

| Route | Schedule | Description |
|-------|----------|-------------|
| `/api/cron/trading` | Every minute (market hours) | Run trading agent cycle |
| `/api/cron/sync` | 2 PM UTC weekdays | Sync congress trades |

### Running the Trading Agents

```bash
# One-off cycle via CLI
npm run agents

# Or trigger via API
curl -X POST http://localhost:3000/api/trading/control \
  -H "Content-Type: application/json" \
  -d '{"action": "cycle"}'
```

## Project Structure

```
src/
├── agents/             # Trading agent orchestrator & strategies
├── app/
│   ├── (auth)/         # Login/register pages
│   ├── (dashboard)/    # Dashboard pages (trading, politicians, etc.)
│   └── api/
│       ├── trading/    # Trading system APIs
│       └── cron/       # Scheduled tasks
├── components/
│   ├── trading/        # Trading-specific components
│   ├── shared/         # Error boundaries, loading spinners
│   └── ui/             # Shadcn-style primitives
├── lib/
│   ├── trading/        # Core trading logic (exchange, executor, risk, signals)
│   ├── sync/           # Data sync (congress, institutions)
│   ├── notifications.ts
│   ├── logger.ts
│   └── prisma.ts
└── types/              # TypeScript declarations
```
