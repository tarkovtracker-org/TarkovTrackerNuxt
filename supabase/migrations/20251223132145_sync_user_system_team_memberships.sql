-- Keep user_system team IDs in sync with team_memberships per game mode.
CREATE OR REPLACE FUNCTION public.sync_user_system_team_memberships()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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
