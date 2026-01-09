-- Fix account deletion rate limiting by tracking individual attempts
-- The previous implementation was broken because account_deletion_jobs has user_id as PRIMARY KEY

-- Create table to track individual deletion attempts for rate limiting
CREATE TABLE IF NOT EXISTS public.account_deletion_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR,
  user_agent TEXT
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_account_deletion_attempts_user_time
  ON public.account_deletion_attempts(user_id, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.account_deletion_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update/delete (Edge Functions)
REVOKE ALL ON public.account_deletion_attempts FROM anon, authenticated;
GRANT SELECT, INSERT ON public.account_deletion_attempts TO service_role;

-- Admins can view attempts for monitoring
DROP POLICY IF EXISTS "Admins can view deletion attempts" ON public.account_deletion_attempts;
CREATE POLICY "Admins can view deletion attempts"
  ON public.account_deletion_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_system
      WHERE user_system.user_id = (SELECT auth.uid())
        AND user_system.is_admin = true
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.account_deletion_attempts IS
  'Tracks individual account deletion attempts for rate limiting purposes. Each user-initiated deletion request creates a new record.';
