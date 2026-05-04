import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req: NextRequest, user) => {
  const [projects, groups, tasks, comments] = await Promise.all([
    // Deleted projects owned by or member of
    query<unknown[]>(
      `SELECT p.id, p.name, p.description, p.status, p.priority, p.deleted_at
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE p.deleted_at IS NOT NULL AND (p.owner_id = ? OR pm.user_id = ?)
       ORDER BY p.deleted_at DESC`,
      [user.id, user.id, user.id]
    ),
    // Deleted project groups
    query<unknown[]>(
      `SELECT pg.id, pg.name, pg.description, pg.color, pg.deleted_at,
        p.name as project_name, p.id as project_id
       FROM project_groups pg
       JOIN projects p ON p.id = pg.project_id
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE pg.deleted_at IS NOT NULL
       ORDER BY pg.deleted_at DESC`,
      [user.id]
    ),
    // Deleted tasks
    query<unknown[]>(
      `SELECT t.id, t.title, t.description, t.status, t.priority, t.deleted_at,
        p.name as project_name, p.id as project_id,
        pg.name as group_name, pg.color as group_color
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN project_groups pg ON pg.id = t.group_id
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE t.deleted_at IS NOT NULL AND t.parent_task_id IS NULL
       ORDER BY t.deleted_at DESC`,
      [user.id]
    ),
    // Deleted comments
    query<unknown[]>(
      `SELECT c.id, c.content, c.entity_type, c.entity_id, c.deleted_at,
        u.name as user_name,
        CASE WHEN c.entity_type='task' THEN t.title ELSE NULL END as task_title,
        CASE WHEN c.entity_type='task' THEN p.name ELSE NULL END as project_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN tasks t ON t.id = c.entity_id AND c.entity_type = 'task'
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE c.deleted_at IS NOT NULL AND c.user_id = ?
       ORDER BY c.deleted_at DESC`,
      [user.id]
    ),
  ]);

  return apiResponse({ projects, groups, tasks, comments });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { type, id } = await req.json();
  if (!type || !id) return apiError('type and id required');

  if (type === 'project') {
    const rows = await query<{ owner_id: number }[]>('SELECT owner_id FROM projects WHERE id=? AND deleted_at IS NOT NULL', [id]);
    if (!rows.length) return apiError('Not found', 404);
    if (rows[0].owner_id !== user.id) return apiError('Not authorized', 403);
    await query('UPDATE projects SET deleted_at=NULL WHERE id=?', [id]);
    await query('UPDATE tasks SET deleted_at=NULL WHERE project_id=? AND deleted_at IS NOT NULL', [id]);
    await query('UPDATE project_groups SET deleted_at=NULL WHERE project_id=? AND deleted_at IS NOT NULL', [id]);
  } else if (type === 'group') {
    const rows = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=? AND deleted_at IS NOT NULL', [id]);
    if (!rows.length) return apiError('Not found', 404);
    const m = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [rows[0].project_id, user.id]);
    if (!m.length || !['owner', 'manager'].includes(m[0].role)) return apiError('Not authorized', 403);
    await query('UPDATE project_groups SET deleted_at=NULL WHERE id=?', [id]);
    await query('UPDATE tasks SET deleted_at=NULL WHERE group_id=? AND deleted_at IS NOT NULL', [id]);
  } else if (type === 'task') {
    const rows = await query<{ project_id: number }[]>('SELECT project_id FROM tasks WHERE id=? AND deleted_at IS NOT NULL', [id]);
    if (!rows.length) return apiError('Not found', 404);
    const m = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [rows[0].project_id, user.id]);
    if (!m.length || !['owner', 'manager'].includes(m[0].role)) return apiError('Not authorized', 403);
    await query('UPDATE tasks SET deleted_at=NULL WHERE id=?', [id]);
  } else if (type === 'comment') {
    const rows = await query<{ user_id: number }[]>('SELECT user_id FROM comments WHERE id=? AND deleted_at IS NOT NULL', [id]);
    if (!rows.length) return apiError('Not found', 404);
    if (rows[0].user_id !== user.id) return apiError('Not authorized', 403);
    await query('UPDATE comments SET deleted_at=NULL WHERE id=?', [id]);
  } else {
    return apiError('Invalid type');
  }

  return apiResponse({ message: 'Restored' });
});
