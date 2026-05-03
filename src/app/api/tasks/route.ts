import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

type TaskRow = { id: number; project_id: number; title: string; status: string; priority: string; assignee_id: number | null; group_id: number | null };

async function logHistory(task_id: number, changed_by: number, action: string, old_value: string | null, new_value: string | null, note?: string) {
  await query(
    'INSERT INTO task_history (task_id, changed_by, action, old_value, new_value, note) VALUES (?,?,?,?,?,?)',
    [task_id, changed_by, action, old_value, new_value, note || null]
  );
}

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const project_id = searchParams.get('project_id');
  const group_id = searchParams.get('group_id');
  const parent_task_id = searchParams.get('parent_task_id');

  if (!project_id && !group_id && !parent_task_id) return apiError('project_id, group_id, or parent_task_id required');

  let sql = `SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar,
    pg.name as group_name, pg.color as group_color,
    (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as subtask_count,
    (SELECT COUNT(*) FROM comments WHERE entity_type='task' AND entity_id = t.id) as comment_count
   FROM tasks t
   LEFT JOIN users u ON u.id = t.assignee_id
   LEFT JOIN project_groups pg ON pg.id = t.group_id
   WHERE `;

  const params: (string | number)[] = [];

  if (parent_task_id) {
    sql += 't.parent_task_id = ?';
    params.push(parent_task_id);
  } else if (group_id) {
    sql += 't.group_id = ? AND t.parent_task_id IS NULL';
    params.push(group_id);
  } else {
    const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [project_id!, user.id]);
    if (!member.length) return apiError('Not a project member', 403);
    sql += 't.project_id = ? AND t.parent_task_id IS NULL';
    params.push(project_id!);
  }

  sql += ' ORDER BY t.position ASC, t.created_at ASC';
  const rows = await query<unknown[]>(sql, params);
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { project_id, group_id, parent_task_id, title, description, assignee_id, status, priority, due_date, estimated_hours } = await req.json();
  if (!project_id || !title) return apiError('project_id and title required');

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);

  const result = await query<{ insertId: number }>(
    'INSERT INTO tasks (project_id, group_id, created_by, assignee_id, parent_task_id, title, description, status, priority, due_date, estimated_hours) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [project_id, group_id || null, user.id, assignee_id || null, parent_task_id || null, title, description || null, status || 'todo', priority || 'medium', due_date || null, estimated_hours || null]
  );

  await logHistory(result.insertId, user.id, 'created', null, title);
  if (assignee_id) await logHistory(result.insertId, user.id, 'assigned', null, String(assignee_id));

  return apiResponse({ id: result.insertId, title }, 201);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { id, title, description, assignee_id, status, priority, due_date, actual_hours, position, group_id } = await req.json();
  if (!id) return apiError('Task id required');

  const tasks = await query<TaskRow[]>('SELECT * FROM tasks WHERE id=?', [id]);
  if (!tasks.length) return apiError('Task not found', 404);
  const old = tasks[0];

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [old.project_id, user.id]);
  if (!member.length) return apiError('Not authorized', 403);

  const userRole = member[0].role;

  // Developers cannot reopen a task closed by manager/owner
  if (old.status === 'done' && status !== 'done' && userRole === 'developer') {
    const lastClose = await query<{ changed_by: number; action: string }[]>(
      `SELECT changed_by, action FROM task_history WHERE task_id=? AND action='status_changed' AND new_value='done' ORDER BY created_at DESC LIMIT 1`, [id]
    );
    if (lastClose.length) {
      const closer = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [old.project_id, lastClose[0].changed_by]);
      if (closer.length && ['owner','manager'].includes(closer[0].role)) {
        return apiError('Task was closed by a manager. Only a manager or owner can reopen it.', 403);
      }
    }
  }

  await query(
    'UPDATE tasks SET title=?, description=?, assignee_id=?, status=?, priority=?, due_date=?, actual_hours=?, position=?, group_id=? WHERE id=?',
    [title ?? old.title, description ?? null, assignee_id ?? null, status ?? old.status, priority ?? old.priority, due_date ?? null, actual_hours ?? null, position ?? 0, group_id ?? old.group_id, id]
  );

  // Log each change
  if (status && status !== old.status) {
    const action = status === 'done' ? 'closed' : old.status === 'done' ? 'reopened' : 'status_changed';
    await logHistory(id, user.id, action, old.status, status);
  }
  if (title && title !== old.title) await logHistory(id, user.id, 'title_changed', old.title, title);
  if (priority && priority !== old.priority) await logHistory(id, user.id, 'priority_changed', old.priority, priority);
  if (assignee_id !== undefined && assignee_id !== old.assignee_id) {
    await logHistory(id, user.id, assignee_id ? 'assigned' : 'unassigned', old.assignee_id ? String(old.assignee_id) : null, assignee_id ? String(assignee_id) : null);
  }
  if (group_id !== undefined && group_id !== old.group_id) {
    await logHistory(id, user.id, 'moved_group', old.group_id ? String(old.group_id) : null, group_id ? String(group_id) : null);
  }

  return apiResponse({ message: 'Task updated' });
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('Task id required');

  const tasks = await query<TaskRow[]>('SELECT * FROM tasks WHERE id=?', [id]);
  if (!tasks.length) return apiError('Task not found', 404);

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [tasks[0].project_id, user.id]);
  if (!member.length || !['owner','manager'].includes(member[0].role)) return apiError('Not authorized', 403);

  await query('DELETE FROM tasks WHERE id=?', [id]);
  return apiResponse({ message: 'Task deleted' });
});
