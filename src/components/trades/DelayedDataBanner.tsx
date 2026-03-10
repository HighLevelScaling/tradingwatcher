"use client"
import Link from "next/link"
import { Clock, Zap } from "lucide-react"

export function DelayedDataBanner() {
  return (
    <div className="flex items-center justify-between p-3 mb-6 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
      <div className="flex items-center gap-2 text-amber-400">
        <Clock className="w-4 h-4 shrink-0" />
        <span>You&apos;re viewing data delayed by 48 hours. Upgrade to PRO for live data.</span>
      </div>
      <Link href="/pricing" className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 ml-4">
        <Zap className="w-3 h-3" />
        Upgrade
      </Link>
    </div>
  )
}
