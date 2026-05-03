import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/api';

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) return apiError('All fields required');

  const existing = await query<unknown[]>('SELECT id FROM users WHERE email = ?', [email]);
  if ((existing as unknown[]).length > 0) return apiError('Email already registered');

  const hashed = await bcrypt.hash(password, 10);
  const plans = await query<{ id: number }[]>('SELECT id FROM plans WHERE price = 0 LIMIT 1');
  const planId = plans[0]?.id || null;

  const result = await query<{ insertId: number }>('INSERT INTO users (name, email, password, plan_id) VALUES (?, ?, ?, ?)', [name, email, hashed, planId]);
  const token = signToken({ id: result.insertId, email, role: 'user', is_org: false });

  const res = apiResponse({ user: { id: result.insertId, name, email, role: 'user', is_org: false }, token }, 201);
  res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7 });
  return res;
}
