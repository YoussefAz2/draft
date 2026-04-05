import { redirect } from "next/navigation"
import { Crown, Swords, Target, Trophy } from "lucide-react"

import { DashboardActions } from "@/components/dashboard/dashboard-actions"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { GAME_MODES } from "@/lib/types/game"

function getResultLabel(
  userId: string,
  game: { winner_id: string | null; status: string; host_id: string; guest_id: string | null },
) {
  if (game.status !== "completed") {
    return "En cours"
  }

  if (!game.winner_id) {
    return "Nul"
  }

  return game.winner_id === userId ? "Victoire" : "Défaite"
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

  const [{ data: profile, error: profileError }, { data: games, error: gamesError }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("games")
      .select("id, mode, status, created_at, room_code, winner_id, host_id, guest_id")
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const username = profile?.username ?? user.email?.split("@")[0] ?? "Coach"
  const totalGames = profile?.total_games ?? 0
  const wins = profile?.wins ?? 0
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
  const elo = profile?.elo_rating ?? 1000
  const recentGames = games ?? []

  const stats = [
    { label: "Parties jouées", value: totalGames, icon: Target },
    { label: "Victoires", value: wins, icon: Trophy },
    { label: "Winrate", value: `${winRate}%`, icon: Swords },
    { label: "ELO", value: elo, icon: Crown },
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
            Dashboard
          </Badge>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-white">Bienvenue, {username}! 👋</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Prépare ta prochaine enchère, surveille ta progression et retrouve tes dernières parties.
              </p>
            </div>
            {profileError ? (
              <p className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-300">
                Profil partiellement indisponible.
              </p>
            ) : null}
          </div>
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
              <CardDescription>
                Choisis ton format de matchmaking et lance une nouvelle enchère.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardActions />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Dernières parties</CardTitle>
              <CardDescription>
                {gamesError
                  ? "Impossible de charger l'historique pour le moment."
                  : "Tes 5 dernières sessions de draft."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentGames.length ? (
                recentGames.map((game, index) => (
                  <div key={game.id} className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-white">
                          {GAME_MODES[game.mode].icon} {GAME_MODES[game.mode].label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {game.created_at
                            ? new Intl.DateTimeFormat("fr-FR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(game.created_at))
                            : "Date indisponible"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full border border-white/10 bg-white/5">
                          {getResultLabel(user.id, game)}
                        </Badge>
                        <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                          {game.status}
                        </Badge>
                        {game.room_code ? (
                          <Badge variant="secondary" className="rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
                            Code {game.room_code}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {index < recentGames.length - 1 ? <Separator className="bg-white/10" /> : null}
                  </div>
                ))
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
