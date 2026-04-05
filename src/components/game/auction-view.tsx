"use client"

import { Crown, Gavel, ShieldAlert, Trophy } from "lucide-react"
import { motion } from "framer-motion"

import { BidControls } from "@/components/game/bid-controls"
import { BidHistory } from "@/components/game/bid-history"
import { PlayerCard } from "@/components/game/player-card"
import { TeamPanel } from "@/components/game/team-panel"
import { AuctionTimer } from "@/components/game/timer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  const timerTotalSeconds = state.currentBid > 0 ? GAME_DEFAULTS.BID_TIMER_RESET_SECONDS : GAME_DEFAULTS.BID_TIMER_SECONDS
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

  if (state.phase === "game_over") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 text-primary">
              Partie terminée
            </Badge>
            <CardTitle className="flex items-center gap-3 text-3xl text-white">
              <Trophy className="size-8 text-amber-300" />
              {state.roundLabel ?? "Résultat final"}
            </CardTitle>
            <CardDescription>
              Budget final: {state.myBudget}M€ · Effectif: {state.myTeam.length}/{initialGame.team_size}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-2">
            <TeamPanel
              title="Mon équipe"
              subtitle="Composition finale"
              budget={state.myBudget}
              players={state.myTeam}
              teamSize={initialGame.team_size}
              isMe
            />
            <TeamPanel
              title={state.opponentUsername}
              subtitle="Composition finale"
              budget={state.opponentBudget}
              players={state.opponentTeam}
              teamSize={initialGame.team_size}
            />
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className="xl:order-1">
          <TeamPanel
            title="Mon équipe"
            subtitle="Tes recrues"
            budget={state.myBudget}
            players={state.myTeam}
            teamSize={initialGame.team_size}
            isMe
          />
        </div>

        <div className="order-first space-y-6 xl:order-2">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full border border-white/10 bg-black/30 text-white">
                  Round {state.currentRound}/{state.totalRounds}
                </Badge>
                <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                  {state.phase === "reveal"
                    ? "Révélation"
                    : state.phase === "bidding"
                      ? "Enchères"
                      : state.phase === "sold"
                        ? "Vendu"
                        : "Passé"}
                </Badge>
                {isMyTurn ? (
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    <Crown className="mr-1 size-3.5" />
                    Tu peux enchérir
                  </Badge>
                ) : null}
                {!state.connectedUserIds.includes(state.opponentId) ? (
                  <Badge className="rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
                    <ShieldAlert className="mr-1 size-3.5" />
                    Adversaire hors ligne
                  </Badge>
                ) : null}
              </div>

              <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{state.roundLabel ?? "Le plus offrant remporte le joueur."}</span>
                {state.disconnectDeadline ? (
                  <span>
                    Auto-pass dans {Math.max(0, Math.ceil((state.disconnectDeadline - Date.now()) / 1000))}s
                  </span>
                ) : null}
              </div>
            </div>

            <AuctionTimer
              seconds={state.timerSeconds}
              totalSeconds={timerTotalSeconds}
              label={state.phase === "reveal" ? "Révélation" : state.phase === "bidding" ? "Clôture du round" : state.roundLabel ?? undefined}
            />
          </div>

          {state.currentPlayer ? (
            <PlayerCard player={state.currentPlayer} isRevealing={state.phase === "reveal"} overlay={overlay} />
          ) : (
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Aucun joueur à afficher</CardTitle>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <BidControls
              state={state}
              quickBids={quickBids}
              canBid={canBid}
              placeBid={placeBid}
              passTurn={passTurn}
            />
            <BidHistory history={state.bidHistory} myId={state.myId} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4">
              <div className="flex items-center gap-3">
                <Gavel className="size-5 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Mon budget</p>
                  <p className="text-2xl font-black text-white">{state.myBudget}M€</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4">
              <div className="flex items-center gap-3">
                <Gavel className="size-5 text-amber-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Budget adverse</p>
                  <p className="text-2xl font-black text-white">{state.opponentBudget}M€</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:order-3">
          <TeamPanel
            title="Adversaire"
            subtitle={state.opponentUsername}
            budget={state.opponentBudget}
            players={state.opponentTeam}
            teamSize={initialGame.team_size}
          />
        </div>
      </div>
    </main>
  )
}
