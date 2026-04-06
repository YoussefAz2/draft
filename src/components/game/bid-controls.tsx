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
  const quickBidLabel = (amount: number) => {
    if (!state.currentBidder) {
      if (amount === 0) {
        return "Gratuit"
      }

      return `${amount}M€`
    }

    return `${amount}M€ (+${amount - state.currentBid})`
  }

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
                ? "Tu mènes ! 🟢"
                : `${state.opponentUsername} mène 🔴`
              : "Aucune enchère"}
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          Budget <span className="text-white">{state.myBudget}M€</span>
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
            {quickBidLabel(amount)}
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
          placeholder={!state.currentBidder ? "0M€ ou plus" : `Plus de ${state.currentBid}M€`}
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

      <div className="mt-4">
        <Button
          variant="ghost"
          className="h-12 w-full rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 text-sm font-semibold text-amber-300 hover:bg-amber-400/20 hover:text-amber-200"
          disabled={state.phase !== "bidding"}
          onClick={passTurn}
        >
          ⏭️ Passer ce joueur
        </Button>
      </div>
    </div>
  )
}
