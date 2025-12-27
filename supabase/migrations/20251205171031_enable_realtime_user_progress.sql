-- Duplicate migration recorded in production: keep repo in sync.
-- Enable Realtime on user_progress table for team sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
  END IF;
END $$;
