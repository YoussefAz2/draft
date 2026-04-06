"use server"

import { revalidatePath } from "next/cache"

import { GAME_DEFAULTS, GAME_MODES, type GameConfig, type GameMode } from "@/lib/types/game"
import { GAME_ROOM_CODE_LENGTH } from "@/lib/constants/game"
import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"

type GameInsert = Database["public"]["Tables"]["games"]["Insert"]
type GamePlayerInsert = Database["public"]["Tables"]["game_players"]["Insert"]
type GameUpdate = Database["public"]["Tables"]["games"]["Update"]
type PlayerModeTag = Database["public"]["Tables"]["players"]["Row"]["mode_tags"][number]

type PlayerRole = "host" | "guest"

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const VALID_ROOM_CODE = /^[A-Z0-9]{6}$/
const ALLOWED_BUDGETS = [150, 200, 250, 300, 500] as const
const ALLOWED_TEAM_SIZES = [3, 5, 7] as const
const VALID_GAME_MODES = Object.keys(GAME_MODES) as GameMode[]
const GAME_MODE_TAGS: Partial<Record<GameMode, PlayerModeTag>> = {
  star_players: "star_players",
  legends: "legends",
  future_stars: "future_stars",
  africa_only: "africa_only",
  low_budget: "low_budget",
}

function requireServerEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Configuration Supabase incomplète.")
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY est requis pour le lobby.")
  }
}

async function requireAuthenticatedUser() {
  requireServerEnv()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Authentification requise.")
  }

  return user
}

function getSupabaseAdminOrThrow() {
  requireServerEnv()
  return createSupabaseAdmin()
}

function touchGamePaths(gameId: string) {
  revalidatePath("/dashboard")
  revalidatePath("/lobby")
  revalidatePath(`/game/${gameId}`)
}

function generateRoomCode() {
  let code = ""

  for (let index = 0; index < GAME_ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }

  return code
}

async function createUniqueRoomCode() {
  const supabase = getSupabaseAdminOrThrow()

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const roomCode = generateRoomCode()
    const { data: existingRoom, error } = await supabase
      .from("games")
      .select("id")
      .eq("room_code", roomCode)
      .maybeSingle()

    if (error) {
      throw new Error("Impossible de vérifier le code du salon.")
    }

    if (!existingRoom) {
      return roomCode
    }
  }

  throw new Error("Impossible de générer un code de salon unique.")
}

function normalizeJoinCode(code: string) {
  return code.trim().toUpperCase()
}

function normalizeConfig(config: GameConfig): GameConfig {
  if (!VALID_GAME_MODES.includes(config.mode)) {
    throw new Error("Mode de jeu invalide.")
  }

  if (!ALLOWED_BUDGETS.includes(config.budget as (typeof ALLOWED_BUDGETS)[number])) {
    throw new Error("Budget invalide.")
  }

  if (!ALLOWED_TEAM_SIZES.includes(config.teamSize as (typeof ALLOWED_TEAM_SIZES)[number])) {
    throw new Error("Taille d'équipe invalide.")
  }

  return {
    mode: config.mode,
    budget: config.budget,
    teamSize: config.teamSize,
  }
}

async function getGameParticipantState(gameId: string, userId: string) {
  const supabase = getSupabaseAdminOrThrow()
  const { data: game, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle()

  if (error || !game) {
    throw new Error("Salon introuvable.")
  }

  const role: PlayerRole | null = game.host_id === userId ? "host" : game.guest_id === userId ? "guest" : null

  if (!role) {
    throw new Error("Accès refusé à ce salon.")
  }

  return { game, role, supabase }
}

function shuffleIds<T>(values: T[]) {
  const copy = [...values]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }

  return copy
}

export async function createPrivateGame(config: GameConfig) {
  const user = await requireAuthenticatedUser()
  const supabase = getSupabaseAdminOrThrow()
  const normalizedConfig = normalizeConfig(config)
  const roomCode = await createUniqueRoomCode()

  const payload: GameInsert = {
    host_id: user.id,
    mode: normalizedConfig.mode,
    budget: normalizedConfig.budget,
    team_size: normalizedConfig.teamSize,
    status: "waiting",
    room_code: roomCode,
  }

  const { data: game, error } = await supabase.from("games").insert(payload).select("id, room_code").single()

  if (error || !game) {
    throw new Error("Impossible de créer le salon privé.")
  }

  touchGamePaths(game.id)

  return {
    gameId: game.id,
    roomCode: game.room_code,
  }
}

