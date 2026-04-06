"use client"

import { motion } from "framer-motion"
import { Coins, Medal, ShieldCheck, Sparkles } from "lucide-react"

import { AnimatedCounter } from "@/components/game/animated-counter"
import type { TeamScore } from "@/lib/utils/scoring"

const scoreItems = [
  { key: "qualityScore", label: "⭐ Qualité", icon: Medal, max: 40 },
  { key: "balanceScore", label: "⚖️ Équilibre", icon: ShieldCheck, max: 25 },
  { key: "chemistryScore", label: "🔗 Synergies", icon: Sparkles, max: 25 },
  { key: "budgetScore", label: "💰 Économies", icon: Coins, max: 10 },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<TeamScore, "qualityScore" | "balanceScore" | "chemistryScore" | "budgetScore">
  label: string
  icon: typeof Medal
  max: number
}>

export function ScoreBreakdown({ score, delay = 0.25 }: { score: TeamScore; delay?: number }) {
  return (
    <div className="space-y-3">
      {scoreItems.map((item, index) => {
        const Icon = item.icon
        const value = score[item.key]
        const itemDelay = delay + index * 0.14
        const progress = Math.max(0, Math.min((value / item.max) * 100, 100))

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: itemDelay, duration: 0.35, ease: "easeOut" }}
            className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-white">
                <Icon className="size-4 text-primary" />
                <span>{item.label}</span>
              </div>
              <AnimatedCounter value={value} decimals={1} delay={itemDelay + 0.05} className="text-sm font-semibold text-white" />
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: itemDelay + 0.08, duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-300"
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
