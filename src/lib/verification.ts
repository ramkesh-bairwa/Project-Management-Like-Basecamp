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

// Signed-in users whose account is still unverified are kept on /account-pending.
// The result is cached briefly so every request doesn't hit the database,
// and an admin's approval takes effect within APPROVAL_CACHE_MS.
const APPROVAL_CACHE_MS = 15_000;
const approvalCache = new Map<number, { approved: boolean; at: number }>();

export async function isUserApproved(userId: number) {
  const hit = approvalCache.get(userId);
  if (hit && Date.now() - hit.at < APPROVAL_CACHE_MS) return hit.approved;
  const rows = await query<{ email_verified: number }[]>(
    'SELECT email_verified FROM users WHERE id = ? LIMIT 1', [userId]
  );
  const approved = rows.length > 0 && rows[0].email_verified == 1;
  approvalCache.set(userId, { approved, at: Date.now() });
  return approved;
}
