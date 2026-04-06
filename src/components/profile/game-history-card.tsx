import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ResultTone = "success" | "danger" | "neutral"

const toneClasses: Record<ResultTone, string> = {
  success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  danger: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  neutral: "border-slate-400/20 bg-slate-400/10 text-slate-200",
}

function HistoryCardBody({
  resultLabel,
  resultTone,
  opponentName,
  timestampLabel,
  modeLabel,
  modeIcon,
  teamPreview,
}: {
  resultLabel: string
  resultTone: ResultTone
  opponentName: string
  timestampLabel: string
  modeLabel: string
  modeIcon: string
  teamPreview: string
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 transition hover:border-white/20 hover:bg-white/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-full border", toneClasses[resultTone])}>{resultLabel}</Badge>
            <span className="text-sm font-medium text-white">vs {opponentName}</span>
            <span className="text-sm text-muted-foreground">· {timestampLabel}</span>
          </div>
          <p className="text-sm text-muted-foreground">{modeIcon} {modeLabel}</p>
          <p className="text-sm text-muted-foreground">Mon équipe: {teamPreview}</p>
        </div>
      </div>
    </div>
  )
}

export function GameHistoryCard({
  href,
  resultLabel,
  resultTone,
  opponentName,
  timestampLabel,
  modeLabel,
  modeIcon,
  teamPreview,
}: {
  href?: string
  resultLabel: string
  resultTone: ResultTone
  opponentName: string
  timestampLabel: string
  modeLabel: string
  modeIcon: string
  teamPreview: string
}) {
  if (href) {
    return (
      <Link href={href} className="block">
        <HistoryCardBody
          resultLabel={resultLabel}
          resultTone={resultTone}
          opponentName={opponentName}
          timestampLabel={timestampLabel}
          modeLabel={modeLabel}
          modeIcon={modeIcon}
          teamPreview={teamPreview}
        />
      </Link>
    )
  }

  return (
    <HistoryCardBody
      resultLabel={resultLabel}
      resultTone={resultTone}
      opponentName={opponentName}
      timestampLabel={timestampLabel}
      modeLabel={modeLabel}
      modeIcon={modeIcon}
      teamPreview={teamPreview}
    />
  )
}
