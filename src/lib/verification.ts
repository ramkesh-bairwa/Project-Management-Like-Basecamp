import { query } from '@/lib/db';

// email_verified=1 is required to log in. With email verification ON the user
// sets it by clicking the emailed link; with it OFF an admin must approve the
// account (Admin → Users → Verify) before it can be used.
export const PENDING_APPROVAL_MESSAGE =
  'Your account is waiting for admin approval. You will be able to log in once an admin approves it.';

export async function isEmailVerificationEnabled() {
  const setting = await query<{ value: string }[]>(
    "SELECT value FROM site_settings WHERE `key` = 'email_verification_enabled' LIMIT 1"
  );
  return setting[0]?.value === '1';
}
