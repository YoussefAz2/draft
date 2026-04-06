import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getEloTier } from "@/lib/utils/profile"

const tierStyles = {
  bronze: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  silver: "border-slate-400/25 bg-slate-300/10 text-slate-100",
  gold: "border-yellow-400/25 bg-yellow-400/10 text-yellow-200",
  diamond: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
} satisfies Record<ReturnType<typeof getEloTier>, string>

const tierLabels = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
  diamond: "Diamant",
} satisfies Record<ReturnType<typeof getEloTier>, string>

export function EloBadge({ eloRating, className }: { eloRating: number; className?: string }) {
  const tier = getEloTier(eloRating)

  return (
    <Badge className={cn("rounded-full border px-3 py-1 text-sm font-semibold", tierStyles[tier], className)}>
      {tierLabels[tier]} · {eloRating} pts
    </Badge>
  )
}
