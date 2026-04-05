"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { toast } from "sonner"

import {
  advanceRound,
  finalizeGame,
  recordPlayerSold,
  recordPlayerUnsold,
} from "@/app/game/actions"
import { createSupabaseClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types/database"
import { GAME_DEFAULTS } from "@/lib/types/game"

export type AuctionGameRow = Database["public"]["Tables"]["games"]["Row"]
export type AuctionPlayer = Database["public"]["Tables"]["players"]["Row"]
export type AuctionProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username" | "avatar_url" | "elo_rating"
>

export interface AuctionGamePlayer {
  id: number
  game_id: string
  order_index: number
  status: Database["public"]["Tables"]["game_players"]["Row"]["status"]
  winning_bid: number | null
  won_by: string | null
  player: AuctionPlayer
}

export interface SoldPlayer {
  player: AuctionPlayer
  bidAmount: number
  boughtBy: string
}

export interface BidHistoryEntry {
  bidderId: string
  bidderName: string
  amount: number
  timestamp: number
}

export interface AuctionState {
  gameId: string
  currentRound: number
  totalRounds: number
  phase: "reveal" | "bidding" | "sold" | "unsold" | "game_over"
  currentPlayer: AuctionPlayer | null
  currentGamePlayerId: number | null
  currentBid: number
  currentBidder: string | null
  minimumBid: number
  timerEnd: number
  timerSeconds: number
  myBudget: number
  opponentBudget: number
  myTeam: SoldPlayer[]
  opponentTeam: SoldPlayer[]
  isHost: boolean
  myId: string
  opponentId: string
  opponentUsername: string
  connectedUserIds: string[]
  bidHistory: BidHistoryEntry[]
  roundLabel: string | null
  lastWinnerId: string | null
  lastSoldAmount: number | null
  disconnectDeadline: number | null
  gameStatus: AuctionGameRow["status"]
}

export interface UseAuctionOptions {
  initialGame: AuctionGameRow
  gamePlayers: AuctionGamePlayer[]
  profiles: AuctionProfile[]
}

type AuctionPresence = {
  user_id: string
  online_at: number
}

type BroadcastEnvelopeMap = {
  new_round: {
    round: number
    totalRounds: number
    gamePlayerId: number
    player: AuctionPlayer
    timerEnd: number
    triggeredAt: number
  }
  bid: {
    bidderId: string
    amount: number
    timestamp: number
    bidderName: string
  }
  pass: {
    bidderId: string
    timestamp: number
  }
  timer_update: {
    timerEnd: number
    reason: "new_round" | "bid" | "disconnect"
    timestamp: number
  }
  player_sold: {
    gamePlayerId: number
    playerId: number
    winnerId: string
    amount: number
    hostBudgetRemaining: number
    guestBudgetRemaining: number
    round: number
    timestamp: number
  }
  player_unsold: {
    gamePlayerId: number
    playerId: number
    round: number
    timestamp: number
  }
  budget_update: {
    hostBudgetRemaining: number
    guestBudgetRemaining: number
    timestamp: number
  }
  game_over: {
    winnerId: string | null
    hostScore: number
    guestScore: number
    timestamp: number
  }
}

type BroadcastEvent = keyof BroadcastEnvelopeMap

type InternalAuctionState = AuctionState & {
  hostBudgetRemaining: number
  guestBudgetRemaining: number
  passedBy: string[]
  hostUsername: string
  guestUsername: string
}

const AUTO_PASS_DISCONNECT_MS = 30_000
const REVEAL_DURATION_MS = 1_000
const ROUND_RESULT_PAUSE_MS = 2_000

function buildProfileMap(profiles: AuctionProfile[]) {
  return profiles.reduce<Record<string, AuctionProfile>>((accumulator, profile) => {
    accumulator[profile.id] = profile
    return accumulator
  }, {})
}

function buildInitialState(gameId: string, userId: string, options?: UseAuctionOptions): InternalAuctionState {
  const initialGame = options?.initialGame
  const profiles = options?.profiles ?? []
  const profileMap = buildProfileMap(profiles)
  const hostId = initialGame?.host_id ?? userId
  const guestId = initialGame?.guest_id ?? userId
  const isHost = hostId === userId
  const opponentId = isHost ? guestId : hostId
  const players = [...(options?.gamePlayers ?? [])].sort((left, right) => left.order_index - right.order_index)
  const soldPlayers = players.filter((entry) => entry.status === "sold" && entry.won_by && entry.winning_bid)
  const myTeam = soldPlayers
    .filter((entry) => entry.won_by === userId)
    .map((entry) => ({ player: entry.player, bidAmount: entry.winning_bid ?? 0, boughtBy: entry.won_by ?? "" }))
  const opponentTeam = soldPlayers
    .filter((entry) => entry.won_by === opponentId)
    .map((entry) => ({ player: entry.player, bidAmount: entry.winning_bid ?? 0, boughtBy: entry.won_by ?? "" }))
  const currentGamePlayer =
    players.find((entry) => entry.order_index === initialGame?.current_round) ??
    players.find((entry) => entry.player.id === initialGame?.current_player_id) ??
    null
  const currentPlayer = currentGamePlayer?.player ?? null
  const currentBid = initialGame?.current_bid ?? 0
  const minimumBid = Math.max(
    currentBid + GAME_DEFAULTS.MIN_BID_INCREMENT,
    currentPlayer?.base_price ?? GAME_DEFAULTS.MIN_BID_INCREMENT,
  )
  const timerEnd = initialGame?.bid_timer_end ? new Date(initialGame.bid_timer_end).getTime() : Date.now()

  return {
    gameId,
    currentRound: initialGame?.current_round ?? 1,
    totalRounds: initialGame?.total_rounds ?? Math.max(players.length, 1),
    phase:
      initialGame?.status === "completed"
        ? "game_over"
        : currentPlayer
          ? "reveal"
          : "game_over",
    currentPlayer,
    currentGamePlayerId: currentGamePlayer?.id ?? null,
    currentBid,
    currentBidder: initialGame?.current_bidder_id ?? null,
    minimumBid,
    timerEnd,
    timerSeconds: Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)),
    myBudget: isHost
      ? initialGame?.host_budget_remaining ?? initialGame?.budget ?? GAME_DEFAULTS.BUDGET
      : initialGame?.guest_budget_remaining ?? initialGame?.budget ?? GAME_DEFAULTS.BUDGET,
    opponentBudget: isHost
      ? initialGame?.guest_budget_remaining ?? initialGame?.budget ?? GAME_DEFAULTS.BUDGET
      : initialGame?.host_budget_remaining ?? initialGame?.budget ?? GAME_DEFAULTS.BUDGET,
    myTeam,
    opponentTeam,
    isHost,
    myId: userId,
    opponentId,
    opponentUsername: profileMap[opponentId]?.username ?? "Adversaire",
    connectedUserIds: [],
    bidHistory: [],
    roundLabel: null,
    lastWinnerId: null,
    lastSoldAmount: null,
    disconnectDeadline: null,
    gameStatus: initialGame?.status ?? "in_progress",
    hostBudgetRemaining: initialGame?.host_budget_remaining ?? initialGame?.budget ?? GAME_DEFAULTS.BUDGET,
    guestBudgetRemaining: initialGame?.guest_budget_remaining ?? initialGame?.budget ?? GAME_DEFAULTS.BUDGET,
    passedBy: [],
    hostUsername: profileMap[hostId]?.username ?? "Host",
    guestUsername: profileMap[guestId]?.username ?? "Guest",
  }
}

