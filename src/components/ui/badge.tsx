import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-[#2e2e45] bg-[#1e1e2e] text-slate-300",
        buy: "border-green-500/30 bg-green-500/20 text-green-400",
        sell: "border-red-500/30 bg-red-500/20 text-red-400",
        democrat: "border-blue-500/30 bg-blue-500/20 text-blue-400",
        republican: "border-red-500/30 bg-red-500/20 text-red-400",
        pro: "border-indigo-500/30 bg-indigo-500/20 text-indigo-400",
        new: "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
