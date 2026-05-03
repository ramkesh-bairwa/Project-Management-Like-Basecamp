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
  const { name, description, org_id, is_private } = await req.json();
  if (!name) return apiError('Group name required');

  const result = await query<{ insertId: number }>(
    'INSERT INTO groups (owner_id, org_id, name, description, is_private) VALUES (?,?,?,?,?)',
    [user.id, org_id || null, name, description || null, is_private ? 1 : 0]
  );
  await query('INSERT INTO group_members (group_id, user_id, role) VALUES (?,?,?)', [result.insertId, user.id, 'owner']);
  return apiResponse({ id: result.insertId, name }, 201);
});
