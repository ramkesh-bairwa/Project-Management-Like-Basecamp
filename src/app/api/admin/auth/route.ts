import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiError } from '@/lib/api';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return apiError('Email and password required');

  const admins = await query<{ id: number; name: string; email: string; password: string; is_active: boolean }[]>(
    'SELECT id, name, email, password, is_active FROM admin_users WHERE email=?', [email]
  );

  if (!admins.length) return apiError('Invalid credentials', 401);
  const admin = admins[0];
  if (!admin.is_active) return apiError('Account disabled', 403);

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return apiError('Invalid credentials', 401);

  // Update last login
  await query('UPDATE admin_users SET last_login=NOW() WHERE id=?', [admin.id]);

  // Sign token with admin role
  const token = signToken({ id: admin.id, email: admin.email, role: 'admin', is_org: false });

  const res = NextResponse.json({ ok: true, token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  res.cookies.set('admin_token', token, { httpOnly: true, maxAge: 60 * 60 * 8, path: '/admin', sameSite: 'lax' });
  return res;
}

// POST /api/admin/auth/setup — create first admin (only if no admins exist)
export async function PUT(req: NextRequest) {
  const existing = await query<{ id: number }[]>('SELECT id FROM admin_users LIMIT 1');
  if (existing.length) return apiError('Admin already exists. Use login.', 403);

  const { name, email, password } = await req.json();
  if (!name || !email || !password) return apiError('name, email and password required');
  if (password.length < 8) return apiError('Password must be at least 8 characters');

  const hashed = await bcrypt.hash(password, 12);
  const result = await query<{ insertId: number }>(
    'INSERT INTO admin_users (name, email, password) VALUES (?,?,?)', [name, email, hashed]
  );
  return NextResponse.json({ ok: true, id: result.insertId, message: 'Admin created. You can now login at /admin/login' }, { status: 201 });
}
