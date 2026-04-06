"use client"

import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

export function AuctionTimer({
  seconds,
  totalSeconds,
  label,
}: {
  seconds: number
  totalSeconds: number
  label?: string
}) {
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(seconds / totalSeconds, 1)) : 0
  const circumference = 2 * Math.PI * 42
  const offset = circumference * (1 - progress)
  const tone = seconds > 5 ? "text-emerald-300" : seconds >= 3 ? "text-amber-300" : "text-rose-300"
  const stroke = seconds > 5 ? "#34d399" : seconds >= 3 ? "#f59e0b" : "#fb7185"

  return (
    <div className="flex items-center gap-4 rounded-[1.75rem] border border-white/10 bg-black/25 px-4 py-3">
      <motion.div
        animate={seconds < 3 ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={seconds < 3 ? { duration: 0.8, repeat: Number.POSITIVE_INFINITY } : { duration: 0.2 }}
        className="relative flex size-20 items-center justify-center"
      >
        <svg viewBox="0 0 100 100" className="size-20 -rotate-90">
          <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.12)" strokeWidth="8" fill="none" />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold", tone)}>{String(Math.max(seconds, 0)).padStart(2, "0")}</span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">sec</span>
        </div>
      </motion.div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">⏱️ Temps</p>
        <p className={cn("text-lg font-semibold", tone)}>{label ?? (seconds < 3 ? "Dernières secondes !" : "En cours...")}</p>
      </div>
    </div>
  )
}
