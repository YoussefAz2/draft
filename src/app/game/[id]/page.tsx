import { notFound, redirect } from "next/navigation"

import { AuctionView } from "@/components/game/auction-view"
import { ResultsView } from "@/components/game/results-view"
import { WaitingRoomClient } from "@/components/game/waiting-room-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AuctionProfile } from "@/lib/hooks/use-auction"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"

type Params = {
  id: string
}

type GameRow = Database["public"]["Tables"]["games"]["Row"]
type GamePlayerRow = Pick<
  Database["public"]["Tables"]["game_players"]["Row"],
  "id" | "game_id" | "order_index" | "status" | "winning_bid" | "won_by" | "player_id"
>
type PlayerRow = Database["public"]["Tables"]["players"]["Row"]

export default async function GamePage({
  params,
}: {
  params: Promise<Params>
}) {
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
              Ajoute les variables Supabase pour activer la synchronisation du salon.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?redirect=/game/${id}`)
  }

  let game: GameRow | null = null
  try {
    const gameResult = await supabase.from("games").select("*").eq("id", id).maybeSingle()
    game = gameResult.data

    if (gameResult.error || !game) {
      notFound()
    }
  } catch {
    notFound()
  }

  if (!game) {
    notFound()
  }

  if (game.host_id !== user.id && game.guest_id !== user.id) {
    redirect("/lobby")
  }

  const profileIds = [game.host_id, game.guest_id].filter((value): value is string => Boolean(value))
  let profiles: AuctionProfile[] = []

  try {
    const profilesResult = await supabase
      .from("profiles")
      .select("id, username, avatar_url, elo_rating")
      .in("id", profileIds)

    if (profilesResult.error) {
      notFound()
    }

    profiles = profilesResult.data ?? []
  } catch {
    notFound()
  }

  if (game.status === "in_progress" || game.status === "completed") {
    let gamePlayers: GamePlayerRow[] = []
    let players: PlayerRow[] = []

    try {
      const gamePlayersResult = await supabase
        .from("game_players")
        .select("id, game_id, order_index, status, winning_bid, won_by, player_id")
        .eq("game_id", game.id)
        .order("order_index", { ascending: true })

      if (gamePlayersResult.error || !gamePlayersResult.data?.length) {
        notFound()
      }

      gamePlayers = gamePlayersResult.data

      const playerIds = [...new Set(gamePlayers.map((entry) => entry.player_id))]
      const playersResult = await supabase.from("players").select("*").in("id", playerIds)

      if (playersResult.error || !playersResult.data?.length) {
        notFound()
      }

      players = playersResult.data
    } catch {
      notFound()
    }

    const playersMap = players.reduce<Record<number, (typeof players)[number]>>((accumulator, player) => {
      accumulator[player.id] = player
      return accumulator
    }, {})

    const hydratedGamePlayers = gamePlayers
      .map((entry) => {
        const player = playersMap[entry.player_id]
        if (!player) {
          return null
        }

        return {
          id: entry.id,
          game_id: entry.game_id,
          order_index: entry.order_index,
          status: entry.status,
          winning_bid: entry.winning_bid,
          won_by: entry.won_by,
          player,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

    if (game.status === "completed") {
      const hostTeam = hydratedGamePlayers
        .filter((entry) => entry.won_by === game.host_id && entry.winning_bid !== null)
        .map((entry) => ({
          player: entry.player,
          bidAmount: entry.winning_bid ?? 0,
          boughtBy: entry.won_by ?? "",
        }))
      const guestTeam = hydratedGamePlayers
        .filter((entry) => entry.won_by === game.guest_id && entry.winning_bid !== null)
        .map((entry) => ({
          player: entry.player,
          bidAmount: entry.winning_bid ?? 0,
          boughtBy: entry.won_by ?? "",
        }))

      return (
        <ResultsView
          currentUserId={user.id}
          game={game}
          profiles={profiles}
          hostTeam={hostTeam}
          guestTeam={guestTeam}
        />
      )
    }

    return (
      <AuctionView
        currentUserId={user.id}
        initialGame={game}
        gamePlayers={hydratedGamePlayers}
        profiles={profiles}
      />
    )
  }

  return <WaitingRoomClient currentUserId={user.id} initialGame={game} profiles={profiles} />
}
