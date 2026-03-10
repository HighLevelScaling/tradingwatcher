import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 shadow-lg shadow-indigo-500/25",
        secondary: "bg-[#1e1e2e] text-slate-200 hover:bg-[#2e2e45] border border-[#2e2e45]",
        outline: "border border-[#2e2e45] text-slate-200 hover:bg-[#1e1e2e] hover:border-indigo-500/50",
        ghost: "text-slate-300 hover:bg-[#1e1e2e] hover:text-white",
        destructive: "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30",
        link: "text-indigo-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
