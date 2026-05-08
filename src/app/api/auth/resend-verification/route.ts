import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { apiError } from '@/lib/api';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return apiError('Email required');

  const users = await query<{ id: number; name: string; email_verified: number }[]>(
    'SELECT id, name, email_verified FROM users WHERE email = ? LIMIT 1', [email]
  );

  // Always return success to avoid email enumeration
  if (!users.length || users[0].email_verified === 1) {
    return NextResponse.json({ message: 'If that email exists and is unverified, a new link has been sent.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await query(
    'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
    [token, expires.toISOString().slice(0, 19).replace('T', ' '), users[0].id]
  );

  try {
    await sendVerificationEmail(email, users[0].name, token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send email';
    return apiError(msg);
  }

  return NextResponse.json({ message: 'Verification email resent. Please check your inbox.' });
}
