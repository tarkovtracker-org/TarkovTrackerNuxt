-- Remove dual game mode support from api_tokens
-- Only pvp and pve are supported to maintain backwards compatibility with external tools
ALTER TABLE public.api_tokens DROP CONSTRAINT IF EXISTS api_tokens_game_mode_check;
ALTER TABLE public.api_tokens ADD CONSTRAINT api_tokens_game_mode_check
  CHECK (game_mode IN ('pvp', 'pve'));
