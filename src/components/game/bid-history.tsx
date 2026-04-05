"use client"

import { motion } from "framer-motion"

import type { BidHistoryEntry } from "@/lib/hooks/use-auction"
import { cn } from "@/lib/utils"

export function BidHistory({ history, myId }: { history: BidHistoryEntry[]; myId: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Historique</p>
        <p className="text-xs text-muted-foreground">Round en cours</p>
      </div>
      <div className="mt-4 space-y-2">
        {history.length ? (
          history.slice(-5).map((entry, index) => {
            const isLatest = index === history.slice(-5).length - 1
            const isMine = entry.bidderId === myId

            return (
              <motion.div
                key={`${entry.bidderId}-${entry.timestamp}-${entry.amount}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-3 py-2 text-sm",
                  isMine
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "border-rose-400/20 bg-rose-400/10 text-rose-200",
                )}
              >
                <span className="truncate font-medium">{entry.bidderName}</span>
                <span className="flex items-center gap-2 font-bold">
                  {entry.amount}M€ {isLatest ? <span className="text-[10px] uppercase tracking-[0.2em]">Actuelle</span> : null}
                </span>
              </motion.div>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-sm text-muted-foreground">
            Aucune enchère pour le moment.
          </div>
        )}
      </div>
    </div>
  )
}