function minimumBidForPlayer(player: AuctionPlayer | null, currentBid: number) {
  return Math.max(currentBid + GAME_DEFAULTS.MIN_BID_INCREMENT, player?.base_price ?? GAME_DEFAULTS.MIN_BID_INCREMENT)
}


function getReserveNeededAfterPurchase(teamSize: number, currentTeamSize: number) {
  return Math.max(teamSize - currentTeamSize - 1, 0) * GAME_DEFAULTS.MIN_BID_INCREMENT
}

function canAffordAtAmount(amount: number, budget: number, teamSize: number, currentTeamSize: number) {
  return budget >= amount && budget - amount >= getReserveNeededAfterPurchase(teamSize, currentTeamSize)
}

function replaceTeamEntry(team: SoldPlayer[], soldPlayer: SoldPlayer) {
  return [...team, soldPlayer].sort((left, right) => right.player.overall_rating - left.player.overall_rating)
}

export function useAuction(gameId: string, userId: string, options?: UseAuctionOptions) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const teamSize = options?.initialGame.team_size ?? GAME_DEFAULTS.TEAM_SIZE
  const playersByOrder = useMemo(
    () => [...(options?.gamePlayers ?? [])].sort((left, right) => left.order_index - right.order_index),
    [options?.gamePlayers],
  )
  const gamePlayersMap = useMemo(
    () =>
      playersByOrder.reduce<Record<number, AuctionGamePlayer>>((accumulator, gamePlayer) => {
        accumulator[gamePlayer.id] = gamePlayer
        return accumulator
      }, {}),
    [playersByOrder],
  )
  const [state, setState] = useState<InternalAuctionState>(() => buildInitialState(gameId, userId, options))
  const channelRef = useRef<RealtimeChannel | null>(null)
  const stateRef = useRef(state)
  const finalizedRoundRef = useRef<number | null>(null)
  const revealTimeoutRef = useRef<number | null>(null)
  const resultTimeoutRef = useRef<number | null>(null)
  const disconnectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    setState(buildInitialState(gameId, userId, options))
  }, [gameId, options, userId])

  const participantName = useCallback(
    (participantId: string) => {
      if (participantId === options?.initialGame.host_id) {
        return stateRef.current.hostUsername
      }

      if (participantId === options?.initialGame.guest_id) {
        return stateRef.current.guestUsername
      }

      return "Joueur"
    },
    [options?.initialGame.guest_id, options?.initialGame.host_id],
  )

  const syncTimerView = useCallback(() => {
    setState((current) => ({
      ...current,
      timerSeconds: Math.max(0, Math.ceil((current.timerEnd - Date.now()) / 1000)),
    }))
  }, [])

  useEffect(() => {
    const interval = window.setInterval(syncTimerView, 250)
    return () => {
      window.clearInterval(interval)
    }
  }, [syncTimerView])

  const clearTimers = useCallback(() => {
    if (revealTimeoutRef.current) {
      window.clearTimeout(revealTimeoutRef.current)
      revealTimeoutRef.current = null
    }

    if (resultTimeoutRef.current) {
      window.clearTimeout(resultTimeoutRef.current)
      resultTimeoutRef.current = null
    }

    if (disconnectTimeoutRef.current) {
      window.clearTimeout(disconnectTimeoutRef.current)
      disconnectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const broadcast = useCallback(
    async <TEvent extends BroadcastEvent>(event: TEvent, payload: BroadcastEnvelopeMap[TEvent]) => {
      if (!channelRef.current) {
        return
      }

      await channelRef.current.send({ type: "broadcast", event, payload })
    },
    [],
  )

  const beginBiddingPhase = useCallback(() => {
    if (revealTimeoutRef.current) {
      window.clearTimeout(revealTimeoutRef.current)
    }

    revealTimeoutRef.current = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        phase: current.gameStatus === "completed" ? "game_over" : "bidding",
      }))
    }, REVEAL_DURATION_MS)
  }, [])

  const moveToNextRound = useCallback(async () => {
    const current = stateRef.current
    const nextRound = current.currentRound + 1

    if (!current.isHost) {
      return
    }

    if (nextRound > current.totalRounds) {
      const result = await finalizeGame(current.gameId)
      await broadcast("game_over", {
        winnerId: result.winnerId,
        hostScore: result.hostScore.totalScore,
        guestScore: result.guestScore.totalScore,
        timestamp: Date.now(),
      })
      return
    }

    const nextGamePlayer = playersByOrder.find((entry) => entry.order_index === nextRound)

    if (!nextGamePlayer) {
      const result = await finalizeGame(current.gameId)
      await broadcast("game_over", {
        winnerId: result.winnerId,
        hostScore: result.hostScore.totalScore,
        guestScore: result.guestScore.totalScore,
        timestamp: Date.now(),
      })
      return
    }

    const timerEnd = Date.now() + GAME_DEFAULTS.BID_TIMER_SECONDS * 1000
    await advanceRound(current.gameId)
    await broadcast("new_round", {
      round: nextRound,
      totalRounds: current.totalRounds,
      gamePlayerId: nextGamePlayer.id,
      player: nextGamePlayer.player,
      timerEnd,
      triggeredAt: Date.now(),
    })
    await broadcast("timer_update", {
      timerEnd,
      reason: "new_round",
      timestamp: Date.now(),
    })
  }, [broadcast, playersByOrder])

  const finalizeUnsold = useCallback(
    async (reasonLabel = "Joueur passé") => {
      const current = stateRef.current

      if (!current.isHost || !current.currentGamePlayerId || !current.currentPlayer) {
        return
      }

      if (finalizedRoundRef.current === current.currentRound) {
        return
      }

      finalizedRoundRef.current = current.currentRound
      await recordPlayerUnsold(current.gameId, current.currentGamePlayerId)
      await broadcast("player_unsold", {
        gamePlayerId: current.currentGamePlayerId,
        playerId: current.currentPlayer.id,
        round: current.currentRound,
        timestamp: Date.now(),
      })
      setState((previous) => ({
        ...previous,
        phase: "unsold",
        roundLabel: reasonLabel,
        passedBy: [],
      }))
      resultTimeoutRef.current = window.setTimeout(() => {
        finalizedRoundRef.current = null
        void moveToNextRound()
      }, ROUND_RESULT_PAUSE_MS)
    },
    [broadcast, moveToNextRound],
  )

  const finalizeSold = useCallback(
    async (winnerId: string, amount: number, reasonLabel = "Vendu") => {
      const current = stateRef.current

      if (!current.isHost || !current.currentGamePlayerId || !current.currentPlayer) {
        return
      }

      if (finalizedRoundRef.current === current.currentRound) {
        return
      }

      finalizedRoundRef.current = current.currentRound
      const result = await recordPlayerSold(current.gameId, current.currentGamePlayerId, winnerId, amount)
      await broadcast("player_sold", {
        gamePlayerId: current.currentGamePlayerId,
        playerId: current.currentPlayer.id,
        winnerId,
        amount,
        hostBudgetRemaining: result.hostBudgetRemaining,
        guestBudgetRemaining: result.guestBudgetRemaining,
        round: current.currentRound,
        timestamp: Date.now(),
      })
      await broadcast("budget_update", {
        hostBudgetRemaining: result.hostBudgetRemaining,
        guestBudgetRemaining: result.guestBudgetRemaining,
        timestamp: Date.now(),
      })
      setState((previous) => ({
        ...previous,
        phase: "sold",
        roundLabel: reasonLabel,
        lastWinnerId: winnerId,
        lastSoldAmount: amount,
        hostBudgetRemaining: result.hostBudgetRemaining,
        guestBudgetRemaining: result.guestBudgetRemaining,
        myBudget: previous.isHost ? result.hostBudgetRemaining : result.guestBudgetRemaining,
        opponentBudget: previous.isHost ? result.guestBudgetRemaining : result.hostBudgetRemaining,
        passedBy: [],
      }))
      resultTimeoutRef.current = window.setTimeout(() => {
        finalizedRoundRef.current = null
        void moveToNextRound()
      }, ROUND_RESULT_PAUSE_MS)
    },
    [broadcast, moveToNextRound],
  )

  const resolveForcedRound = useCallback(async () => {
    const current = stateRef.current

    if (!current.isHost || current.phase !== "bidding" || !current.currentPlayer || !options?.initialGame.guest_id) {
      return
    }

    const hostTeamSize = current.isHost ? current.myTeam.length : current.opponentTeam.length
    const guestTeamSize = current.isHost ? current.opponentTeam.length : current.myTeam.length
    const hostBudget = current.hostBudgetRemaining
    const guestBudget = current.guestBudgetRemaining
    const basePrice = current.currentPlayer.base_price
    const hostFull = hostTeamSize >= teamSize
    const guestFull = guestTeamSize >= teamSize
    const hostEligible = !hostFull && canAffordAtAmount(basePrice, hostBudget, teamSize, hostTeamSize)
    const guestEligible = !guestFull && canAffordAtAmount(basePrice, guestBudget, teamSize, guestTeamSize)

    if (!hostEligible && !guestEligible) {
      await finalizeUnsold("Aucun budget disponible")
      return
    }

    if (hostEligible && !guestEligible) {
      await finalizeSold(
        options.initialGame.host_id,
        guestFull ? GAME_DEFAULTS.MIN_BID_INCREMENT : basePrice,
        guestFull ? "Attribué automatiquement" : "Seul enchérisseur restant",
      )
      return
    }

    if (!hostEligible && guestEligible) {
      await finalizeSold(
        options.initialGame.guest_id,
        hostFull ? GAME_DEFAULTS.MIN_BID_INCREMENT : basePrice,
        hostFull ? "Attribué automatiquement" : "Seul enchérisseur restant",
      )
    }
  }, [finalizeSold, finalizeUnsold, options?.initialGame.guest_id, options?.initialGame.host_id, teamSize])

  useEffect(() => {
    if (state.phase !== "bidding") {
      return
    }

    void resolveForcedRound()
  }, [resolveForcedRound, state.phase])

  useEffect(() => {
    const channel = supabase.channel(`auction:${gameId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    })

    const syncPresence = () => {
      const presence = channel.presenceState<AuctionPresence>()
      const connectedUserIds = Object.values(presence)
        .flat()
        .map((entry) => entry.user_id)
        .filter(Boolean)

      setState((current) => ({
        ...current,
        connectedUserIds,
      }))
    }

    channel.on("presence", { event: "sync" }, syncPresence)
    channel.on("presence", { event: "join" }, syncPresence)
    channel.on("presence", { event: "leave" }, syncPresence)

    channel.on("broadcast", { event: "new_round" }, ({ payload }) => {
      const next = payload as BroadcastEnvelopeMap["new_round"]
      finalizedRoundRef.current = null
      setState((current) => ({
        ...current,
        currentRound: next.round,
        totalRounds: next.totalRounds,
        currentGamePlayerId: next.gamePlayerId,
        currentPlayer: next.player,
        currentBid: 0,
        currentBidder: null,
        minimumBid: minimumBidForPlayer(next.player, 0),
        timerEnd: next.timerEnd,
        timerSeconds: Math.max(0, Math.ceil((next.timerEnd - Date.now()) / 1000)),
        phase: "reveal",
        bidHistory: [],
        roundLabel: null,
        lastWinnerId: null,
        lastSoldAmount: null,
        passedBy: [],
        disconnectDeadline: null,
        gameStatus: "in_progress",
      }))
    })

    channel.on("broadcast", { event: "bid" }, ({ payload }) => {
      const next = payload as BroadcastEnvelopeMap["bid"]
      setState((current) => ({
        ...current,
        currentBid: next.amount,
        currentBidder: next.bidderId,
        minimumBid: minimumBidForPlayer(current.currentPlayer, next.amount),
        bidHistory: [
          ...current.bidHistory,
          {
            bidderId: next.bidderId,
            bidderName: next.bidderName,
            amount: next.amount,
            timestamp: next.timestamp,
          },
        ],
        passedBy: current.passedBy.filter((participantId) => participantId !== next.bidderId),
      }))
    })

    channel.on("broadcast", { event: "pass" }, ({ payload }) => {
      const next = payload as BroadcastEnvelopeMap["pass"]
      setState((current) => {
        if (current.passedBy.includes(next.bidderId)) {
          return current
        }

        return {
          ...current,
          passedBy: [...current.passedBy, next.bidderId],
        }
      })
    })

    channel.on("broadcast", { event: "timer_update" }, ({ payload }) => {
      const next = payload as BroadcastEnvelopeMap["timer_update"]
      setState((current) => ({
        ...current,
        timerEnd: next.timerEnd,
        timerSeconds: Math.max(0, Math.ceil((next.timerEnd - Date.now()) / 1000)),
      }))
    })

    channel.on("broadcast", { event: "budget_update" }, ({ payload }) => {
      const next = payload as BroadcastEnvelopeMap["budget_update"]
      setState((current) => ({
        ...current,
        hostBudgetRemaining: next.hostBudgetRemaining,
        guestBudgetRemaining: next.guestBudgetRemaining,
        myBudget: current.isHost ? next.hostBudgetRemaining : next.guestBudgetRemaining,
        opponentBudget: current.isHost ? next.guestBudgetRemaining : next.hostBudgetRemaining,
      }))
    })

    channel.on("broadcast", { event: "player_sold" }, ({ payload }) => {
      const next = payload as BroadcastEnvelopeMap["player_sold"]
      const soldGamePlayer = gamePlayersMap[next.gamePlayerId]
      if (!soldGamePlayer) {
        return
      }

      const soldPlayer: SoldPlayer = {
        player: soldGamePlayer.player,
        bidAmount: next.amount,
        boughtBy: next.winnerId,
      }

      setState((current) => ({
        ...current,
        phase: "sold",
        currentBid: next.amount,
        currentBidder: next.winnerId,
        minimumBid: minimumBidForPlayer(current.currentPlayer, next.amount),
        roundLabel: current.currentBidder === current.myId ? "Vous remportez l'enchère" : "Joueur vendu",
        lastWinnerId: next.winnerId,
        lastSoldAmount: next.amount,
        myTeam:
          next.winnerId === current.myId ? replaceTeamEntry(current.myTeam, soldPlayer) : current.myTeam,
        opponentTeam:
          next.winnerId === current.opponentId
            ? replaceTeamEntry(current.opponentTeam, soldPlayer)
            : current.opponentTeam,
        hostBudgetRemaining: next.hostBudgetRemaining,
        guestBudgetRemaining: next.guestBudgetRemaining,
        myBudget: current.isHost ? next.hostBudgetRemaining : next.guestBudgetRemaining,
        opponentBudget: current.isHost ? next.guestBudgetRemaining : next.hostBudgetRemaining,
        disconnectDeadline: null,
      }))
    })

    channel.on("broadcast", { event: "player_unsold" }, ({ payload }) => {
      const next = payload as BroadcastEnvelopeMap["player_unsold"]
      setState((current) => ({
        ...current,
        phase: "unsold",
        currentBid: 0,
        currentBidder: null,
        minimumBid: minimumBidForPlayer(current.currentPlayer, 0),
        roundLabel: next.round === current.currentRound ? "Joueur non vendu" : current.roundLabel,
        disconnectDeadline: null,
      }))
    })

    channel.on("broadcast", { event: "game_over" }, ({ payload }) => {
      const next = payload as BroadcastEnvelopeMap["game_over"]
      setState((current) => ({
        ...current,
        phase: "game_over",
        gameStatus: "completed",
        currentPlayer: null,
        currentGamePlayerId: null,
        timerEnd: Date.now(),
        timerSeconds: 0,
        roundLabel:
          next.winnerId === current.myId ? "Victoire" : next.winnerId ? "Défaite" : "Match nul",
        lastWinnerId: next.winnerId,
      }))
    })

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        return
      }

      channelRef.current = channel
      await channel.track({ user_id: userId, online_at: Date.now() })
    })

    return () => {
      clearTimers()
      void channel.untrack()
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [beginBiddingPhase, clearTimers, gameId, gamePlayersMap, supabase, userId])

  useEffect(() => {
    if (state.phase === "reveal") {
      beginBiddingPhase()
    }
  }, [beginBiddingPhase, state.currentRound, state.phase])

  useEffect(() => {
    if (!state.isHost || state.phase !== "bidding") {
      return
    }

    if (state.timerEnd > Date.now()) {
      return
    }

    if (state.currentBid > 0 && state.currentBidder) {
      void finalizeSold(state.currentBidder, state.currentBid)
      return
    }

    void finalizeUnsold()
  }, [finalizeSold, finalizeUnsold, state.currentBid, state.currentBidder, state.isHost, state.phase, state.timerEnd])

  useEffect(() => {
    if (!state.isHost || state.phase !== "bidding") {
      return
    }

    if (!state.currentPlayer || state.connectedUserIds.length === 0) {
      return
    }

    const opponentOffline = !state.connectedUserIds.includes(state.opponentId)

    if (!opponentOffline) {
      if (disconnectTimeoutRef.current) {
        window.clearTimeout(disconnectTimeoutRef.current)
        disconnectTimeoutRef.current = null
      }

      if (state.disconnectDeadline) {
        setState((current) => ({
          ...current,
          disconnectDeadline: null,
        }))
      }
      return
    }

    if (disconnectTimeoutRef.current) {
      return
    }

    const deadline = Date.now() + AUTO_PASS_DISCONNECT_MS
    setState((current) => ({
      ...current,
      disconnectDeadline: deadline,
    }))
    disconnectTimeoutRef.current = window.setTimeout(() => {
      disconnectTimeoutRef.current = null
      void finalizeUnsold("Déconnexion adverse")
    }, AUTO_PASS_DISCONNECT_MS)
  }, [
    finalizeUnsold,
    state.connectedUserIds,
    state.currentPlayer,
    state.disconnectDeadline,
    state.isHost,
    state.opponentId,
    state.phase,
  ])

  useEffect(() => {
    if (!state.isHost || state.phase !== "bidding") {
      return
    }

    const hostId = options?.initialGame.host_id
    const guestId = options?.initialGame.guest_id

    if (!hostId || !guestId) {
      return
    }

    const bothPassed = state.passedBy.includes(hostId) && state.passedBy.includes(guestId) && state.currentBid === 0
    if (bothPassed) {
      void finalizeUnsold("Les deux joueurs passent")
    }
  }, [finalizeUnsold, options?.initialGame.guest_id, options?.initialGame.host_id, state.currentBid, state.passedBy, state.phase, state.isHost])

  const canBid = useCallback(
    (amount: number) => {
      const current = stateRef.current
      if (current.phase !== "bidding") {
        return false
      }

      if (!current.currentPlayer) {
        return false
      }

      if (current.currentBidder === current.myId) {
        return false
      }

      if (current.myTeam.length >= teamSize) {
        return false
      }

      if (amount < current.minimumBid) {
        return false
      }

      return canAffordAtAmount(amount, current.myBudget, teamSize, current.myTeam.length)
    },
    [teamSize],
  )

  const placeBid = useCallback(
    async (amount: number) => {
      const current = stateRef.current

      if (!canBid(amount)) {
        toast.error("Enchère invalide pour ton budget ou l'état du round.")
        return
      }

      await broadcast("bid", {
        bidderId: current.myId,
        amount,
        timestamp: Date.now(),
        bidderName: participantName(current.myId),
      })

      if (current.isHost) {
        const timerEnd = Date.now() + GAME_DEFAULTS.BID_TIMER_RESET_SECONDS * 1000
        await broadcast("timer_update", {
          timerEnd,
          reason: "bid",
          timestamp: Date.now(),
        })
      }
    },
    [broadcast, canBid, participantName],
  )

  const passTurn = useCallback(async () => {
    const current = stateRef.current

    if (current.phase !== "bidding") {
      return
    }

    if (current.currentBid > 0) {
      toast.info("Tu peux laisser le timer expirer si tu ne veux pas surenchérir.")
      return
    }

    await broadcast("pass", {
      bidderId: current.myId,
      timestamp: Date.now(),
    })
  }, [broadcast])

  const quickBids = useMemo(() => {
    const start = state.minimumBid
    return [start, start + 1, start + 4, start + 9].filter(
      (amount, index, values) => values.indexOf(amount) === index,
    )
  }, [state.minimumBid])

  return {
    state,
    placeBid,
    passTurn,
    isMyTurn: canBid(state.minimumBid),
    canBid,
    quickBids,
  }
}
