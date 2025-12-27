-- Add atomic ownership transfer function to prevent race conditions
-- This ensures that ownership transfer validates the new owner is still a team member

CREATE OR REPLACE FUNCTION transfer_team_ownership(
  p_team_id UUID,
  p_old_owner_id UUID,
  p_new_owner_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify new owner is still a member of the team
  IF NOT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_id = p_team_id
      AND user_id = p_new_owner_id
  ) THEN
    RAISE EXCEPTION 'New owner (%) is not a member of team %', p_new_owner_id, p_team_id;
  END IF;

  -- Verify old owner still owns the team (prevent concurrent transfers)
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id
      AND owner_id = p_old_owner_id
  ) THEN
    RAISE EXCEPTION 'User % is not the owner of team %', p_old_owner_id, p_team_id;
  END IF;

  -- Transfer ownership atomically
  UPDATE teams
  SET owner_id = p_new_owner_id
  WHERE id = p_team_id
    AND owner_id = p_old_owner_id;

  -- Update the new owner's role to 'owner' in team_memberships
  UPDATE team_memberships
  SET role = 'owner'
  WHERE team_id = p_team_id
    AND user_id = p_new_owner_id;

  -- Update the old owner's role to 'member' (if they're still in the team)
  UPDATE team_memberships
  SET role = 'member'
  WHERE team_id = p_team_id
    AND user_id = p_old_owner_id;
END;
$$;

-- Grant execute permission to authenticated users
-- This allows Edge Functions using service role to call this function
GRANT EXECUTE ON FUNCTION transfer_team_ownership(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_team_ownership(UUID, UUID, UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION transfer_team_ownership(UUID, UUID, UUID) IS
  'Atomically transfers team ownership from old owner to new owner. Validates that new owner is a team member and prevents race conditions.';
