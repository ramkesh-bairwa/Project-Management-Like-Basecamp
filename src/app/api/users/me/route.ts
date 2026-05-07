import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import bcrypt from 'bcryptjs';

export const GET = withAuth(async (_req, user) => {
  const rows = await query<unknown[]>(
    `SELECT u.id, u.name, u.email, u.avatar, u.bio, u.mobile, u.gender, u.role, u.is_org, u.created_at,
      p.name as plan_name, p.max_projects, p.max_members
     FROM users u LEFT JOIN plans p ON u.plan_id = p.id WHERE u.id = ?`, [user.id]
  );
  if (!rows.length) return apiError('User not found', 404);
  return apiResponse(rows[0]);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { name, bio, avatar, mobile, gender, current_password, new_password } = await req.json();

  if (new_password) {
    const rows = await query<{ password: string }[]>('SELECT password FROM users WHERE id = ?', [user.id]);
    if (!rows.length) return apiError('User not found', 404);
    const valid = await bcrypt.compare(current_password || '', rows[0].password);
    if (!valid) return apiError('Current password is incorrect', 400);
    const hashed = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
  }

  await query(
    'UPDATE users SET name = ?, bio = ?, avatar = ?, mobile = ?, gender = ? WHERE id = ?',
    [name, bio, avatar, mobile || null, gender || null, user.id]
  );
  return apiResponse({ message: 'Profile updated' });
});
