import { redirect } from "next/navigation"
import { BarChart3, ShieldMinus, ShieldPlus, Swords, Trophy } from "lucide-react"

import { ProfileUsernameForm } from "@/components/profile/profile-username-form"
import { EloBadge } from "@/components/profile/elo-badge"
import { GameHistoryCard } from "@/components/profile/game-history-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"
import { GAME_MODES } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { formatRelativeTime, formatWinRate, getInitials } from "@/lib/utils/profile"

type HistoryGame = Pick<
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

function getResultMeta(userId: string, game: HistoryGame) {
  if (!game.winner_id) {
    return { label: "Égalité", tone: "neutral" as const }
  }

  return game.winner_id === userId
    ? { label: "Victoire", tone: "success" as const }
    : { label: "Défaite", tone: "danger" as const }
}

function getOpponentName(userId: string, game: HistoryGame) {
  return userId === game.host_id ? game.guest?.username ?? "Adversaire" : game.host?.username ?? "Adversaire"
}

function getTeamPreview(userId: string, game: HistoryGame) {
  const names = game.game_players
    .filter((entry) => entry.won_by === userId)
    .map((entry) => entry.player?.short_name || entry.player?.name)
    .filter((value): value is string => Boolean(value))

  if (!names.length) {
    return "Aucun joueur remporté"
  }

  return names.length > 3 ? `${names.slice(0, 3).join(", ")}...` : names.join(", ")
}

export default async function ProfilePage() {
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  if (!isConfigured) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
              Supabase requis
            </Badge>
            <CardTitle className="text-3xl text-white">Configuration manquante</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY pour activer le profil joueur.
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
    redirect("/auth/login?redirect=/profile")
  }

  let profile = null
  let profileError: { message: string } | null = null
  let history: HistoryGame[] = []
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
        .order("created_at", { ascending: false }),
    ])

    profile = profileResult.data
    profileError = profileResult.error
      ? { message: profileResult.error.message }
      : null
    history = (gamesResult.data ?? []) as unknown as HistoryGame[]
    gamesError = gamesResult.error ? { message: gamesResult.error.message } : null
  } catch {
    profileError = { message: "Impossible de charger les données" }
    gamesError = { message: "Impossible de charger l'historique" }
  }

  const username = profile?.username ?? user.email?.split("@")[0] ?? "Coach"
  const eloRating = profile?.elo_rating ?? 1000
  const totalGames = profile?.total_games ?? 0
  const wins = profile?.wins ?? 0
  const losses = profile?.losses ?? 0
  const draws = profile?.draws ?? 0
  const winRate = formatWinRate(wins, totalGames)

  const stats = [
    { label: "Parties", value: totalGames, icon: BarChart3 },
    { label: "Victoires", value: wins, icon: Trophy },
    { label: "Défaites", value: losses, icon: ShieldMinus },
    { label: "Nuls", value: draws, icon: ShieldPlus },
    { label: "Winrate", value: winRate, icon: Swords },
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader className="space-y-5">
              <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 text-primary">Profil joueur</Badge>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary via-cyan-400 to-emerald-300 text-3xl font-black text-black">
                  {getInitials(username)}
                </div>
                <div className="space-y-3">
                  <div>
                    <CardTitle className="text-3xl text-white">{username}</CardTitle>
                    <CardDescription className="mt-1 text-base text-muted-foreground">
                      Profil compétitif, statistiques cumulées et historique complet.
                    </CardDescription>
                  </div>
                  <EloBadge eloRating={eloRating} />
                </div>
              </div>
              {profileError ? (
                <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                  Profil partiellement indisponible.
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              <ProfileUsernameForm initialUsername={username} />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Vue d’ensemble</CardTitle>
              <CardDescription>Progression actuelle et métriques clés du compte.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                        <Icon className="size-5" />
                      </div>
                    </div>
                    <p className="mt-4 text-3xl font-black text-white">{stat.value}</p>
                  </div>
                )
              })}
              <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 sm:col-span-2 xl:col-span-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Répartition des résultats</p>
                  <span className="text-sm font-semibold text-white">{wins}W · {losses}L · {draws}D</span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="flex h-full">
                    <div className="bg-emerald-400" style={{ width: `${totalGames ? (wins / totalGames) * 100 : 0}%` }} />
                    <div className="bg-slate-300" style={{ width: `${totalGames ? (draws / totalGames) * 100 : 0}%` }} />
                    <div className="bg-rose-400" style={{ width: `${totalGames ? (losses / totalGames) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-400" />Victoires</span>
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-slate-300" />Nuls</span>
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-rose-400" />Défaites</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Historique complet</CardTitle>
            <CardDescription>
              {gamesError ? "Impossible de charger l’historique pour le moment." : `${history.length} parties terminées retrouvées.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.length ? (
              history.map((game) => {
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
              <div className={cn("rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-10 text-center text-muted-foreground")}> 
                Aucune partie terminée pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
