import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/api';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return apiError('All fields required');

  const users = await query<{ id: number; name: string; email: string; password: string; role: string; is_org: boolean }[]>(
    'SELECT id, name, email, password, role, is_org FROM users WHERE email = ?', [email]
  );
  if (!users.length) return apiError('Invalid credentials', 401);

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return apiError('Invalid credentials', 401);

  const token = signToken({ id: user.id, email: user.email, role: user.role, is_org: user.is_org });
  const res = apiResponse({ user: { id: user.id, name: user.name, email: user.email, role: user.role, is_org: user.is_org }, token });
  res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7 });
  return res;
}
