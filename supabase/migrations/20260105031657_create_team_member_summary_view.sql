-- Create a summary view for team member progress stats

CREATE OR REPLACE VIEW public.team_member_summary AS
SELECT
  user_id,
  current_game_mode,
  (pvp_data ->> 'displayName'::text) AS pvp_display_name,
  ((pvp_data ->> 'level'::text))::integer AS pvp_level,
  (
    SELECT COUNT(*)::integer
    FROM jsonb_each(COALESCE((user_progress.pvp_data -> 'taskCompletions'::text), '{}'::jsonb)) tc(
      key,
      value
    )
    WHERE ((tc.value ->> 'complete'::text))::boolean = true
  ) AS pvp_tasks_completed,
  (pve_data ->> 'displayName'::text) AS pve_display_name,
  ((pve_data ->> 'level'::text))::integer AS pve_level,
  (
    SELECT COUNT(*)::integer
    FROM jsonb_each(COALESCE((user_progress.pve_data -> 'taskCompletions'::text), '{}'::jsonb)) tc(
      key,
      value
    )
    WHERE ((tc.value ->> 'complete'::text))::boolean = true
  ) AS pve_tasks_completed
FROM public.user_progress;
