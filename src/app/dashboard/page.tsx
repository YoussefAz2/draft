import Link from "next/link"
import { Crown, Swords, Target, Trophy } from "lucide-react"
import { redirect } from "next/navigation"

import { DashboardActions } from "@/components/dashboard/dashboard-actions"
import { EloBadge } from "@/components/profile/elo-badge"
import { GameHistoryCard } from "@/components/profile/game-history-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button-variants"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"
import { GAME_MODES } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { formatRelativeTime, formatWinRate } from "@/lib/utils/profile"

type RecentGame = Pick<
  Database["public"]["Tables"]["games"]["Row"],
  "id" | "mode" | "created_at" | "winner_id" | "host_id" | "guest_id" | "host_score" | "guest_score"
> & {
  host: { username: string } | null
  guest: { username: string } | null
  game_players: Array<{
    won_by: string | null
    player: { short_name: string; name: string } | null
  }>
}

function getResultMeta(userId: string, game: RecentGame) {
  if (!game.winner_id) {
    return { label: "Égalité", tone: "neutral" as const }
  }

  return game.winner_id === userId
    ? { label: "Victoire", tone: "success" as const }
    : { label: "Défaite", tone: "danger" as const }
}

function getOpponentName(userId: string, game: RecentGame) {
  return userId === game.host_id ? game.guest?.username ?? "Adversaire" : game.host?.username ?? "Adversaire"
}

function getTeamPreview(userId: string, game: RecentGame) {
  const names = game.game_players
    .filter((entry) => entry.won_by === userId)
    .map((entry) => entry.player?.short_name || entry.player?.name)
    .filter((value): value is string => Boolean(value))

  if (!names.length) {
    return "Aucun joueur remporté"
  }

  return names.length > 3 ? `${names.slice(0, 3).join(", ")}...` : names.join(", ")
}

export default async function DashboardPage() {
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  if (!isConfigured) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
              Supabase requis
            </Badge>
            <CardTitle className="text-3xl text-white">Configuration manquante</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY pour activer le dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/dashboard")
  }

  let profile = null
  let profileError: { message: string } | null = null
  let recentGames: RecentGame[] = []
  let gamesError: { message: string } | null = null

  try {
    const [profileResult, gamesResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("games")
        .select(
          `
            id,
            mode,
            created_at,
            winner_id,
            host_id,
            guest_id,
            host_score,
            guest_score,
            host:profiles!host_id(username),
            guest:profiles!guest_id(username),
            game_players (
              won_by,
              player:players (short_name, name)
            )
          `,
        )
        .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    profile = profileResult.data
    profileError = profileResult.error
      ? { message: profileResult.error.message }
      : null
    recentGames = (gamesResult.data ?? []) as unknown as RecentGame[]
    gamesError = gamesResult.error ? { message: gamesResult.error.message } : null
  } catch {
    profileError = { message: "Impossible de charger les données" }
    gamesError = { message: "Impossible de charger l'historique" }
  }

  const username = profile?.username ?? user.email?.split("@")[0] ?? "Coach"
  const totalGames = profile?.total_games ?? 0
  const wins = profile?.wins ?? 0
  const eloRating = profile?.elo_rating ?? 1000
  const winRate = formatWinRate(wins, totalGames)

  const stats = [
    { label: "Parties", value: totalGames, icon: Target },
    { label: "Victoires", value: wins, icon: Trophy },
    { label: "Taux de victoire", value: winRate, icon: Swords },
    { label: "Classement", value: eloRating, icon: Crown },
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-white">Bienvenue, {username}!</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">Prêt pour ta prochaine partie ?</p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <EloBadge eloRating={eloRating} />
              <Link href="/profile" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-2xl border-white/10 bg-white/5 hover:bg-white/10")}>
                Voir mon profil
              </Link>
            </div>
          </div>
          {profileError ? (
            <p className="mt-4 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-300">
              Profil partiellement indisponible.
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardDescription>{stat.label}</CardDescription>
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl text-white">{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Jouer une partie</CardTitle>
              <CardDescription>Lance-toi !</CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardActions />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-white">📜 Historique</CardTitle>
              <CardDescription>
                {gamesError ? "Impossible de charger l'historique pour le moment." : "Tes 10 dernières parties terminées."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentGames.length ? (
                recentGames.map((game) => {
                  const result = getResultMeta(user.id, game)

                  return (
                    <GameHistoryCard
                      key={game.id}
                      href={`/game/${game.id}`}
                      resultLabel={result.label}
                      resultTone={result.tone}
                      opponentName={getOpponentName(user.id, game)}
                      timestampLabel={formatRelativeTime(game.created_at)}
                      modeLabel={GAME_MODES[game.mode].label}
                      modeIcon={GAME_MODES[game.mode].icon}
                      teamPreview={getTeamPreview(user.id, game)}
                    />
                  )
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center text-muted-foreground">
                  Aucune partie jouée. Lance ta première enchère !
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
