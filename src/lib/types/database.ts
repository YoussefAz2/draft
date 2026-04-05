export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bids: {
        Row: {
          amount: number;
          bidder_id: string;
          created_at: string | null;
          game_id: string;
          game_player_id: number;
          id: number;
        };
        Insert: {
          amount: number;
          bidder_id: string;
          created_at?: string | null;
          game_id: string;
          game_player_id: number;
          id?: never;
        };
        Update: {
          amount?: number;
          bidder_id?: string;
          created_at?: string | null;
          game_id?: string;
          game_player_id?: number;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: 'bids_bidder_id_fkey';
            columns: ['bidder_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bids_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bids_game_player_id_fkey';
            columns: ['game_player_id'];
            isOneToOne: false;
            referencedRelation: 'game_players';
            referencedColumns: ['id'];
          },
        ];
      };
      game_players: {
        Row: {
          created_at: string | null;
          game_id: string;
          id: number;
          order_index: number;
          player_id: number;
          status: 'pending' | 'active' | 'sold' | 'unsold';
          winning_bid: number | null;
          won_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          game_id: string;
          id?: never;
          order_index: number;
          player_id: number;
          status?: 'pending' | 'active' | 'sold' | 'unsold';
          winning_bid?: number | null;
          won_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          game_id?: string;
          id?: never;
          order_index?: number;
          player_id?: number;
          status?: 'pending' | 'active' | 'sold' | 'unsold';
          winning_bid?: number | null;
          won_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'game_players_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_players_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_players_won_by_fkey';
            columns: ['won_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      games: {
        Row: {
          bid_timer_end: string | null;
          budget: number;
          created_at: string | null;
          current_bid: number | null;
          current_bidder_id: string | null;
          current_player_id: number | null;
          current_round: number | null;
          guest_budget_remaining: number | null;
          guest_id: string | null;
          guest_score: number | null;
          host_budget_remaining: number | null;
          host_id: string;
          host_score: number | null;
          id: string;
          mode:
            | 'star_players'
            | 'legends'
            | 'future_stars'
            | 'africa_only'
            | 'low_budget'
            | 'random';
          room_code: string | null;
          status:
            | 'waiting'
            | 'ready'
            | 'in_progress'
            | 'completed'
            | 'cancelled';
          team_size: number;
          total_rounds: number | null;
          updated_at: string | null;
          winner_id: string | null;
        };
        Insert: {
          bid_timer_end?: string | null;
          budget?: number;
          created_at?: string | null;
          current_bid?: number | null;
          current_bidder_id?: string | null;
          current_player_id?: number | null;
          current_round?: number | null;
          guest_budget_remaining?: number | null;
          guest_id?: string | null;
          guest_score?: number | null;
          host_budget_remaining?: number | null;
          host_id: string;
          host_score?: number | null;
          id?: string;
          mode?:
            | 'star_players'
            | 'legends'
            | 'future_stars'
            | 'africa_only'
            | 'low_budget'
            | 'random';
          room_code?: string | null;
          status?:
            | 'waiting'
            | 'ready'
            | 'in_progress'
            | 'completed'
            | 'cancelled';
          team_size?: number;
          total_rounds?: number | null;
          updated_at?: string | null;
          winner_id?: string | null;
        };
        Update: {
          bid_timer_end?: string | null;
          budget?: number;
          created_at?: string | null;
          current_bid?: number | null;
          current_bidder_id?: string | null;
          current_player_id?: number | null;
          current_round?: number | null;
          guest_budget_remaining?: number | null;
          guest_id?: string | null;
          guest_score?: number | null;
          host_budget_remaining?: number | null;
          host_id?: string;
          host_score?: number | null;
          id?: string;
          mode?:
            | 'star_players'
            | 'legends'
            | 'future_stars'
            | 'africa_only'
            | 'low_budget'
            | 'random';
          room_code?: string | null;
          status?:
            | 'waiting'
            | 'ready'
            | 'in_progress'
            | 'completed'
            | 'cancelled';
          team_size?: number;
          total_rounds?: number | null;
          updated_at?: string | null;
          winner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'games_current_bidder_id_fkey';
            columns: ['current_bidder_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_current_player_id_fkey';
            columns: ['current_player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_host_id_fkey';
            columns: ['host_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_winner_id_fkey';
            columns: ['winner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      players: {
        Row: {
          base_price: number;
          category:
            | 'star'
            | 'legend'
            | 'future'
            | 'african'
            | 'underrated';
          club: string;
          created_at: string | null;
          defending: number | null;
          dribbling: number | null;
          id: number;
          image_url: string | null;
          league: string;
          name: string;
          nationality: string;
          nationality_flag: string | null;
          overall_rating: number;
          pace: number | null;
          passing: number | null;
          physical: number | null;
          position:
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
          position_category: 'GK' | 'DEF' | 'MID' | 'FWD';
          shooting: number | null;
          short_name: string;
        };
        Insert: {
          base_price?: number;
          category?:
            | 'star'
            | 'legend'
            | 'future'
            | 'african'
            | 'underrated';
          club: string;
          created_at?: string | null;
          defending?: number | null;
          dribbling?: number | null;
          id?: never;
          image_url?: string | null;
          league: string;
          name: string;
          nationality: string;
          nationality_flag?: string | null;
          overall_rating: number;
          pace?: number | null;
          passing?: number | null;
          physical?: number | null;
          position:
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
          position_category: 'GK' | 'DEF' | 'MID' | 'FWD';
          shooting?: number | null;
          short_name: string;
        };
        Update: {
          base_price?: number;
          category?:
            | 'star'
            | 'legend'
            | 'future'
            | 'african'
            | 'underrated';
          club?: string;
          created_at?: string | null;
          defending?: number | null;
          dribbling?: number | null;
          id?: never;
          image_url?: string | null;
          league?: string;
          name?: string;
          nationality?: string;
          nationality_flag?: string | null;
          overall_rating?: number;
          pace?: number | null;
          passing?: number | null;
          physical?: number | null;
          position?:
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
          position_category?: 'GK' | 'DEF' | 'MID' | 'FWD';
          shooting?: number | null;
          short_name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          draws: number | null;
          elo_rating: number | null;
          id: string;
          losses: number | null;
          total_games: number | null;
          updated_at: string | null;
          username: string;
          wins: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          draws?: number | null;
          elo_rating?: number | null;
          id: string;
          losses?: number | null;
          total_games?: number | null;
          updated_at?: string | null;
          username: string;
          wins?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          draws?: number | null;
          elo_rating?: number | null;
          id?: string;
          losses?: number | null;
          total_games?: number | null;
          updated_at?: string | null;
          username?: string;
          wins?: number | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_profile_stats: {
        Args: {
          p_draw_increment?: number;
          p_elo_change?: number;
          p_loss_increment?: number;
          p_user_id: string;
          p_win_increment?: number;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
