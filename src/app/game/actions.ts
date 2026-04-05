"use server"

import { revalidatePath } from "next/cache"

import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"
import { calculateTeamScore, type SoldPlayer as ScoredSoldPlayer, type TeamScore } from "@/lib/utils/scoring"

type GameRow = Database["public"]["Tables"]["games"]["Row"]
type GameInsert = Database["public"]["Tables"]["games"]["Insert"]
type GameUpdate = Database["public"]["Tables"]["games"]["Update"]
type GamePlayerRow = Database["public"]["Tables"]["game_players"]["Row"]
type PlayerRow = Database["public"]["Tables"]["players"]["Row"]
type IncrementProfileStatsArgs = Database["public"]["Functions"]["increment_profile_stats"]["Args"]

type FinalizeGamePlayer = Pick<GamePlayerRow, "id" | "game_id" | "won_by" | "winning_bid" | "status"> & {
  player: PlayerRow | null
}

type FinalizeGameRecord = Pick<
  GameRow,
  | "id"
  | "status"
  | "host_id"
  | "guest_id"
  | "budget"
  | "mode"
  | "team_size"
  | "winner_id"
  | "host_score"
  | "guest_score"
  | "host_budget_remaining"
  | "guest_budget_remaining"
> & {
  game_players: FinalizeGamePlayer[]
}

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
  revalidatePath("/profile")
}

async function getGamePlayerOrThrow(admin: ReturnType<typeof createSupabaseAdmin>, gamePlayerId: number) {
  const { data: gamePlayer, error } = await admin.from("game_players").select("*").eq("id", gamePlayerId).maybeSingle()

  if (error || !gamePlayer) {
    throw new Error("Joueur de partie introuvable.")
  }

  return gamePlayer
}

function buildSoldTeam(entries: FinalizeGamePlayer[], ownerId: string | null): ScoredSoldPlayer[] {
  if (!ownerId) {
    return []
  }

  return entries
    .filter((entry) => entry.won_by === ownerId && entry.player && entry.winning_bid !== null)
    .map((entry) => ({
      player: entry.player as PlayerRow,
      bidAmount: entry.winning_bid ?? 0,
      boughtBy: entry.won_by ?? "",
    }))
}

async function applyProfileStats(
  admin: ReturnType<typeof createSupabaseAdmin>,
  args: IncrementProfileStatsArgs,
) {
  const { error } = await admin.rpc("increment_profile_stats", args)

  if (error) {
    throw new Error("Impossible de mettre à jour les statistiques du profil.")
  }
}

async function updateProfilesAfterFinalization(
  admin: ReturnType<typeof createSupabaseAdmin>,
  game: FinalizeGameRecord,
  winnerId: string | null,
) {
  if (!game.guest_id) {
    return
  }

  if (winnerId) {
    const loserId = winnerId === game.host_id ? game.guest_id : game.host_id

    await Promise.all([
      applyProfileStats(admin, {
        p_user_id: winnerId,
        p_win_increment: 1,
        p_loss_increment: 0,
        p_draw_increment: 0,
        p_elo_change: 25,
      }),
      applyProfileStats(admin, {
        p_user_id: loserId,
        p_win_increment: 0,
        p_loss_increment: 1,
        p_draw_increment: 0,
        p_elo_change: -25,
      }),
    ])

    return
  }

  await Promise.all([
    applyProfileStats(admin, {
      p_user_id: game.host_id,
      p_win_increment: 0,
      p_loss_increment: 0,
      p_draw_increment: 1,
      p_elo_change: 0,
    }),
    applyProfileStats(admin, {
      p_user_id: game.guest_id,
      p_win_increment: 0,
      p_loss_increment: 0,
      p_draw_increment: 1,
      p_elo_change: 0,
    }),
  ])
}

function determineWinnerId(game: Pick<FinalizeGameRecord, "host_id" | "guest_id">, hostScore: TeamScore, guestScore: TeamScore) {
  if (hostScore.totalScore > guestScore.totalScore) {
    return game.host_id
  }

  if (hostScore.totalScore < guestScore.totalScore) {
    return game.guest_id
  }

  return null
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

  const hostBudgetRemaining =
    game.host_id === winnerId
      ? Math.max((game.host_budget_remaining ?? game.budget) - amount, 0)
      : game.host_budget_remaining ?? game.budget
  const guestBudgetRemaining =
    game.guest_id === winnerId
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

  const { error: activateError } = await admin.from("game_players").update({ status: "active" }).eq("id", nextGamePlayer.id)

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

export async function finalizeGame(gameId: string) {
  const { admin, role } = await requireAuthenticatedParticipant(gameId)

  if (role !== "host") {
    throw new Error("Seul l'hôte peut terminer la partie.")
  }

  const { data, error } = await admin
    .from("games")
    .select(
      `
        id,
        status,
        host_id,
        guest_id,
        budget,
        mode,
        team_size,
        winner_id,
        host_score,
        guest_score,
        host_budget_remaining,
        guest_budget_remaining,
        game_players (
          id,
          game_id,
          won_by,
          winning_bid,
          status,
          player:players (*)
        )
      `,
    )
    .eq("id", gameId)
    .single()

  if (error || !data) {
    throw new Error("Impossible de récupérer les données finales de la partie.")
  }

  const game = data as unknown as FinalizeGameRecord

  if (!game.guest_id) {
    throw new Error("Un adversaire est requis pour finaliser la partie.")
  }

  const hostBudgetRemaining = game.host_budget_remaining ?? game.budget
  const guestBudgetRemaining = game.guest_budget_remaining ?? game.budget
  const hostTeam = buildSoldTeam(game.game_players, game.host_id)
  const guestTeam = buildSoldTeam(game.game_players, game.guest_id)
  const hostScore = calculateTeamScore(hostTeam, hostBudgetRemaining, game.budget)
  const guestScore = calculateTeamScore(guestTeam, guestBudgetRemaining, game.budget)
  const winnerId = determineWinnerId(game, hostScore, guestScore)

  if (game.status !== "completed") {
    const { error: updateError } = await admin
      .from("games")
      .update({
        status: "completed",
        current_player_id: null,
        current_bid: 0,
        current_bidder_id: null,
        bid_timer_end: null,
        winner_id: winnerId,
        host_score: hostScore.totalScore,
        guest_score: guestScore.totalScore,
      })
      .eq("id", gameId)

    if (updateError) {
      throw new Error("Impossible de terminer la partie.")
    }

    await updateProfilesAfterFinalization(admin, game, winnerId)
    touchGamePaths(gameId)
  }

  return {
    hostScore,
    guestScore,
    winnerId,
  }
}

export async function createRematch(gameId: string) {
  const { admin, game, user } = await requireAuthenticatedParticipant(gameId)

  if (game.status !== "completed") {
    throw new Error("La revanche est disponible uniquement après la fin de partie.")
  }

  if (!game.guest_id) {
    throw new Error("Un adversaire est requis pour créer une revanche.")
  }

  const opponentId = game.host_id === user.id ? game.guest_id : game.host_id
  const payload: GameInsert = {
    host_id: user.id,
    guest_id: opponentId,
    mode: game.mode,
    budget: game.budget,
    team_size: game.team_size,
    status: "ready",
    room_code: null,
  }

  const { data, error } = await admin.from("games").insert(payload).select("id").single()

  if (error || !data) {
    throw new Error("Impossible de créer la revanche.")
  }

  touchGamePaths(data.id)

  return {
    gameId: data.id,
  }
}

export async function endGame(gameId: string) {
  return finalizeGame(gameId)
}
