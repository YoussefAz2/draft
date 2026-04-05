import type { Database } from "@/lib/types/database"

type PlayerRow = Database["public"]["Tables"]["players"]["Row"]

export interface SoldPlayer {
  player: Pick<
    PlayerRow,
    "id" | "short_name" | "name" | "position" | "position_category" | "club" | "league" | "nationality" | "overall_rating"
  >
  bidAmount: number
  boughtBy: string
}

export interface ScoreBreakdown {
  avgRating: number
  positionCoverage: string
  chemistryLinks: string[]
  budgetEfficiency: string
}

export interface TeamScore {
  totalScore: number
  qualityScore: number
  balanceScore: number
  chemistryScore: number
  budgetScore: number
  breakdown: ScoreBreakdown
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const key = getKey(item)?.trim()

    if (!key) {
      return accumulator
    }

    accumulator[key] = (accumulator[key] ?? 0) + 1
    return accumulator
  }, {})
}

export function calculateQualityScore(team: SoldPlayer[]) {
  if (!team.length) {
    return 0
  }

  const avgRating = team.reduce((sum, entry) => sum + entry.player.overall_rating, 0) / team.length
  const normalized = Math.max(0, Math.min(40, ((avgRating - 70) / 25) * 40))

  return roundToSingleDecimal(normalized)
}

export function calculateBalanceScore(team: SoldPlayer[]) {
  if (!team.length) {
    return 0
  }

  const categories = new Set(team.map((entry) => entry.player.position_category))
  const uniquePositions = new Set(team.map((entry) => entry.player.position))
  const coverageScores: Record<number, number> = { 4: 15, 3: 10, 2: 5, 1: 2 }

  let score = coverageScores[categories.size] ?? 0
  score += Math.round((uniquePositions.size / team.length) * 10)

  return Math.min(25, score)
}

export function calculateChemistryScore(team: SoldPlayer[]) {
  if (!team.length) {
    return { score: 0, links: [] as string[] }
  }

  let totalScore = 0
  const links: string[] = []

  let clubScore = 0
  const clubCounts = countBy(team, (entry) => entry.player.club)
  for (const [club, count] of Object.entries(clubCounts)) {
    if (count < 2) {
      continue
    }

    const pairs = (count * (count - 1)) / 2
    clubScore += pairs * 3
    links.push(`${count} joueurs ${club}`)
  }
  totalScore += Math.min(clubScore, 10)

  let nationalityScore = 0
  const nationalityCounts = countBy(team, (entry) => entry.player.nationality)
  for (const [nationality, count] of Object.entries(nationalityCounts)) {
    if (count < 2) {
      continue
    }

    const pairs = (count * (count - 1)) / 2
    nationalityScore += pairs * 2
    links.push(`${count} joueurs ${nationality}`)
  }
  totalScore += Math.min(nationalityScore, 8)

  let leagueScore = 0
  const leagueCounts = countBy(team, (entry) => entry.player.league)
  for (const [league, count] of Object.entries(leagueCounts)) {
    if (count < 3) {
      continue
    }

    leagueScore += (count - 2) * 3
    links.push(`${count} joueurs ${league}`)
  }
  totalScore += Math.min(leagueScore, 7)

  return {
    score: Math.min(25, totalScore),
    links,
  }
}

export function calculateBudgetScore(budgetRemaining: number, totalBudget: number) {
  if (totalBudget <= 0) {
    return 0
  }

  const percentRemaining = (budgetRemaining / totalBudget) * 100

  if (percentRemaining >= 5 && percentRemaining <= 20) {
    return 10
  }

  if (percentRemaining > 20 && percentRemaining <= 30) {
    return 8
  }

  if (percentRemaining > 30) {
    return Math.max(3, 10 - Math.floor((percentRemaining - 20) / 5))
  }

  if (percentRemaining >= 0 && percentRemaining < 5) {
    return 7
  }

  return 5
}

export function calculateTeamScore(team: SoldPlayer[], budgetRemaining: number, totalBudget: number): TeamScore {
  const safeBudgetRemaining = Number.isFinite(budgetRemaining) ? budgetRemaining : 0
  const safeTotalBudget = Number.isFinite(totalBudget) && totalBudget > 0 ? totalBudget : 1
  const avgRating = team.length
    ? roundToSingleDecimal(team.reduce((sum, entry) => sum + entry.player.overall_rating, 0) / team.length)
    : 0
  const qualityScore = calculateQualityScore(team)
  const balanceScore = calculateBalanceScore(team)
  const { score: chemistryScore, links } = calculateChemistryScore(team)
  const budgetScore = calculateBudgetScore(safeBudgetRemaining, safeTotalBudget)
  const coverageCount = new Set(team.map((entry) => entry.player.position_category)).size

  return {
    totalScore: roundToSingleDecimal(qualityScore + balanceScore + chemistryScore + budgetScore),
    qualityScore,
    balanceScore,
    chemistryScore,
    budgetScore,
    breakdown: {
      avgRating,
      positionCoverage: `${coverageCount}/4 positions couvertes`,
      chemistryLinks: links,
      budgetEfficiency: `${safeBudgetRemaining}M€ restants (${((safeBudgetRemaining / safeTotalBudget) * 100).toFixed(1)}%)`,
    },
  }
}
