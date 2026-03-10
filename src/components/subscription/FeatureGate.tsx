"use client"
import Link from "next/link"
import { Lock } from "lucide-react"

interface FeatureGateProps {
  children: React.ReactNode
  isLocked?: boolean
  feature?: string
}

export function FeatureGate({ children, isLocked = false, feature }: FeatureGateProps) {
  if (!isLocked) return <>{children}</>

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-[#12121a]/95 border border-[#1e1e2e] rounded-xl p-6 text-center max-w-sm shadow-2xl">
          <Lock className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">PRO Feature</p>
          <p className="text-slate-400 text-sm mb-4">{feature || "Upgrade to access this feature"}</p>
          <Link href="/pricing" className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Upgrade to PRO
          </Link>
        </div>
      </div>
    </div>
  )
}
