-- Create RPC function to increment token usage count atomically
CREATE OR REPLACE FUNCTION public.increment_token_usage(p_token_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_tokens
  SET
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW()
  WHERE token_id = p_token_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.increment_token_usage(UUID) TO service_role;

-- Create RPC function to update task completion in nested JSON
CREATE OR REPLACE FUNCTION public.update_task_completion(
  p_user_id UUID,
  p_game_mode TEXT,
  p_task_id TEXT,
  p_complete BOOLEAN,
  p_failed BOOLEAN,
  p_timestamp BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_field TEXT;
  v_current_data JSONB;
  v_task_completions JSONB;
BEGIN
  -- Determine which data field to update
  IF p_game_mode = 'pve' THEN
    v_data_field := 'pve_data';
  ELSE
    v_data_field := 'pvp_data';
  END IF;

  -- Get current data
  EXECUTE format('SELECT %I FROM public.user_progress WHERE user_id = $1', v_data_field)
  INTO v_current_data
  USING p_user_id;

  -- Initialize if null
  IF v_current_data IS NULL THEN
    v_current_data := '{}'::JSONB;
  END IF;

  -- Get or initialize taskCompletions
  v_task_completions := COALESCE(v_current_data->'taskCompletions', '{}'::JSONB);

  -- Update the specific task
  v_task_completions := jsonb_set(
    v_task_completions,
    ARRAY[p_task_id],
    jsonb_build_object(
      'complete', p_complete,
      'failed', p_failed,
      'timestamp', p_timestamp
    )
  );

  -- Update the data with new taskCompletions
  v_current_data := jsonb_set(v_current_data, ARRAY['taskCompletions'], v_task_completions);

  -- Save back to database
  EXECUTE format('UPDATE public.user_progress SET %I = $1 WHERE user_id = $2', v_data_field)
  USING v_current_data, p_user_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.update_task_completion(UUID, TEXT, TEXT, BOOLEAN, BOOLEAN, BIGINT) TO service_role;
