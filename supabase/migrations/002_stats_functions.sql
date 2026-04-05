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
