import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface BadgeProps {
  className?: string
  variant?: "default" | "secondary" | "destructive" | "outline" | "cyan" | "ghost"
  children?: React.ReactNode
}

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30 shadow-[0_0_10px_rgba(0,229,255,0.2)]": variant === "default",
          "border-transparent bg-navy-800 text-white hover:bg-navy-700": variant === "secondary",
          "border-transparent bg-red-500/20 text-red-500 hover:bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]": variant === "destructive",
          "text-white border-white/20": variant === "outline",
          "border-transparent bg-cyan-neon/20 text-cyan-neon shadow-[0_0_10px_rgba(0,229,255,0.2)]": variant === "cyan",
          "border-transparent text-slate-400 hover:text-white": variant === "ghost",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Badge }

