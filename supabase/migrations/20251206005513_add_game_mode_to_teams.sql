-- Duplicate migration recorded in production: keep repo in sync.
-- Migration to add game_mode support for teams
-- This allows users to have separate teams for PvP and PvE modes

-- Step 1: Add game_mode column to teams table
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS game_mode TEXT NOT NULL DEFAULT 'pvp'
CHECK (game_mode IN ('pvp', 'pve'));

-- Step 2: Add game_mode column to team_memberships for denormalization/filtering
ALTER TABLE public.team_memberships
ADD COLUMN IF NOT EXISTS game_mode TEXT NOT NULL DEFAULT 'pvp'
CHECK (game_mode IN ('pvp', 'pve'));

-- Step 3: Modify user_system to have separate team IDs per game mode
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_system' 
    AND column_name = 'team_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_system' 
    AND column_name = 'pvp_team_id'
  ) THEN
    ALTER TABLE public.user_system RENAME COLUMN team_id TO pvp_team_id;
  END IF;
END $$;

ALTER TABLE public.user_system
ADD COLUMN IF NOT EXISTS pve_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Step 4: Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_teams_game_mode ON public.teams(game_mode);
CREATE INDEX IF NOT EXISTS idx_team_memberships_game_mode ON public.team_memberships(game_mode);
CREATE INDEX IF NOT EXISTS idx_user_system_pvp_team_id ON public.user_system(pvp_team_id);
CREATE INDEX IF NOT EXISTS idx_user_system_pve_team_id ON public.user_system(pve_team_id);

-- Step 5: Update team_memberships to match their team's game_mode (for existing data)
UPDATE public.team_memberships tm
SET game_mode = t.game_mode
FROM public.teams t
WHERE tm.team_id = t.id
AND tm.game_mode != t.game_mode;

-- Step 6: Create a trigger to automatically set game_mode on team_memberships when inserting
CREATE OR REPLACE FUNCTION sync_membership_game_mode()
RETURNS TRIGGER AS $$
BEGIN
  SELECT game_mode INTO NEW.game_mode
  FROM public.teams
  WHERE id = NEW.team_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_membership_game_mode ON public.team_memberships;
CREATE TRIGGER set_membership_game_mode
  BEFORE INSERT ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_membership_game_mode();
