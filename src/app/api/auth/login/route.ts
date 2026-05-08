import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiError } from '@/lib/api';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return apiError('All fields required');

  const users = await query<{ id: number; name: string; email: string; password: string; role: string; is_org: boolean; email_verified: number }[]>(
    'SELECT id, name, email, password, role, is_org, email_verified FROM users WHERE email = ?', [email]
  );
  if (!users.length) return apiError('Invalid credentials', 401);

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return apiError('Invalid credentials', 401);

  // Check verification only if the feature is enabled
  const setting = await query<{ value: string }[]>(
    "SELECT value FROM site_settings WHERE `key` = 'email_verification_enabled' LIMIT 1"
  );
  const verificationEnabled = setting[0]?.value === '1';

  if (verificationEnabled && user.email_verified != 1) {
    return apiError('Please verify your email before logging in. Check your inbox.', 403);
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role, is_org: user.is_org });

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, is_org: user.is_org }, token });
  res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' });
  return res;
}
