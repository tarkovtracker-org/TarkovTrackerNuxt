ALTER FUNCTION public.sync_user_system_team_memberships() SET search_path TO 'public';

ALTER POLICY "Users can view own and teammates progress" ON public.user_progress
  USING (
    (user_progress.user_id = (select auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships tm1
      JOIN public.team_memberships tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = (select auth.uid())
        AND tm2.user_id = user_progress.user_id
    )
  );

ALTER POLICY "Admins can read audit logs" ON public.admin_audit_log
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_system
      WHERE user_system.user_id = (select auth.uid())
        AND user_system.is_admin = true
    )
  );

ALTER POLICY "Users can view own and teammate memberships" ON public.team_memberships
  USING (
    user_id = (select auth.uid())
    OR team_id = (
      SELECT user_system.pvp_team_id
      FROM public.user_system
      WHERE user_system.user_id = (select auth.uid())
      LIMIT 1
    )
    OR team_id = (
      SELECT user_system.pve_team_id
      FROM public.user_system
      WHERE user_system.user_id = (select auth.uid())
      LIMIT 1
    )
  );

ALTER POLICY "Users can view teams they are members of" ON public.teams
  USING (
    owner_id = (select auth.uid())
    OR id = (
      SELECT user_system.pvp_team_id
      FROM public.user_system
      WHERE user_system.user_id = (select auth.uid())
      LIMIT 1
    )
    OR id = (
      SELECT user_system.pve_team_id
      FROM public.user_system
      WHERE user_system.user_id = (select auth.uid())
      LIMIT 1
    )
  );

DROP TRIGGER IF EXISTS set_user_progress_updated_at ON public.user_progress;
CREATE TRIGGER set_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_system_updated_at ON public.user_system;
CREATE TRIGGER set_user_system_updated_at
  BEFORE UPDATE ON public.user_system
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_teams_updated_at ON public.teams;
CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP INDEX IF EXISTS public.idx_api_tokens_token_hash;
