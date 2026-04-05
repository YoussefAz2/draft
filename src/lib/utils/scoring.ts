import type { PlayerRecord } from '@/lib/types/player';

export function calculateTeamScore(players: PlayerRecord[]) {
  if (players.length === 0) {
    return 0;
  }

  const total = players.reduce((sum, player) => sum + player.overall_rating, 0);
  return Number((total / players.length).toFixed(2));
}

export function calculateCategoryBonus(players: PlayerRecord[]) {
  return players.reduce((bonus, player) => bonus + player.base_price * 0.05, 0);
}
