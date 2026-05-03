import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest) => {
  const group_id = new URL(req.url).searchParams.get('group_id');
  if (!group_id) return apiError('group_id required');
  const rows = await query<unknown[]>(
    `SELECT gm.role, gm.joined_at, u.id, u.name, u.email, u.avatar
     FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ?`, [group_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { group_id, user_id } = await req.json();
  if (!group_id || !user_id) return apiError('group_id and user_id required');

  const admin = await query<unknown[]>('SELECT id FROM group_members WHERE group_id=? AND user_id=? AND role IN ("owner","admin")', [group_id, user.id]);
  if (!admin.length) return apiError('Not authorized', 403);

  await query('INSERT IGNORE INTO group_members (group_id, user_id, role) VALUES (?,?,?)', [group_id, user_id, 'member']);
  return apiResponse({ message: 'Member added' }, 201);
});
