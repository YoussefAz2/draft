import { notFound, redirect } from "next/navigation"

import { AuctionView } from "@/components/game/auction-view"
import { WaitingRoomClient } from "@/components/game/waiting-room-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type Params = {
  id: string
}

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

  const { data: game, error } = await supabase.from("games").select("*").eq("id", id).maybeSingle()

  if (error || !game) {
    notFound()
  }

  if (game.host_id !== user.id && game.guest_id !== user.id) {
    redirect("/lobby")
  }

  const profileIds = [game.host_id, game.guest_id].filter((value): value is string => Boolean(value))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, elo_rating")
    .in("id", profileIds)

  if (game.status === "in_progress" || game.status === "completed") {
    const { data: gamePlayers, error: gamePlayersError } = await supabase
      .from("game_players")
      .select("id, game_id, order_index, status, winning_bid, won_by, player_id")
      .eq("game_id", game.id)
      .order("order_index", { ascending: true })

    if (gamePlayersError || !gamePlayers?.length) {
      notFound()
    }

    const playerIds = [...new Set(gamePlayers.map((entry) => entry.player_id))]
    const { data: players, error: playersError } = await supabase.from("players").select("*").in("id", playerIds)

    if (playersError || !players?.length) {
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

    return (
      <AuctionView
        currentUserId={user.id}
        initialGame={game}
        gamePlayers={hydratedGamePlayers}
        profiles={profiles ?? []}
      />
    )
  }

  return <WaitingRoomClient currentUserId={user.id} initialGame={game} profiles={profiles ?? []} />
}
