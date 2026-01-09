-- Fix admin_audit_log foreign key to allow admin account deletion
-- The original constraint had no ON DELETE clause, which blocks deletion of admin users

-- Drop the existing foreign key constraint
ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_admin_user_id_fkey;

-- Add the constraint back with ON DELETE CASCADE
-- This allows admin users to delete their accounts without orphaning audit logs
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_admin_user_id_fkey
  FOREIGN KEY (admin_user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Add comment explaining the cascade behavior
COMMENT ON CONSTRAINT admin_audit_log_admin_user_id_fkey ON public.admin_audit_log IS
  'Cascades deletion of audit logs when an admin user is deleted. This is necessary to allow admin account deletion.';
