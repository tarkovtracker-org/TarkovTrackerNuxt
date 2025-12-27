-- Keep user_system team IDs in sync with team_memberships per game mode.
-- Also enforce one team per user per game mode and remove duplicate index.

-- Prevent multiple teams per user per game mode.
CREATE UNIQUE INDEX IF NOT EXISTS team_memberships_user_mode_unique
  ON public.team_memberships (user_id, game_mode);

-- Remove duplicate index left over from legacy team_id rename.
DROP INDEX IF EXISTS public.idx_user_system_team_id;

-- Sync user_system when memberships change.
CREATE OR REPLACE FUNCTION public.sync_user_system_team_memberships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.game_mode = 'pve' THEN
      UPDATE public.user_system
      SET pve_team_id = NEW.team_id,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE public.user_system
      SET pvp_team_id = NEW.team_id,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.game_mode = 'pve' THEN
      UPDATE public.user_system
      SET pve_team_id = NULL,
          updated_at = NOW()
      WHERE user_id = OLD.user_id
        AND pve_team_id = OLD.team_id;
    ELSE
      UPDATE public.user_system
      SET pvp_team_id = NULL,
          updated_at = NOW()
      WHERE user_id = OLD.user_id
        AND pvp_team_id = OLD.team_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.team_id IS DISTINCT FROM NEW.team_id)
      OR (OLD.game_mode IS DISTINCT FROM NEW.game_mode) THEN
      IF OLD.game_mode = 'pve' THEN
        UPDATE public.user_system
        SET pve_team_id = NULL,
            updated_at = NOW()
        WHERE user_id = OLD.user_id
          AND pve_team_id = OLD.team_id;
      ELSE
        UPDATE public.user_system
        SET pvp_team_id = NULL,
            updated_at = NOW()
        WHERE user_id = OLD.user_id
          AND pvp_team_id = OLD.team_id;
      END IF;
    END IF;
    IF NEW.game_mode = 'pve' THEN
      UPDATE public.user_system
      SET pve_team_id = NEW.team_id,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE public.user_system
      SET pvp_team_id = NEW.team_id,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS team_memberships_sync_user_system ON public.team_memberships;
CREATE TRIGGER team_memberships_sync_user_system
AFTER INSERT OR UPDATE OR DELETE ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.sync_user_system_team_memberships();
