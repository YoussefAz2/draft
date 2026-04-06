import Link from "next/link"

import { EloBadge } from "@/components/profile/elo-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { formatWinRate, getInitials } from "@/lib/utils/profile"

type LeaderboardProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username" | "avatar_url" | "elo_rating" | "wins" | "losses" | "draws" | "total_games"
>

const podiumStyles: Record<number, string> = {
  1: "border-yellow-400/20 bg-yellow-400/10",
  2: "border-slate-300/20 bg-slate-300/10",
  3: "border-amber-500/20 bg-amber-500/10",
}

const podiumTextStyles: Record<number, string> = {
  1: "text-yellow-200",
  2: "text-slate-100",
  3: "text-amber-200",
}

function normalizeProfile(profile: LeaderboardProfile) {
  const wins = profile.wins ?? 0
  const losses = profile.losses ?? 0
  const draws = profile.draws ?? 0
  const totalGames = profile.total_games ?? 0
  const eloRating = profile.elo_rating ?? 1000

  return {
    ...profile,
    wins,
    losses,
    draws,
    totalGames,
    eloRating,
    winRate: formatWinRate(wins, totalGames),
  }
}

function LeaderboardRow({
  profile,
  rank,
  isCurrentUser,
}: {
  profile: ReturnType<typeof normalizeProfile>
  rank: number
  isCurrentUser: boolean
}) {
  return (
    <li
      className={cn(
        "rounded-2xl border border-white/10 bg-black/20 p-4 transition-colors",
        podiumStyles[rank],
        isCurrentUser && "border-emerald-400/30 bg-emerald-400/10 ring-1 ring-emerald-400/20",
      )}
    >
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-16 shrink-0">
            <p className={cn("text-2xl font-black text-white", podiumTextStyles[rank])}>#{rank}</p>
          </div>
          <Avatar className="size-12 ring-1 ring-white/10">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
            <AvatarFallback className="bg-white/10 text-white">{getInitials(profile.username)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-white">{profile.username}</p>
              {isCurrentUser ? (
                <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">Toi</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {profile.wins}V · {profile.losses}D · {profile.draws}N
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <EloBadge eloRating={profile.eloRating} className="w-fit" />
          <div className="grid min-w-[180px] grid-cols-3 gap-3 text-right text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Wins</p>
              <p className="mt-1 font-semibold text-white">{profile.wins}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Losses</p>
              <p className="mt-1 font-semibold text-white">{profile.losses}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Winrate</p>
              <p className="mt-1 font-semibold text-white">{profile.winRate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden grid-cols-[80px_minmax(0,1.3fr)_minmax(0,1.05fr)_80px_80px_110px] items-center gap-4 lg:grid">
        <div className="flex items-center gap-3">
          <p className={cn("text-2xl font-black text-white", podiumTextStyles[rank])}>#{rank}</p>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-12 ring-1 ring-white/10">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
            <AvatarFallback className="bg-white/10 text-white">{getInitials(profile.username)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-white">{profile.username}</p>
              {isCurrentUser ? (
                <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">Toi</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {profile.wins}V · {profile.losses}D · {profile.draws}N
            </p>
          </div>
        </div>
        <div>
          <EloBadge eloRating={profile.eloRating} className="w-fit" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{profile.wins}</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{profile.losses}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{profile.winRate}</p>
        </div>
      </div>
    </li>
  )
}

export default async function LeaderboardPage() {
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
              Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY pour activer le classement.
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

  let leaderboard: LeaderboardProfile[] = []
  let leaderboardError: { message: string } | null = null
  let currentUserProfile: LeaderboardProfile | null = null
  let currentUserRank: number | null = null

  try {
    const [leaderboardResult, currentUserResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, avatar_url, elo_rating, wins, losses, draws, total_games")
        .gt("total_games", 0)
        .order("elo_rating", { ascending: false })
        .limit(50),
      user
        ? supabase
            .from("profiles")
            .select("id, username, avatar_url, elo_rating, wins, losses, draws, total_games")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    leaderboard = leaderboardResult.data ?? []
    leaderboardError = leaderboardResult.error ? { message: leaderboardResult.error.message } : null
    currentUserProfile = currentUserResult.data
    if (!leaderboardError && currentUserResult.error) {
      leaderboardError = { message: currentUserResult.error.message }
    }

    if (currentUserResult.data && (currentUserResult.data.total_games ?? 0) > 0) {
      const rankResult = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("total_games", 0)
        .gt("elo_rating", currentUserResult.data.elo_rating ?? 1000)

      if (rankResult.error) {
        leaderboardError = leaderboardError ?? { message: rankResult.error.message }
      } else {
        currentUserRank = (rankResult.count ?? 0) + 1
      }
    }
  } catch {
    leaderboardError = { message: "Impossible de charger le classement." }
  }

  if (!leaderboard.length && !leaderboardError) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="space-y-3">
            <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 text-primary">
              Classement compétitif
            </Badge>
            <h1 className="text-4xl font-semibold text-white">🏆 Classement</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Les meilleurs coachs du Draft
            </p>
          </div>
          <div className="mt-8 rounded-[2rem] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
            <p className="text-lg font-medium text-white">
              Aucun coach n&apos;a encore joué. Sois le premier à apparaître au classement !
            </p>
            <Link
              href="/lobby"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-6 inline-flex rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)]",
              )}
            >
              Rejoindre le lobby
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const normalizedLeaderboard = leaderboard.map((profile, index) => ({
    profile: normalizeProfile(profile),
    rank: index + 1,
  }))
  const normalizedCurrentUser = currentUserProfile ? normalizeProfile(currentUserProfile) : null
  const currentUserInTop50 = Boolean(
    user && normalizedLeaderboard.some(({ profile }) => profile.id === user.id),
  )
  const showCurrentUserCard = Boolean(
    user &&
      normalizedCurrentUser &&
      !currentUserInTop50 &&
      ((normalizedCurrentUser.totalGames > 0 && (currentUserRank ?? 0) > 50) ||
        normalizedCurrentUser.totalGames === 0),
  )

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="space-y-3">
            <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 text-primary">
              Classement compétitif
            </Badge>
            <h1 className="text-4xl font-semibold text-white">🏆 Classement</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Les meilleurs coachs du Draft
            </p>
          </div>
          {leaderboardError ? (
            <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
              Une partie du classement est temporairement indisponible.
            </p>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:p-6">
          <div className="mb-4 hidden grid-cols-[80px_minmax(0,1.3fr)_minmax(0,1.05fr)_80px_80px_110px] items-center gap-4 px-4 text-xs uppercase tracking-[0.24em] text-muted-foreground lg:grid">
            <span>Rang</span>
            <span>Coach</span>
            <span>ELO</span>
            <span className="text-center">Wins</span>
            <span className="text-center">Losses</span>
            <span className="text-right">Winrate</span>
          </div>

          <ol className="space-y-3">
            {normalizedLeaderboard.map(({ profile, rank }) => (
              <LeaderboardRow
                key={profile.id}
                profile={profile}
                rank={rank}
                isCurrentUser={profile.id === user?.id}
              />
            ))}
          </ol>
        </section>

        {showCurrentUserCard && normalizedCurrentUser ? (
          <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/5 p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <Badge className="w-fit border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
                  Ta position
                </Badge>
                <div className="flex items-center gap-4">
                  <Avatar className="size-14 ring-1 ring-emerald-400/20">
                    <AvatarImage
                      src={normalizedCurrentUser.avatar_url ?? undefined}
                      alt={normalizedCurrentUser.username}
                    />
                    <AvatarFallback className="bg-emerald-400/10 text-emerald-100">
                      {getInitials(normalizedCurrentUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-2xl font-semibold text-white">{normalizedCurrentUser.username}</p>
                    <p className="text-sm text-emerald-100/80">
                      {normalizedCurrentUser.totalGames > 0 && currentUserRank
                        ? `Rang #${currentUserRank}`
                        : "Non classé pour le moment"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <EloBadge eloRating={normalizedCurrentUser.eloRating} className="w-fit" />
                <p className="text-sm text-muted-foreground">
                  {normalizedCurrentUser.wins}V · {normalizedCurrentUser.losses}D ·{" "}
                  {normalizedCurrentUser.draws}N · {normalizedCurrentUser.winRate}
                </p>
                {normalizedCurrentUser.totalGames === 0 ? (
                  <Link
                    href="/lobby"
                    className={cn(buttonVariants({ size: "lg" }), "rounded-2xl")}
                  >
                    Jouer maintenant
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
