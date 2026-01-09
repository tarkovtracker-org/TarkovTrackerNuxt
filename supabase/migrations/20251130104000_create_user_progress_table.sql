-- Create user_progress table (missing in migrations)
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_game_mode TEXT DEFAULT 'pvp',
  game_edition INTEGER DEFAULT 1,
  pvp_data JSONB DEFAULT '{}'::jsonb,
  pve_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_progress_current_game_mode_check
    CHECK (current_game_mode = ANY (ARRAY['pvp'::text, 'pve'::text]))
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
