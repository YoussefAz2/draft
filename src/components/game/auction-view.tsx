"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, History, ShieldAlert } from "lucide-react"

import { BidControls } from "@/components/game/bid-controls"
import { BidHistory } from "@/components/game/bid-history"
import { PlayerCard } from "@/components/game/player-card"
import { ResultsView } from "@/components/game/results-view"
import { TeamPanel } from "@/components/game/team-panel"
import { AuctionTimer } from "@/components/game/timer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuction, type AuctionGamePlayer, type AuctionGameRow, type AuctionProfile } from "@/lib/hooks/use-auction"
import { GAME_DEFAULTS } from "@/lib/types/game"
import { cn } from "@/lib/utils"

export function AuctionView({
  currentUserId,
  initialGame,
  gamePlayers,
  profiles,
}: {
  currentUserId: string
  initialGame: AuctionGameRow
  gamePlayers: AuctionGamePlayer[]
  profiles: AuctionProfile[]
}) {
  const { state, placeBid, passTurn, canBid, quickBids, isMyTurn } = useAuction(initialGame.id, currentUserId, {
    initialGame,
    gamePlayers,
    profiles,
  })
  const [isMobileTeamsOpen, setIsMobileTeamsOpen] = useState(false)
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false)

  const timerTotalSeconds = state.currentBidder ? GAME_DEFAULTS.BID_TIMER_RESET_SECONDS : GAME_DEFAULTS.BID_TIMER_SECONDS
  const timerTone = state.timerSeconds > 5 ? "text-emerald-300" : state.timerSeconds >= 3 ? "text-amber-300" : "text-rose-300"
  const overlay =
    state.phase === "sold" && state.currentPlayer ? (
      <div className="flex h-full items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "rounded-full border px-6 py-4 text-center text-lg font-black backdrop-blur-md",
            state.lastWinnerId === state.myId
              ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
              : "border-amber-400/30 bg-amber-400/15 text-amber-100",
          )}
        >
          VENDU {state.lastSoldAmount ? `${state.lastSoldAmount}M€` : ""}
        </motion.div>
      </div>
    ) : state.phase === "unsold" && state.currentPlayer ? (
      <div className="flex h-full items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-full border border-white/20 bg-black/40 px-6 py-4 text-center text-lg font-black text-white backdrop-blur-md"
        >
          PASSÉ
        </motion.div>
      </div>
    ) : null

  const controlsShake =
    state.phase === "bidding" && state.currentBidder === state.opponentId ? { x: [-2, 2, -2, 0] } : { x: 0 }

  if (state.phase === "game_over") {
    const hostTeam = state.isHost ? state.myTeam : state.opponentTeam
    const guestTeam = state.isHost ? state.opponentTeam : state.myTeam

    return (
      <ResultsView
        currentUserId={currentUserId}
        game={{
          ...initialGame,
          status: "completed",
          winner_id: state.lastWinnerId,
          host_budget_remaining: state.hostBudgetRemaining,
          guest_budget_remaining: state.guestBudgetRemaining,
        }}
        profiles={profiles}
        hostTeam={hostTeam}
        guestTeam={guestTeam}
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-6 pb-80 sm:px-6 sm:pb-72 lg:px-8 xl:pb-6">
      <div className="sticky top-3 z-30 xl:hidden">
        <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-background/90 px-3 py-3 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Badge className="shrink-0 rounded-full border border-white/10 bg-black/30 text-white">
              {state.currentRound}/{state.totalRounds}
            </Badge>
            <Badge className="shrink-0 rounded-full border border-primary/20 bg-primary/10 text-primary">
              {state.phase === "reveal"
                ? "Nouveau joueur"
                : state.phase === "bidding"
                  ? "Enchères"
                  : state.phase === "sold"
                    ? "Vendu"
                    : "Passé"}
            </Badge>
            {isMyTurn ? (
              <Badge className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                À toi
              </Badge>
            ) : null}
            {!state.connectedUserIds.includes(state.opponentId) ? (
              <Badge className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
                <ShieldAlert className="mr-1 size-3.5" />
                Offline
              </Badge>
            ) : null}
          </div>
          <div className="shrink-0 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-right">
            <p className={cn("text-lg font-black tabular-nums", timerTone)}>{String(Math.max(state.timerSeconds, 0)).padStart(2, "0")}s</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">timer</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-6 xl:mt-0 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className="hidden xl:block xl:order-1">
          <TeamPanel
            title="Mon équipe"
            subtitle="Mes joueurs"
            budget={state.myBudget}
            players={state.myTeam}
            teamSize={initialGame.team_size}
            isMe
          />
        </div>

        <div className="order-first space-y-4 xl:order-2 xl:space-y-6">
          <div className="hidden xl:grid xl:gap-4 xl:grid-cols-[1fr_auto]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full border border-white/10 bg-black/30 text-white">
                  Joueur {state.currentRound}/{state.totalRounds}
                </Badge>
                <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                  {state.phase === "reveal"
                    ? "🎭 Nouveau joueur"
                    : state.phase === "bidding"
                      ? "🔨 Enchères ouvertes"
                      : state.phase === "sold"
                        ? "✅ Vendu !"
                        : "⏭️ Passé"}
                </Badge>
                {isMyTurn ? (
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    🟢 À toi !
                  </Badge>
                ) : null}
                {!state.connectedUserIds.includes(state.opponentId) ? (
                  <Badge className="rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
                    <ShieldAlert className="mr-1 size-3.5" />
                    ⚠️ Adversaire déconnecté
                  </Badge>
                ) : null}
              </div>

              {state.roundLabel ? <div className="mt-4 text-sm text-muted-foreground">{state.roundLabel}</div> : null}
            </div>

            <AuctionTimer
              seconds={state.timerSeconds}
              totalSeconds={timerTotalSeconds}
              label={
                state.phase === "reveal"
                  ? "🎭 Nouveau joueur"
                  : state.phase === "sold"
                    ? "✅ Vendu !"
                    : state.phase === "unsold"
                      ? "⏭️ Passé"
                      : undefined
              }
            />
          </div>

          {state.roundLabel ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground backdrop-blur-xl xl:hidden">
              {state.roundLabel}
            </div>
          ) : null}

          {state.currentPlayer ? (
            <PlayerCard player={state.currentPlayer} isRevealing={state.phase === "reveal"} overlay={overlay} />
          ) : (
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Aucun joueur à afficher</CardTitle>
              </CardHeader>
            </Card>
          )}

          <div className="space-y-3 xl:hidden">
            <button
              type="button"
              onClick={() => setIsMobileTeamsOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left"
            >
              <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">
                      {state.myTeam.length}/{initialGame.team_size}
                    </span>
                    <span className="text-xs text-muted-foreground">Mon équipe</span>
                    <span className="text-sm font-semibold text-white">{state.myBudget}M€</span>
                  </div>
                </div>
                <div className="min-w-0 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-semibold text-white">{state.opponentBudget}M€</span>
                    <span className="text-xs text-muted-foreground">Adversaire</span>
                    <span className="text-sm font-semibold text-rose-300">
                      {state.opponentTeam.length}/{initialGame.team_size}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown className={cn("ml-3 size-4 shrink-0 text-muted-foreground transition-transform", isMobileTeamsOpen && "rotate-180")} />
            </button>

            <AnimatePresence initial={false}>
              {isMobileTeamsOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-3 overflow-hidden"
                >
                  <TeamPanel
                    title="Mon équipe"
                    subtitle="Mes joueurs"
                    budget={state.myBudget}
                    players={state.myTeam}
                    teamSize={initialGame.team_size}
                    isMe
                  />
                  <TeamPanel
                    title="Adversaire"
                    subtitle={state.opponentUsername}
                    budget={state.opponentBudget}
                    players={state.opponentTeam}
                    teamSize={initialGame.team_size}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-between rounded-2xl border-white/10 bg-white/5 px-4 text-sm text-white xl:hidden"
              onClick={() => setIsMobileHistoryOpen((current) => !current)}
            >
              <span className="flex items-center gap-2">
                <History className="size-4" />
                Voir les enchères
              </span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isMobileHistoryOpen && "rotate-180")} />
            </Button>

            <AnimatePresence initial={false}>
              {isMobileHistoryOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <BidHistory history={state.bidHistory} myId={state.myId} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="hidden gap-6 xl:grid xl:grid-cols-[1.15fr_0.85fr]">
            <motion.div
              key={`desktop-shake-${state.currentBid}-${state.currentBidder}`}
              animate={controlsShake}
              transition={{ duration: 0.3 }}
            >
              <BidControls
                state={state}
                quickBids={quickBids}
                canBid={canBid}
                placeBid={placeBid}
                passTurn={passTurn}
              />
            </motion.div>
            <BidHistory history={state.bidHistory} myId={state.myId} />
          </div>
        </div>

        <div className="hidden xl:block xl:order-3">
          <TeamPanel
            title="Adversaire"
            subtitle={state.opponentUsername}
            budget={state.opponentBudget}
            players={state.opponentTeam}
            teamSize={initialGame.team_size}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/95 p-4 backdrop-blur-xl xl:hidden">
        <motion.div
          key={`mobile-shake-${state.currentBid}-${state.currentBidder}`}
          animate={controlsShake}
          transition={{ duration: 0.3 }}
        >
          <BidControls
            state={state}
            quickBids={quickBids}
            canBid={canBid}
            placeBid={placeBid}
            passTurn={passTurn}
            compact
          />
        </motion.div>
      </div>
    </main>
  )
}
