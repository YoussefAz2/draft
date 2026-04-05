"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

import type { AuctionPlayer } from "@/lib/hooks/use-auction"
import { cn } from "@/lib/utils"

function getCardTheme(rating: number) {
  if (rating >= 90) {
    return {
      shell: "from-amber-200 via-yellow-500 to-amber-800 text-amber-50",
      glow: "shadow-[0_24px_80px_rgba(245,158,11,0.35)]",
    }
  }

  if (rating >= 85) {
    return {
      shell: "from-yellow-100 via-amber-300 to-yellow-700 text-zinc-950",
      glow: "shadow-[0_20px_70px_rgba(234,179,8,0.25)]",
    }
  }

  if (rating >= 80) {
    return {
      shell: "from-slate-100 via-slate-300 to-slate-600 text-slate-950",
      glow: "shadow-[0_20px_70px_rgba(148,163,184,0.2)]",
    }
  }

  return {
    shell: "from-orange-200 via-orange-400 to-orange-700 text-orange-950",
    glow: "shadow-[0_20px_70px_rgba(194,120,3,0.24)]",
  }
}

function StatRow({ label, value }: { label: string; value: number | null }) {
  const normalized = Math.max(0, Math.min(value ?? 0, 100))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em]">
        <span>{label}</span>
        <span>{value ?? "--"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/20">
        <div className="h-full rounded-full bg-white/75" style={{ width: `${normalized}%` }} />
      </div>
    </div>
  )
}

export function PlayerCard({
  player,
  isRevealing,
  overlay,
}: {
  player: AuctionPlayer
  isRevealing: boolean
  overlay?: ReactNode
}) {
  const theme = getCardTheme(player.overall_rating)

  return (
    <div className="relative mx-auto w-full max-w-sm [perspective:1600px]">
      <motion.div
        initial={false}
        animate={{ rotateY: isRevealing ? 180 : 0 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="relative min-h-[31rem] w-full [transform-style:preserve-3d]"
      >
        <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-white/5 p-6 [backface-visibility:hidden]">
          <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-black/35">
            <div className="flex size-28 items-center justify-center rounded-full border border-white/10 bg-white/5 text-6xl font-black text-white/80">
              ?
            </div>
            <p className="mt-6 text-xl font-semibold text-white">Révélation du joueur</p>
            <p className="mt-2 text-center text-sm text-muted-foreground">La prochaine star apparaît dans quelques instants.</p>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 rounded-[2rem] border border-white/15 bg-gradient-to-br p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]",
            theme.shell,
            theme.glow,
          )}
        >
          <div className="relative flex h-full flex-col rounded-[1.5rem] border border-white/20 bg-black/10 p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-5xl font-black leading-none">{player.overall_rating}</p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.3em]">{player.position}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">Base</p>
                <p className="text-xl font-bold">{player.base_price}M€</p>
              </div>
            </div>

            <div className="mt-8 flex flex-1 flex-col justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] opacity-75">Nom</p>
                <p className="mt-1 text-3xl font-black uppercase tracking-[0.08em]">{player.short_name || player.name}</p>
                <p className="mt-3 text-base font-semibold">{player.club}</p>
                <p className="text-sm opacity-80">{player.league}</p>
                <div className="mt-4 flex items-center gap-2 text-base font-semibold">
                  <span className="text-2xl">{player.nationality_flag ?? "🏳️"}</span>
                  <span>{player.nationality}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <StatRow label="PAC" value={player.pace} />
                <StatRow label="SHO" value={player.shooting} />
                <StatRow label="PAS" value={player.passing} />
                <StatRow label="DRI" value={player.dribbling} />
                <StatRow label="DEF" value={player.defending} />
                <StatRow label="PHY" value={player.physical} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      {overlay ? <div className="pointer-events-none absolute inset-0 z-10">{overlay}</div> : null}
    </div>
  )
}
