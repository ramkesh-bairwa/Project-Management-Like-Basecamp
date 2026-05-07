import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req, user) => {
  const rows = await query<unknown[]>(
    `SELECT g.* FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = ?`, [user.id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { name, description, org_id, is_private, image } = await req.json();
  if (!name) return apiError('Group name required');

  const result = await query<{ insertId: number }>(
    'INSERT INTO groups (owner_id, org_id, name, description, image, is_private) VALUES (?,?,?,?,?,?)',
    [user.id, org_id || null, name, description || null, image || null, is_private ? 1 : 0]
  );
  await query('INSERT INTO group_members (group_id, user_id, role) VALUES (?,?,?)', [result.insertId, user.id, 'owner']);
  return apiResponse({ id: result.insertId, name }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  const groups = await query<{ owner_id: number }[]>('SELECT owner_id FROM groups WHERE id=?', [id]);
  if (!groups.length) return apiError('Group not found', 404);
  if (groups[0].owner_id !== user.id) return apiError('Only the group owner can delete it', 403);
  await query('DELETE FROM group_members WHERE group_id=?', [id]);
  await query('DELETE FROM groups WHERE id=?', [id]);
  return apiResponse({ message: 'Group deleted' });
});
