import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { sendVerificationEmail } from '@/lib/mailer';

// POST /api/admin/users/resend-verification { id } — send a fresh verification link to an unverified user
export const POST = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const { id } = await req.json();
  if (!id) return apiError('id required');

  const users = await query<{ id: number; name: string; email: string; email_verified: number }[]>(
    'SELECT id, name, email, email_verified FROM users WHERE id = ? LIMIT 1', [id]
  );
  if (!users.length) return apiError('User not found', 404);
  if (users[0].email_verified === 1) return apiError('This user is already verified');

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await query(
    'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
    [token, expires.toISOString().slice(0, 19).replace('T', ' '), id]
  );

  try {
    await sendVerificationEmail(users[0].email, users[0].name, token);
  } catch (err) {
    return apiError(`Could not send the email: ${err instanceof Error ? err.message : 'unknown error'}. Check Admin → SMTP & Email.`, 502);
  }
  return apiResponse({ message: `Verification email sent to ${users[0].email}` });
});
