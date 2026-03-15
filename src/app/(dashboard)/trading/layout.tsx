import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autonomous Trading | TradingWatcher',
  description: 'Self-learning 24/7 autonomous trading system with live P&L dashboard',
}

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
