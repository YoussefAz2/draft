export type GameMode =
  | 'star_players'
  | 'legends'
  | 'future_stars'
  | 'africa_only'
  | 'low_budget'
  | 'random';

export type GameStatus =
  | 'waiting'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PlayerPosition =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST'
  | 'CF';

export type PositionCategory = 'GK' | 'DEF' | 'MID' | 'FWD';
export type GamePlayerStatus = 'pending' | 'active' | 'sold' | 'unsold';

export interface GameConfig {
  mode: GameMode;
  budget: number;
  teamSize: number;
}

export const GAME_DEFAULTS = {
  BUDGET: 250,
  TEAM_SIZE: 5,
  BID_TIMER_SECONDS: 15,
  BID_TIMER_RESET_SECONDS: 8,
  MIN_BID_INCREMENT: 1,
} as const;

export const GAME_MODES: Record<
  GameMode,
  { label: string; description: string; icon: string }
> = {
  star_players: {
    label: 'Star Players',
    description: 'Top joueurs actuels',
    icon: '⭐',
  },
  legends: {
    label: 'Legends',
    description: 'Icônes du football',
    icon: '🏆',
  },
  future_stars: {
    label: 'Future Stars',
    description: 'Jeunes talents U23',
    icon: '🚀',
  },
  africa_only: {
    label: 'Africa Only',
    description: 'Joueurs africains',
    icon: '🌍',
  },
  low_budget: {
    label: 'Low Budget',
    description: 'Budget réduit, stratégie max',
    icon: '💸',
  },
  random: {
    label: 'Random Draft',
    description: 'Joueurs aléatoires',
    icon: '🎲',
  },
};
