"use server"

import { revalidatePath } from "next/cache"

import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"
import { calculateCategoryBonus, calculateTeamScore } from "@/lib/utils/scoring"


type GameRow = Database["public"]["Tables"]["games"]["Row"]
type GameUpdate = Database["public"]["Tables"]["games"]["Update"]
type GamePlayerRow = Database["public"]["Tables"]["game_players"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
type PlayerRow = Database["public"]["Tables"]["players"]["Row"]

function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configuration Supabase incomplète.")
  }

  return createSupabaseAdmin()
}

async function requireAuthenticatedParticipant(gameId: string) {
  const serverClient = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser()

  if (authError || !user) {
    throw new Error("Authentification requise.")
  }

  const admin = getAdminClient()
  const { data: game, error } = await admin.from("games").select("*").eq("id", gameId).maybeSingle()

  if (error || !game) {
    throw new Error("Partie introuvable.")
  }

  const role = game.host_id === user.id ? "host" : game.guest_id === user.id ? "guest" : null

  if (!role) {
    throw new Error("Accès refusé à cette partie.")
  }

  return {
    admin,
    user,
    game,
    role,
  }
}

function touchGamePaths(gameId: string) {
  revalidatePath(`/game/${gameId}`)
  revalidatePath("/dashboard")
}

async function getGamePlayerOrThrow(admin: ReturnType<typeof createSupabaseAdmin>, gamePlayerId: number) {
  const { data: gamePlayer, error } = await admin.from("game_players").select("*").eq("id", gamePlayerId).maybeSingle()

  if (error || !gamePlayer) {
    throw new Error("Joueur de partie introuvable.")
  }

  return gamePlayer
}

export async function recordPlayerSold(gameId: string, gamePlayerId: number, winnerId: string, amount: number) {
  const { admin, game, role } = await requireAuthenticatedParticipant(gameId)

  if (role !== "host") {
    throw new Error("Seul l'hôte peut clôturer le round.")
  }

  const gamePlayer = await getGamePlayerOrThrow(admin, gamePlayerId)

  if (gamePlayer.game_id !== game.id) {
    throw new Error("Round invalide pour cette partie.")
  }

  const hostBudgetRemaining = game.host_id === winnerId
    ? Math.max((game.host_budget_remaining ?? game.budget) - amount, 0)
    : game.host_budget_remaining ?? game.budget
  const guestBudgetRemaining = game.guest_id === winnerId
    ? Math.max((game.guest_budget_remaining ?? game.budget) - amount, 0)
    : game.guest_budget_remaining ?? game.budget

  const { error: gamePlayerError } = await admin
    .from("game_players")
    .update({ status: "sold", won_by: winnerId, winning_bid: amount })
    .eq("id", gamePlayerId)

  if (gamePlayerError) {
    throw new Error("Impossible d'enregistrer la vente.")
  }

  const gameUpdate: GameUpdate = {
    current_bid: 0,
    current_bidder_id: null,
    host_budget_remaining: hostBudgetRemaining,
    guest_budget_remaining: guestBudgetRemaining,
    bid_timer_end: null,
  }

  const { error: gameError } = await admin.from("games").update(gameUpdate).eq("id", gameId)

  if (gameError) {
    throw new Error("Impossible de mettre à jour les budgets.")
  }

  const { error: bidError } = await admin.from("bids").insert({
    game_id: gameId,
    game_player_id: gamePlayerId,
    bidder_id: winnerId,
    amount,
  })

  if (bidError) {
    throw new Error("Impossible d'enregistrer l'enchère gagnante.")
  }

  touchGamePaths(gameId)

  return {
    hostBudgetRemaining,
    guestBudgetRemaining,
  }
}

export async function recordPlayerUnsold(gameId: string, gamePlayerId: number) {
  const { admin, game, role } = await requireAuthenticatedParticipant(gameId)

  if (role !== "host") {
    throw new Error("Seul l'hôte peut clôturer le round.")
  }

  const gamePlayer = await getGamePlayerOrThrow(admin, gamePlayerId)

  if (gamePlayer.game_id !== game.id) {
    throw new Error("Round invalide pour cette partie.")
  }

  const { error: gamePlayerError } = await admin
    .from("game_players")
    .update({ status: "unsold", won_by: null, winning_bid: null })
    .eq("id", gamePlayerId)

  if (gamePlayerError) {
    throw new Error("Impossible d'enregistrer le joueur non vendu.")
  }

  const { error: gameError } = await admin
    .from("games")
    .update({ current_bid: 0, current_bidder_id: null, bid_timer_end: null })
    .eq("id", gameId)

  if (gameError) {
    throw new Error("Impossible d'actualiser la partie.")
  }

  touchGamePaths(gameId)

  return { success: true }
}

