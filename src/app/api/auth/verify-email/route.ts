import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { apiError, apiResponse } from '@/lib/api';
import { signToken } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/mailer';

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return apiError('Token required');

  const users = await query<{ id: number; name: string; email: string; role: string; is_org: boolean; verification_token_expires: string }[]>(
    'SELECT id, name, email, role, is_org, verification_token_expires FROM users WHERE verification_token = ? AND email_verified = 0 LIMIT 1',
    [token]
  );

  if (!users.length) return apiError('Invalid or already used verification link', 400);

  if (new Date(users[0].verification_token_expires) < new Date()) {
    return apiError('Verification link has expired. Please request a new one.', 400);
  }

  await query(
    'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
    [users[0].id]
  );

  sendWelcomeEmail(users[0].email, users[0].name).catch(() => {});

  const authToken = signToken({ id: users[0].id, email: users[0].email, role: users[0].role, is_org: Boolean(users[0].is_org) });

  return apiResponse({ message: 'Email verified successfully.', token: authToken, user: { id: users[0].id, name: users[0].name, email: users[0].email } });
}
