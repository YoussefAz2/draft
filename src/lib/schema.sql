CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || LEFT(NEW.id::TEXT, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PLAYERS (football players database)
-- ============================================
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF')),
  position_category TEXT NOT NULL CHECK (position_category IN ('GK', 'DEF', 'MID', 'FWD')),
  nationality TEXT NOT NULL,
  nationality_flag TEXT,
  club TEXT NOT NULL,
  league TEXT NOT NULL,
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 99),
  pace INTEGER CHECK (pace BETWEEN 1 AND 99),
  shooting INTEGER CHECK (shooting BETWEEN 1 AND 99),
  passing INTEGER CHECK (passing BETWEEN 1 AND 99),
  dribbling INTEGER CHECK (dribbling BETWEEN 1 AND 99),
  defending INTEGER CHECK (defending BETWEEN 1 AND 99),
  physical INTEGER CHECK (physical BETWEEN 1 AND 99),
  base_price INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'star' CHECK (category IN ('star', 'legend', 'future', 'african', 'underrated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_category ON players(category);
CREATE INDEX IF NOT EXISTS idx_players_rating ON players(overall_rating DESC);

-- ============================================
-- GAMES
-- ============================================
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE,
  mode TEXT NOT NULL DEFAULT 'star_players' CHECK (mode IN ('star_players', 'legends', 'future_stars', 'africa_only', 'low_budget', 'random')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'in_progress', 'completed', 'cancelled')),
  budget INTEGER NOT NULL DEFAULT 250,
  team_size INTEGER NOT NULL DEFAULT 5,
  host_id UUID NOT NULL REFERENCES profiles(id),
  guest_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  host_score NUMERIC(6,2),
  guest_score NUMERIC(6,2),
  host_budget_remaining INTEGER,
  guest_budget_remaining INTEGER,
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER,
  current_player_id INTEGER REFERENCES players(id),
  current_bid INTEGER DEFAULT 0,
  current_bidder_id UUID REFERENCES profiles(id),
  bid_timer_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);

-- ============================================
-- GAME_PLAYERS
-- ============================================
CREATE TABLE IF NOT EXISTS game_players (
  id SERIAL PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id),
  order_index INTEGER NOT NULL,
  won_by UUID REFERENCES profiles(id),
  winning_bid INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'sold', 'unsold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id),
  UNIQUE(game_id, order_index)
);

-- ============================================
-- BIDS
-- ============================================
CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  game_player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_game ON bids(game_id);

-- ============================================
-- STATS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION increment_profile_stats(
  p_user_id UUID,
  p_win_increment INTEGER DEFAULT 0,
  p_loss_increment INTEGER DEFAULT 0,
  p_draw_increment INTEGER DEFAULT 0,
  p_elo_change INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    wins = wins + p_win_increment,
    losses = losses + p_loss_increment,
    draws = draws + p_draw_increment,
    total_games = total_games + 1,
    elo_rating = GREATEST(100, elo_rating + p_elo_change),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Players are viewable by everyone" ON players;
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Games are viewable by everyone" ON games;
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "Participants can update games" ON games;
CREATE POLICY "Participants can update games" ON games FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = guest_id);

DROP POLICY IF EXISTS "Game players viewable by everyone" ON game_players;
CREATE POLICY "Game players viewable by everyone" ON game_players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Game host can insert game players" ON game_players;
CREATE POLICY "Game host can insert game players" ON game_players FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM games WHERE id = game_id AND host_id = auth.uid())
);
DROP POLICY IF EXISTS "Game participants can update game players" ON game_players;
CREATE POLICY "Game participants can update game players" ON game_players FOR UPDATE USING (
  EXISTS (SELECT 1 FROM games WHERE id = game_id AND (host_id = auth.uid() OR guest_id = auth.uid()))
);

DROP POLICY IF EXISTS "Bids viewable by everyone" ON bids;
CREATE POLICY "Bids viewable by everyone" ON bids FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create bids" ON bids;
CREATE POLICY "Authenticated users can create bids" ON bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);
