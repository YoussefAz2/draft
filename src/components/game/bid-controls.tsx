"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AuctionState } from "@/lib/hooks/use-auction"
import { cn } from "@/lib/utils"

export function BidControls({
  state,
  quickBids,
  canBid,
  placeBid,
  passTurn,
}: {
  state: AuctionState
  quickBids: number[]
  canBid: (amount: number) => boolean
  placeBid: (amount: number) => void
  passTurn: () => void
}) {
  const [customBid, setCustomBid] = useState("")
  const canUseCustomBid = useMemo(() => {
    const parsed = Number(customBid)
    return Number.isFinite(parsed) && canBid(parsed)
  }, [canBid, customBid])

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Enchère actuelle</p>
          <motion.p
            key={`${state.currentBid}-${state.currentBidder}`}
            initial={{ scale: 0.92, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "mt-2 text-4xl font-black",
              state.currentBidder === state.myId ? "text-emerald-300" : state.currentBidder ? "text-rose-300" : "text-white",
            )}
          >
            {state.currentBid}M€
          </motion.p>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.currentBidder
              ? state.currentBidder === state.myId
                ? "Vous êtes meilleur enchérisseur"
                : `${state.opponentUsername} mène l'enchère`
              : `Ouverture à ${state.minimumBid}M€`}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Minimum</p>
          <p className="text-2xl font-bold text-white">{state.minimumBid}M€</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickBids.map((amount) => (
          <Button
            key={amount}
            variant={state.currentBidder === state.myId && amount === state.currentBid ? "secondary" : "outline"}
            className="h-12 rounded-2xl text-base font-semibold"
            disabled={!canBid(amount)}
            onClick={() => placeBid(amount)}
          >
            {amount}M€
          </Button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Input
          type="number"
          min={state.minimumBid}
          step={1}
          value={customBid}
          onChange={(event) => setCustomBid(event.target.value)}
          className="h-12 rounded-2xl px-4 text-base"
          placeholder={`Au moins ${state.minimumBid}M€`}
        />
        <Button
          size="lg"
          className="h-12 min-w-40 rounded-2xl bg-primary text-base font-bold"
          disabled={!canUseCustomBid}
          onClick={() => {
            const amount = Number(customBid)
            if (!Number.isFinite(amount)) {
              return
            }
            placeBid(amount)
            setCustomBid("")
          }}
        >
          Enchérir
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-muted-foreground">
          Budget restant: <span className="font-semibold text-white">{state.myBudget}M€</span>
        </div>
        <Button
          variant="ghost"
          className="h-12 rounded-2xl border border-white/10 bg-black/25 text-sm font-semibold text-muted-foreground hover:bg-white/10 hover:text-white"
          disabled={state.phase !== "bidding" || state.currentBid > 0}
          onClick={passTurn}
        >
          Passer
        </Button>
      </div>
    </div>
  )
}
