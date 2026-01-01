ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS enable_manual_task_fail BOOLEAN DEFAULT FALSE;
