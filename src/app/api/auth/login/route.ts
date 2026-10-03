import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { isEmailVerificationEnabled, PENDING_APPROVAL_MESSAGE } from '@/lib/verification';

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

  // Unverified accounts can't log in: they verify by email when that's enabled, otherwise an admin must approve them
  if (user.email_verified != 1) {
    if (await isEmailVerificationEnabled()) {
      return apiError('Please verify your email before logging in. Check your inbox.', 403);
    }
    return NextResponse.json({ error: PENDING_APPROVAL_MESSAGE, code: 'PENDING_APPROVAL' }, { status: 403 });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role, is_org: user.is_org });

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, is_org: user.is_org }, token });
  res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' });
  return res;
}
