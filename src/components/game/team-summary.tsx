"use client"

import { motion } from "framer-motion"

import { AnimatedCounter } from "@/components/game/animated-counter"
import { ScoreBreakdown } from "@/components/game/score-breakdown"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SoldPlayer, TeamScore } from "@/lib/utils/scoring"

function getStars(totalScore: number) {
  const filledStars = Math.max(1, Math.min(5, Math.round(totalScore / 20)))
  return Array.from({ length: 5 }, (_, index) => (index < filledStars ? "★" : "☆")).join("")
}

export function TeamSummary({
  title,
  subtitle,
  players,
  budgetRemaining,
  score,
  isWinner,
  isCurrentUser,
  delay = 0,
}: {
  title: string
  subtitle: string
  players: SoldPlayer[]
  budgetRemaining: number
  score: TeamScore
  isWinner: boolean
  isCurrentUser?: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl",
        isWinner && "shadow-[0_0_60px_rgba(34,197,94,0.18)]",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-500",
          isWinner && "opacity-100",
        )}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isCurrentUser ? (
            <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">Mon équipe</Badge>
          ) : null}
          {isWinner ? (
            <Badge className="rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">Gagnant</Badge>
          ) : null}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 1.05, duration: 0.35 }}
        className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/25 p-5 text-center"
      >
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Score final</p>
        <div className="mt-3 text-5xl font-black text-white">
          <AnimatedCounter value={score.totalScore} decimals={1} delay={delay + 1.08} duration={0.9} />
        </div>
        <p className="mt-3 text-lg tracking-[0.3em] text-amber-300">{getStars(score.totalScore)}</p>
      </motion.div>

      <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          Moyenne : <span className="font-semibold text-white">{score.breakdown.avgRating.toFixed(1)}</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">{score.breakdown.positionCoverage}</div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Détail du score</div>
        <ScoreBreakdown score={score} delay={delay + 0.25} />
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Mon équipe</p>
          <p className="text-sm text-muted-foreground">Restant : {budgetRemaining}M€</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {players.length ? (
            players.map((entry) => (
              <div
                key={`${entry.player.id}-${entry.bidAmount}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{entry.player.position}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{entry.player.short_name || entry.player.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.player.club}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">{entry.player.overall_rating}</p>
                    <p className="text-xs font-semibold text-primary">{entry.bidAmount}M€</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-muted-foreground sm:col-span-2">
              Aucun joueur vendu dans cette équipe.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
