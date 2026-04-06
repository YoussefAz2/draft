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
  compact = false,
  className,
}: {
  state: AuctionState
  quickBids: number[]
  canBid: (amount: number) => boolean
  placeBid: (amount: number) => void
  passTurn: () => void
  compact?: boolean
  className?: string
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

    return compact ? `${amount}M€` : `${amount}M€ (+${amount - state.currentBid})`
  }

  const handleCustomBid = () => {
    const amount = Number(customBid)

    if (!Number.isFinite(amount)) {
      return
    }

    placeBid(amount)
    setCustomBid("")
  }

  return (
    <div
      className={cn(
        "rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl",
        compact ? "p-4 shadow-[0_-10px_50px_rgba(0,0,0,0.35)]" : "p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Enchère actuelle</p>
          <motion.p
            key={`${state.currentBid}-${state.currentBidder}`}
            initial={{ scale: 0.92, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "mt-2 font-black",
              compact ? "text-3xl" : "text-4xl",
              state.currentBidder === state.myId ? "text-emerald-300" : state.currentBidder ? "text-rose-300" : "text-white",
            )}
          >
            {state.currentBid}M€
          </motion.p>
          <p className={cn("mt-2 text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            {state.currentBidder
              ? state.currentBidder === state.myId
                ? "Tu mènes ! 🟢"
                : `${state.opponentUsername} mène 🔴`
              : "Aucune enchère"}
          </p>
        </div>
        <div
          className={cn(
            "rounded-full border border-white/10 bg-black/25 font-semibold text-muted-foreground",
            compact ? "px-3 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
          )}
        >
          Budget <span className="text-white">{state.myBudget}M€</span>
        </div>
      </div>

      <div className={cn("grid gap-3", compact ? "mt-4 grid-cols-4" : "mt-5 grid-cols-2 sm:grid-cols-4")}>
        {quickBids.map((amount) => (
          <Button
            key={amount}
            variant={state.currentBidder === state.myId && amount === state.currentBid ? "secondary" : "outline"}
            className={cn(
              "rounded-2xl font-semibold",
              compact ? "h-10 px-2 text-xs" : "h-12 text-base",
            )}
            disabled={!canBid(amount)}
            onClick={() => placeBid(amount)}
          >
            {quickBidLabel(amount)}
          </Button>
        ))}
      </div>

      <div className={cn("flex gap-3", compact ? "mt-4 flex-row" : "mt-5 flex-col sm:flex-row")}>
        <Input
          type="number"
          min={state.minimumBid}
          step={1}
          value={customBid}
          onChange={(event) => setCustomBid(event.target.value)}
          className={cn(
            "rounded-2xl px-4",
            compact ? "h-11 text-sm" : "h-12 text-base",
          )}
          placeholder={!state.currentBidder ? "0M€ ou plus" : `Plus de ${state.currentBid}M€`}
        />
        <Button
          size="lg"
          className={cn(
            "rounded-2xl bg-primary font-bold",
            compact ? "h-11 min-w-32 px-4 text-sm" : "h-12 min-w-40 text-base",
          )}
          disabled={!canUseCustomBid}
          onClick={handleCustomBid}
        >
          Enchérir
        </Button>
      </div>

      <div className="mt-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 font-semibold text-amber-300 hover:bg-amber-400/20 hover:text-amber-200",
            compact ? "h-10 text-xs" : "h-12 text-sm",
          )}
          disabled={state.phase !== "bidding"}
          onClick={passTurn}
        >
          ⏭️ Passer ce joueur
        </Button>
      </div>
    </div>
  )
}
