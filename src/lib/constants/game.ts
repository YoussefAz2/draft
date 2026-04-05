import { GAME_DEFAULTS, GAME_MODES } from '@/lib/types/game';

export { GAME_DEFAULTS, GAME_MODES };

export const GAME_ROOM_CODE_LENGTH = 6;
export const GAME_MIN_PARTICIPANTS = 2;
export const GAME_MAX_PARTICIPANTS = 2;
export const GAME_BUDGET_OPTIONS = [150, 200, 250, 300] as const;
export const GAME_TEAM_SIZE_OPTIONS = [5, 7, 11] as const;
export const GAME_TIMER_MS = GAME_DEFAULTS.BID_TIMER_SECONDS * 1000;
