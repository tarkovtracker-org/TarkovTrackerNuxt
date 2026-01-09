-- Fix account_deletion_attempts to NOT cascade delete when user is deleted
-- This preserves the audit trail and rate limiting history even after account deletion

-- First, make user_id nullable (required for ON DELETE SET NULL to work)
ALTER TABLE public.account_deletion_attempts
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop the existing foreign key constraint with CASCADE
ALTER TABLE public.account_deletion_attempts
  DROP CONSTRAINT IF EXISTS account_deletion_attempts_user_id_fkey;

-- Add the constraint back WITHOUT cascade deletion
-- This allows the audit trail to persist even after the user is deleted
ALTER TABLE public.account_deletion_attempts
  ADD CONSTRAINT account_deletion_attempts_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Add comments explaining the behavior
COMMENT ON COLUMN public.account_deletion_attempts.user_id IS
  'Nullable to preserve deletion attempt history after user deletion (ON DELETE SET NULL).';

COMMENT ON CONSTRAINT account_deletion_attempts_user_id_fkey ON public.account_deletion_attempts IS
  'Sets user_id to NULL when user is deleted, preserving the audit trail for rate limiting and security monitoring.';
