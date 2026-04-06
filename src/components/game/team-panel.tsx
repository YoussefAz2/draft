"use client"

import { Badge } from "@/components/ui/badge"
import type { SoldPlayer } from "@/lib/hooks/use-auction"
import { cn } from "@/lib/utils"

export function TeamPanel({
  title,
  subtitle,
  budget,
  players,
  teamSize,
  isMe,
}: {
  title: string
  subtitle: string
  budget: number
  players: SoldPlayer[]
  teamSize: number
  isMe?: boolean
}) {
  const slots = Array.from({ length: teamSize })

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Badge
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-semibold",
            isMe ? "border-primary/20 bg-primary/10 text-primary" : "border-white/10 bg-black/30 text-white",
          )}
        >
          {budget}M€
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {slots.map((_, index) => {
          const player = players[index]

          if (!player) {
            return (
              <div
                key={`empty-${index}`}
                className="flex min-h-24 items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-muted-foreground"
              >
                <span className="mr-2 text-2xl opacity-40">👤</span>
                <span>Poste {index + 1}</span>
              </div>
            )
          }

          return (
            <div
              key={`${player.player.id}-${index}`}
              className="rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">{player.player.position}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{player.player.short_name}</p>
                  <p className="text-xs text-muted-foreground">{player.player.club}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{player.player.overall_rating}</p>
                  <p className="text-xs font-semibold text-primary">{player.bidAmount}M€</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
