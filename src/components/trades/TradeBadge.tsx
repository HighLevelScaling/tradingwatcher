import { cn } from "@/lib/utils"

interface TradeBadgeProps {
  type: "BUY" | "SELL" | "EXCHANGE"
  className?: string
}

export function TradeBadge({ type, className }: TradeBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
      type === "BUY" && "bg-green-500/20 text-green-400 border-green-500/30",
      type === "SELL" && "bg-red-500/20 text-red-400 border-red-500/30",
      type === "EXCHANGE" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      className
    )}>
      {type === "BUY" && <span>▲</span>}
      {type === "SELL" && <span>▼</span>}
      {type}
    </span>
  )
}
