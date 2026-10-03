import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';
import { apiResponse } from '@/lib/api';
import { isEmailVerificationEnabled } from '@/lib/verification';

// GET /api/auth/account-status — used by /account-pending. Not wrapped in withAuth,
// because withAuth turns unverified users away and this is the page they wait on.
export async function GET(req: NextRequest) {
  const emailVerificationEnabled = await isEmailVerificationEnabled();
  const user = getTokenFromRequest(req);
  if (!user) return apiResponse({ signedIn: false, emailVerificationEnabled });

  const rows = await query<{ name: string; email: string; email_verified: number }[]>(
    'SELECT name, email, email_verified FROM users WHERE id = ? LIMIT 1', [user.id]
  );
  if (!rows.length) return apiResponse({ signedIn: false, emailVerificationEnabled });

  return apiResponse({
    signedIn: true,
    name: rows[0].name,
    email: rows[0].email,
    approved: rows[0].email_verified == 1,
    emailVerificationEnabled,
  });
}
