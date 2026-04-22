-- Add password expiration column for time-boxed credentials (tenant support users).
-- Regular users have NULL (no expiry). Support users get a value set when the
-- super admin generates a one-time password; login is rejected when now() > expires_at.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_expires_at" TIMESTAMPTZ;
