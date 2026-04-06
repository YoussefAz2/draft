"use client"

import Link from "next/link"
import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Home, RefreshCcw, Sparkles, Trophy } from "lucide-react"
import { toast } from "sonner"

import { createRematch } from "@/app/game/actions"
import { TeamSummary } from "@/components/game/team-summary"
import { Button, buttonVariants } from "@/components/ui/button"
import type { AuctionGameRow, AuctionProfile, SoldPlayer } from "@/lib/hooks/use-auction"
import { cn } from "@/lib/utils"
import { calculateTeamScore } from "@/lib/utils/scoring"

function getOutcomeMessage(currentUserId: string, winnerId: string | null) {
  if (!winnerId) {
    return {
      title: "🤝 Égalité",
      subtitle: "Match nul · 0 classement",
      tone: "border-slate-400/20 bg-slate-400/10 text-slate-100",
    }
  }

  if (winnerId === currentUserId) {
    return {
      title: "🎉 Victoire !",
      subtitle: "+25 classement",
      tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    }
  }

  return {
    title: "😔 Défaite",
    subtitle: "-25 classement",
    tone: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  }
}

export function ResultsView({
  currentUserId,
  game,
  profiles,
  hostTeam,
  guestTeam,
}: {
  currentUserId: string
  game: AuctionGameRow
  profiles: AuctionProfile[]
  hostTeam: SoldPlayer[]
  guestTeam: SoldPlayer[]
}) {
  const router = useRouter()
  const [isRematchPending, startRematchTransition] = useTransition()

  const hostProfile = profiles.find((profile) => profile.id === game.host_id) ?? null
  const guestProfile = profiles.find((profile) => profile.id === game.guest_id) ?? null
  const hostBudgetRemaining = game.host_budget_remaining ?? game.budget
  const guestBudgetRemaining = game.guest_budget_remaining ?? game.budget

  const hostScore = useMemo(
    () => calculateTeamScore(hostTeam, hostBudgetRemaining, game.budget),
    [game.budget, hostBudgetRemaining, hostTeam],
  )
  const guestScore = useMemo(
    () => calculateTeamScore(guestTeam, guestBudgetRemaining, game.budget),
    [game.budget, guestBudgetRemaining, guestTeam],
  )

  const winnerId =
    hostScore.totalScore > guestScore.totalScore
      ? game.host_id
      : hostScore.totalScore < guestScore.totalScore
        ? game.guest_id
        : null
  const outcome = getOutcomeMessage(currentUserId, winnerId)
  const isCurrentUserHost = game.host_id === currentUserId
  const myScore = isCurrentUserHost ? hostScore.totalScore : guestScore.totalScore
  const opponentScore = isCurrentUserHost ? guestScore.totalScore : hostScore.totalScore

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl"
        >
          <div className="flex justify-center">
            <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300">
              🏆 Résultats finaux
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3 text-white">
            <Trophy className="size-8 text-amber-300" />
            <h1 className="text-4xl font-black tracking-[0.08em]">RÉSULTATS</h1>
            <Trophy className="size-8 text-amber-300" />
          </div>
          <p className="mt-3 text-base text-muted-foreground">La partie est terminée !</p>
        </motion.section>

        <section className="grid gap-6 xl:grid-cols-2">
          <TeamSummary
            title={hostProfile?.id === currentUserId ? "Mon équipe" : hostProfile?.username ?? "Équipe hôte"}
            subtitle={hostProfile?.id === currentUserId ? hostProfile?.username ?? "Coach" : hostProfile?.username ?? "Coach hôte"}
            players={hostTeam}
            budgetRemaining={hostBudgetRemaining}
            score={hostScore}
            isWinner={winnerId === game.host_id}
            isCurrentUser={hostProfile?.id === currentUserId}
            delay={0.1}
          />
          <TeamSummary
            title={guestProfile?.id === currentUserId ? "Mon équipe" : guestProfile?.username ?? "Équipe adverse"}
            subtitle={guestProfile?.id === currentUserId ? guestProfile?.username ?? "Coach" : guestProfile?.username ?? "Coach adverse"}
            players={guestTeam}
            budgetRemaining={guestBudgetRemaining}
            score={guestScore}
            isWinner={winnerId === game.guest_id}
            isCurrentUser={guestProfile?.id === currentUserId}
            delay={0.22}
          />
        </section>

        <motion.section
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.45, duration: 0.45, ease: "easeOut" }}
          className={cn("rounded-[2rem] border p-6 text-center backdrop-blur-xl", outcome.tone)}
        >
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="size-5" />
            <p className="text-2xl font-black">{outcome.title}</p>
            <Sparkles className="size-5" />
          </div>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.28em]">{outcome.subtitle}</p>
          <p className="mt-5 text-base font-medium text-current/90">
            Toi: {myScore.toFixed(1)} pts vs Adversaire: {opponentScore.toFixed(1)} pts
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.35 }}
          className="flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Button
            size="lg"
            className="h-12 rounded-2xl px-5"
            disabled={isRematchPending}
            onClick={() => {
              startRematchTransition(async () => {
                try {
                  const result = await createRematch(game.id)
                  toast.success("Revanche créée. Redirection vers la waiting room...")
                  router.push(`/game/${result.gameId}`)
                  router.refresh()
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Impossible de créer la revanche.")
                }
              })
            }}
          >
            <RefreshCcw className={cn("size-4", isRematchPending && "animate-spin")} />
            Rejouer
          </Button>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl px-5")}>
            <Home className="size-4" />
            Accueil
          </Link>
        </motion.section>
      </div>
    </main>
  )
}
