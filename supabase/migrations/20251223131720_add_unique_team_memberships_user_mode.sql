CREATE UNIQUE INDEX IF NOT EXISTS team_memberships_user_mode_unique
  ON public.team_memberships (user_id, game_mode);