export async function joinGameByCode(code: string) {
  const user = await requireAuthenticatedUser()
  const supabase = getSupabaseAdminOrThrow()
  const normalizedCode = normalizeJoinCode(code)

  if (!VALID_ROOM_CODE.test(normalizedCode)) {
    throw new Error("Le code doit contenir exactement 6 caractères alphanumériques.")
  }

  const { data: game, error } = await supabase
    .from("games")
    .select("id, host_id")
    .eq("room_code", normalizedCode)
    .eq("status", "waiting")
    .is("guest_id", null)
    .maybeSingle()

  if (error || !game) {
    throw new Error("Salon introuvable ou déjà plein.")
  }

  if (game.host_id === user.id) {
    throw new Error("Tu ne peux pas rejoindre ton propre salon.")
  }

  const { data: joinedGame, error: joinError } = await supabase
    .from("games")
    .update({ guest_id: user.id, status: "ready" })
    .eq("id", game.id)
    .eq("status", "waiting")
    .is("guest_id", null)
    .select("id")
    .maybeSingle()

  if (joinError || !joinedGame) {
    throw new Error("Le salon vient d'être rejoint par un autre joueur.")
  }

  touchGamePaths(joinedGame.id)

  return {
    gameId: joinedGame.id,
  }
}

export async function findOrCreateQuickMatch() {
  const user = await requireAuthenticatedUser()
  const supabase = getSupabaseAdminOrThrow()

  const { data: ownOpenGame } = await supabase
    .from("games")
    .select("id, guest_id, status")
    .eq("host_id", user.id)
    .is("room_code", null)
    .in("status", ["waiting", "ready"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ownOpenGame) {
    return {
      gameId: ownOpenGame.id,
      matched: Boolean(ownOpenGame.guest_id) || ownOpenGame.status === "ready",
      created: false,
    }
  }

  const { data: existingGame } = await supabase
    .from("games")
    .select("id")
    .eq("status", "waiting")
    .is("room_code", null)
    .is("guest_id", null)
    .neq("host_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingGame) {
    const { data: joinedGame, error: joinError } = await supabase
      .from("games")
      .update({ guest_id: user.id, status: "ready" })
      .eq("id", existingGame.id)
      .eq("status", "waiting")
      .is("guest_id", null)
      .select("id")
      .maybeSingle()

    if (joinedGame && !joinError) {
      touchGamePaths(joinedGame.id)

      return {
        gameId: joinedGame.id,
        matched: true,
        created: false,
      }
    }
  }

  const payload: GameInsert = {
    host_id: user.id,
    mode: "star_players",
    budget: GAME_DEFAULTS.BUDGET,
    team_size: GAME_DEFAULTS.TEAM_SIZE,
    status: "waiting",
    room_code: null,
  }

  const { data: newGame, error } = await supabase.from("games").insert(payload).select("id").single()

  if (error || !newGame) {
    throw new Error("Impossible de lancer le matchmaking rapide.")
  }

  touchGamePaths(newGame.id)

  return {
    gameId: newGame.id,
    matched: false,
    created: true,
  }
}

export async function setPlayerReady(gameId: string) {
  const user = await requireAuthenticatedUser()
  const { game, role, supabase } = await getGameParticipantState(gameId, user.id)

  if (!game.guest_id) {
    throw new Error("En attente d'un deuxième joueur.")
  }

  if (!["waiting", "ready"].includes(game.status)) {
    throw new Error("Le salon n'accepte plus les changements de ready.")
  }

  if (game.status === "waiting") {
    const { error } = await supabase.from("games").update({ status: "ready" }).eq("id", gameId)

    if (error) {
      throw new Error("Impossible d'actualiser le salon.")
    }
  }

  touchGamePaths(gameId)

  return {
    role,
    status: game.status === "waiting" ? "ready" : game.status,
  }
}

export async function initializeGame(gameId: string) {
  const user = await requireAuthenticatedUser()
  const { game, role, supabase } = await getGameParticipantState(gameId, user.id)

  if (role !== "host") {
    throw new Error("Seul l'hôte peut lancer la partie.")
  }

  if (!game.guest_id) {
    throw new Error("Un adversaire est requis pour lancer la partie.")
  }

  if (!["waiting", "ready"].includes(game.status)) {
    throw new Error("La partie a déjà été lancée ou annulée.")
  }

  const { count, error: existingGamePlayersError } = await supabase
    .from("game_players")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)

  if (existingGamePlayersError) {
    throw new Error("Impossible de vérifier l'état de la partie.")
  }

  if ((count ?? 0) > 0) {
    throw new Error("La partie a déjà été initialisée.")
  }

  const totalPlayers = game.team_size * 2 + 3
  const totalRounds = game.team_size * 2
  const modeTag = GAME_MODE_TAGS[game.mode]

  let playerQuery = supabase
    .from("players")
    .select("id")
    .order("overall_rating", { ascending: false })
    .limit(Math.max(totalPlayers * 2, totalPlayers))

  if (modeTag) {
    playerQuery = playerQuery.contains("mode_tags", [modeTag])
  }

  const { data: players, error: playersError } = await playerQuery

  if (playersError || !players?.length) {
    throw new Error("Impossible de récupérer la liste des joueurs.")
  }

  if (players.length < totalPlayers) {
    throw new Error("Pas assez de joueurs disponibles pour ce mode.")
  }

  const selectedPlayers = shuffleIds(players).slice(0, totalPlayers)
  const gamePlayers: GamePlayerInsert[] = selectedPlayers.map((player, index) => ({
    game_id: gameId,
    player_id: player.id,
    order_index: index + 1,
    status: "pending",
  }))

  const { error: insertError } = await supabase.from("game_players").insert(gamePlayers)

  if (insertError) {
    throw new Error("Impossible d'initialiser les joueurs de la partie.")
  }

  const bidTimerEnd = new Date(Date.now() + GAME_DEFAULTS.BID_TIMER_SECONDS * 1000).toISOString()
  const initialGameState: GameUpdate = {
    status: "in_progress",
    current_round: 1,
    total_rounds: totalRounds,
    host_budget_remaining: game.budget,
    guest_budget_remaining: game.budget,
    current_player_id: selectedPlayers[0]?.id ?? null,
    current_bid: 0,
    current_bidder_id: null,
    bid_timer_end: bidTimerEnd,
  }

  const { error: updateError } = await supabase.from("games").update(initialGameState).eq("id", gameId)

  if (updateError) {
    throw new Error("Impossible de lancer la partie.")
  }

  touchGamePaths(gameId)

  return {
    gameId,
  }
}

