import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req, user) => {
  const rows = await query<unknown[]>(
    `SELECT u.id, u.name, u.email, u.avatar, u.bio, u.role, u.is_org, u.created_at,
      p.name as plan_name, p.max_projects, p.max_members
     FROM users u LEFT JOIN plans p ON u.plan_id = p.id WHERE u.id = ?`, [user.id]
  );
  if (!rows.length) return apiError('User not found', 404);
  return apiResponse(rows[0]);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { name, bio, avatar } = await req.json();
  await query('UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?', [name, bio, avatar, user.id]);
  return apiResponse({ message: 'Profile updated' });
});
