import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const project_id = new URL(req.url).searchParams.get('project_id');
  if (!project_id) return apiError('project_id required');
  const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);
  const rows = await query<unknown[]>(
    `SELECT pg.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM project_group_members WHERE group_id=pg.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE group_id=pg.id AND parent_task_id IS NULL) as task_count
     FROM project_groups pg JOIN users u ON u.id=pg.created_by
     WHERE pg.project_id=? AND pg.deleted_at IS NULL ORDER BY pg.created_at ASC`, [project_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { project_id, name, description, color } = await req.json();
  if (!project_id || !name) return apiError('project_id and name required');
  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);
  if (!['owner','manager'].includes(member[0].role)) return apiError('Only owner or manager can create groups', 403);
  const result = await query<{ insertId: number }>(
    'INSERT INTO project_groups (project_id, name, description, color, created_by) VALUES (?,?,?,?,?)',
    [project_id, name, description || null, color || '#457b9d', user.id]
  );
  await query('INSERT INTO project_group_members (group_id, user_id, role) VALUES (?,?,?)', [result.insertId, user.id, 'lead']);
  return apiResponse({ id: result.insertId, name }, 201);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { id, name, description, color } = await req.json();
  if (!id) return apiError('id required');
  const grp = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=?', [id]);
  if (!grp.length) return apiError('Group not found', 404);
  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner','manager'].includes(member[0].role)) return apiError('Not authorized', 403);
  await query('UPDATE project_groups SET name=?, description=?, color=? WHERE id=?', [name, description || null, color || '#457b9d', id]);
  return apiResponse({ message: 'Group updated' });
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  const grp = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=? AND deleted_at IS NULL', [id]);
  if (!grp.length) return apiError('Group not found', 404);
  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner','manager'].includes(member[0].role)) return apiError('Not authorized', 403);
  await query('UPDATE project_groups SET deleted_at=NOW() WHERE id=?', [id]);
  // Soft delete tasks in this group
  await query('UPDATE tasks SET deleted_at=NOW() WHERE group_id=? AND deleted_at IS NULL', [id]);
  return apiResponse({ message: 'Group deleted' });
});
