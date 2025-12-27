-- Track account deletion attempts and cleanup retries
CREATE TABLE IF NOT EXISTS public.account_deletion_jobs (
  user_id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  last_error_details JSONB,
  last_error_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  dead_lettered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_jobs_status
  ON public.account_deletion_jobs(status);

CREATE INDEX IF NOT EXISTS idx_account_deletion_jobs_next_run
  ON public.account_deletion_jobs(next_run_at);

ALTER TABLE public.account_deletion_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read account deletion jobs" ON public.account_deletion_jobs;
CREATE POLICY "Admins can read account deletion jobs"
  ON public.account_deletion_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_system
      WHERE user_system.user_id = (select auth.uid())
        AND user_system.is_admin = true
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.account_deletion_jobs FROM anon, authenticated;
GRANT SELECT ON public.account_deletion_jobs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.account_deletion_jobs TO service_role;