export async function advanceRound(gameId: string) {
  const { admin, game, role } = await requireAuthenticatedParticipant(gameId)

  if (role !== "host") {
    throw new Error("Seul l'hôte peut avancer le round.")
  }

  const nextRound = (game.current_round ?? 0) + 1
  const totalRounds = game.total_rounds ?? 0

  if (nextRound > totalRounds) {
    return {
      nextRound: null,
      currentPlayerId: null,
    }
  }

  const { data: nextGamePlayer, error: nextPlayerError } = await admin
    .from("game_players")
    .select("id, player_id, order_index")
    .eq("game_id", gameId)
    .eq("order_index", nextRound)
    .maybeSingle()

  if (nextPlayerError || !nextGamePlayer) {
    throw new Error("Impossible de trouver le prochain round.")
  }

  const timerEnd = new Date(Date.now() + 10_000).toISOString()

  const { error: activateError } = await admin
    .from("game_players")
    .update({ status: "active" })
    .eq("id", nextGamePlayer.id)

  if (activateError) {
    throw new Error("Impossible d'activer le round suivant.")
  }

  const { error: gameError } = await admin
    .from("games")
    .update({
      current_round: nextRound,
      current_player_id: nextGamePlayer.player_id,
      current_bid: 0,
      current_bidder_id: null,
      bid_timer_end: timerEnd,
      status: "in_progress",
    })
    .eq("id", gameId)

  if (gameError) {
    throw new Error("Impossible d'avancer au round suivant.")
  }

  touchGamePaths(gameId)

  return {
    nextRound,
    currentPlayerId: nextGamePlayer.player_id,
    timerEnd,
  }
}

function buildPlayerMap(players: PlayerRow[]) {
  return players.reduce<Record<number, PlayerRow>>((accumulator, player) => {
    accumulator[player.id] = player
    return accumulator
  }, {})
}

function computeFinalScores(game: GameRow, gamePlayers: GamePlayerRow[], players: PlayerRow[]) {
  const playerMap = buildPlayerMap(players)
  const hostPlayers = gamePlayers
    .filter((entry) => entry.won_by === game.host_id)
    .map((entry) => playerMap[entry.player_id])
    .filter((entry): entry is PlayerRow => Boolean(entry))
  const guestPlayers = gamePlayers
    .filter((entry) => entry.won_by === game.guest_id)
    .map((entry) => playerMap[entry.player_id])
    .filter((entry): entry is PlayerRow => Boolean(entry))

  const hostScore = Number((calculateTeamScore(hostPlayers) + calculateCategoryBonus(hostPlayers)).toFixed(2))
  const guestScore = Number((calculateTeamScore(guestPlayers) + calculateCategoryBonus(guestPlayers)).toFixed(2))
  const winnerId = hostScore === guestScore ? null : hostScore > guestScore ? game.host_id : game.guest_id

  return { hostScore, guestScore, winnerId }
}

async function updateProfilesAfterGame(
  admin: ReturnType<typeof createSupabaseAdmin>,
  hostId: string,
  guestId: string | null,
  winnerId: string | null,
) {
  const profileIds = [hostId, guestId].filter((value): value is string => Boolean(value))
  if (!profileIds.length) {
    return
  }

  const { data: profiles, error } = await admin.from("profiles").select("*").in("id", profileIds)
  if (error || !profiles) {
    return
  }

  await Promise.all(
    profiles.map(async (profile: ProfileRow) => {
      const payload = {
        total_games: (profile.total_games ?? 0) + 1,
        wins: (profile.wins ?? 0) + (profile.id === winnerId ? 1 : 0),
      }

      await admin.from("profiles").update(payload).eq("id", profile.id)
    }),
  )
}

export async function endGame(gameId: string) {
  const { admin, game, role } = await requireAuthenticatedParticipant(gameId)

  if (role !== "host") {
    throw new Error("Seul l'hôte peut terminer la partie.")
  }

  const { data: gamePlayers, error: gamePlayersError } = await admin
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)

  if (gamePlayersError || !gamePlayers) {
    throw new Error("Impossible de récupérer les joueurs de la partie.")
  }

  const playerIds = [...new Set(gamePlayers.map((entry) => entry.player_id))]
  const { data: players, error: playersError } = await admin.from("players").select("*").in("id", playerIds)

  if (playersError || !players) {
    throw new Error("Impossible de calculer les scores finaux.")
  }

  const { hostScore, guestScore, winnerId } = computeFinalScores(game, gamePlayers, players)

  const { error: updateError } = await admin
    .from("games")
    .update({
      status: "completed",
      current_player_id: null,
      current_bid: 0,
      current_bidder_id: null,
      bid_timer_end: null,
      winner_id: winnerId,
      host_score: hostScore,
      guest_score: guestScore,
    })
    .eq("id", gameId)

  if (updateError) {
    throw new Error("Impossible de terminer la partie.")
  }

  await updateProfilesAfterGame(admin, game.host_id, game.guest_id, winnerId)
  touchGamePaths(gameId)

  return {
    winnerId,
    hostScore,
    guestScore,
  }
}
