-- Add function to clean up old account deletion attempts
-- This helps prevent table bloat while maintaining recent audit history

-- Function to delete attempts older than specified days (default 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_deletion_attempts(
  retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  deleted_count BIGINT,
  oldest_remaining TIMESTAMPTZ
) AS $$
DECLARE
  v_deleted_count BIGINT;
  v_oldest_remaining TIMESTAMPTZ;
BEGIN
  -- Delete attempts older than retention period
  WITH deleted AS (
    DELETE FROM public.account_deletion_attempts
    WHERE attempted_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  -- Get the oldest remaining attempt timestamp
  SELECT MIN(attempted_at) INTO v_oldest_remaining
  FROM public.account_deletion_attempts;

  RETURN QUERY SELECT v_deleted_count, v_oldest_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION public.cleanup_old_deletion_attempts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_deletion_attempts(INTEGER) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.cleanup_old_deletion_attempts(INTEGER) IS
  'Deletes account deletion attempts older than the specified retention period (default 90 days). Returns the count of deleted records and the oldest remaining timestamp. Should be called periodically via a scheduled job or edge function.';
