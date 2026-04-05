import type { Database } from '@/lib/types/database';
import type { PlayerPosition, PositionCategory } from '@/lib/types/game';

export type PlayerCategory =
  Database['public']['Tables']['players']['Row']['category'];

export type PlayerRecord = Database['public']['Tables']['players']['Row'];
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];

export interface PlayerCardData {
  id: number;
  name: string;
  shortName: string;
  position: PlayerPosition;
  positionCategory: PositionCategory;
  club: string;
  league: string;
  overallRating: number;
  basePrice: number;
  nationality: string;
  nationalityFlag: string | null;
  category: PlayerCategory;
}

export interface DraftedPlayer extends PlayerRecord {
  currentBid?: number;
  wonBy?: string | null;
}