export async function cancelGame(gameId: string) {
  const user = await requireAuthenticatedUser()
  const { game, role, supabase } = await getGameParticipantState(gameId, user.id)

  if (role !== "host") {
    throw new Error("Seul l'hôte peut annuler ce salon.")
  }

  if (!["waiting", "ready"].includes(game.status)) {
    throw new Error("Ce salon ne peut plus être annulé.")
  }

  const { error } = await supabase.from("games").update({ status: "cancelled" }).eq("id", gameId)

  if (error) {
    throw new Error("Impossible d'annuler le salon.")
  }

  touchGamePaths(gameId)

  return {
    gameId,
    status: "cancelled" as const,
  }
}

export async function leaveGame(gameId: string) {
  const user = await requireAuthenticatedUser()
  const { game, role, supabase } = await getGameParticipantState(gameId, user.id)

  if (!["waiting", "ready"].includes(game.status)) {
    throw new Error("Ce salon ne peut plus être quitté.")
  }

  const nextState: GameUpdate =
    role === "host"
      ? { status: "cancelled" }
      : {
          guest_id: null,
          guest_budget_remaining: null,
          status: "waiting",
        }

  const { error } = await supabase.from("games").update(nextState).eq("id", gameId)

  if (error) {
    throw new Error("Impossible de quitter le salon.")
  }

  touchGamePaths(gameId)

  return {
    gameId,
    role,
    status: role === "host" ? "cancelled" : "waiting",
  }
}
