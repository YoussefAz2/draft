export type EloTier = "bronze" | "silver" | "gold" | "diamond"

export function getInitials(value?: string | null) {
  if (!value) {
    return "FD"
  }

  return value
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function formatWinRate(wins: number, totalGames: number) {
  if (totalGames <= 0) {
    return "N/A"
  }

  return `${((wins / totalGames) * 100).toFixed(1)}%`
}

export function getEloTier(eloRating: number): EloTier {
  if (eloRating >= 1500) {
    return "diamond"
  }

  if (eloRating >= 1300) {
    return "gold"
  }

  if (eloRating >= 1100) {
    return "silver"
  }

  return "bronze"
}

export function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) {
    return "Date indisponible"
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Date indisponible"
  }

  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" })
  const ranges = [
    { unit: "year", seconds: 31_536_000 },
    { unit: "month", seconds: 2_592_000 },
    { unit: "day", seconds: 86_400 },
    { unit: "hour", seconds: 3_600 },
    { unit: "minute", seconds: 60 },
  ] as const

  for (const range of ranges) {
    if (Math.abs(diffInSeconds) >= range.seconds) {
      return rtf.format(Math.round(diffInSeconds / range.seconds), range.unit)
    }
  }

  return rtf.format(diffInSeconds, "second")
}
