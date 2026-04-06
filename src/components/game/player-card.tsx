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
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] xl:text-[11px] xl:tracking-[0.24em]">
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
    <div className="relative mx-auto w-full max-w-xs xl:max-w-sm [perspective:1600px]">
      <motion.div
        initial={false}
        animate={{ rotateY: isRevealing ? 180 : 0 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="relative min-h-[26rem] w-full [transform-style:preserve-3d] xl:min-h-[31rem]"
      >
        <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-white/5 p-5 xl:p-6 [backface-visibility:hidden]">
          <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-black/35">
            <div className="flex size-24 items-center justify-center rounded-full border border-white/10 bg-white/5 text-5xl font-black text-white/80 xl:size-28 xl:text-6xl">
              ?
            </div>
            <p className="mt-5 text-lg font-semibold text-white xl:mt-6 xl:text-xl">Prochain joueur...</p>
            <p className="mt-2 text-center text-sm text-muted-foreground">Qui sera-ce ?</p>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 rounded-[2rem] border border-white/15 bg-gradient-to-br p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] xl:p-6",
            theme.shell,
            theme.glow,
          )}
        >
          <div className="relative flex h-full flex-col rounded-[1.5rem] border border-white/20 bg-black/10 p-4 backdrop-blur-sm xl:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-4xl font-black leading-none xl:text-5xl">{player.overall_rating}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.26em] xl:text-sm xl:tracking-[0.3em]">{player.position}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-1 flex-col justify-between xl:mt-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] opacity-75 xl:text-[11px] xl:tracking-[0.26em]">Nom</p>
                <p className="mt-1 text-2xl font-black uppercase tracking-[0.06em] xl:text-3xl xl:tracking-[0.08em]">
                  {player.short_name || player.name}
                </p>
                <p className="mt-2 text-sm font-semibold xl:mt-3 xl:text-base">{player.club}</p>
                <p className="text-xs opacity-80 xl:text-sm">{player.league}</p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold xl:mt-4 xl:text-base">
                  <span className="text-xl xl:text-2xl">{player.nationality_flag ?? "🏳️"}</span>
                  <span>{player.nationality}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 xl:mt-6 xl:gap-3">
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
