import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest) => {
  const group_id = new URL(req.url).searchParams.get('group_id');
  if (!group_id) return apiError('group_id required');
  const rows = await query<unknown[]>(
    `SELECT pgm.role, pgm.joined_at, u.id, u.name, u.email, u.avatar
     FROM project_group_members pgm JOIN users u ON u.id=pgm.user_id WHERE pgm.group_id=?`, [group_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { group_id, user_id, role } = await req.json();
  if (!group_id || !user_id) return apiError('group_id and user_id required');
  const grp = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=?', [group_id]);
  if (!grp.length) return apiError('Group not found', 404);
  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner','manager'].includes(member[0].role)) return apiError('Not authorized', 403);
  await query('INSERT INTO project_group_members (group_id, user_id, role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [group_id, user_id, role || 'member']);
  return apiResponse({ message: 'Member added' }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const { group_id, user_id } = await req.json();
  const grp = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=?', [group_id]);
  if (!grp.length) return apiError('Group not found', 404);
  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner','manager'].includes(member[0].role)) return apiError('Not authorized', 403);
  await query('DELETE FROM project_group_members WHERE group_id=? AND user_id=?', [group_id, user_id]);
  return apiResponse({ message: 'Member removed' });
});
