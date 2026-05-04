import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { createNotification } from '@/app/api/notifications/route';

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get('entity_type');
  const entity_id = searchParams.get('entity_id');
  if (!entity_type || !entity_id) return apiError('entity_type and entity_id required');

  // Fetch all comments flat, client builds tree
  const rows = await query<unknown[]>(
    `SELECT c.*, u.name as user_name, u.avatar as user_avatar,
      ru.name as resolved_by_name
     FROM comments c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN users ru ON ru.id = c.resolved_by
     WHERE c.entity_type=? AND c.entity_id=?
     ORDER BY c.created_at ASC`,
    [entity_type, entity_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { entity_type, entity_id, content, parent_id } = await req.json();
  if (!entity_type || !entity_id || !content) return apiError('entity_type, entity_id and content required');

  const result = await query<{ insertId: number }>(
    'INSERT INTO comments (user_id, entity_type, entity_id, parent_id, content) VALUES (?,?,?,?,?)',
    [user.id, entity_type, entity_id, parent_id || null, content]
  );

  // Log on task history if commenting on a task
  if (entity_type === 'task') {
    await query(
      'INSERT INTO task_history (task_id, changed_by, action, new_value) VALUES (?,?,?,?)',
      [entity_id, user.id, 'comment_added', content.substring(0, 100)]
    );
    // Notify task assignee and project members
    const task = await query<{ project_id: number; assignee_id: number | null; title: string }[]>('SELECT project_id, assignee_id, title FROM tasks WHERE id=?', [entity_id]);
    if (task.length) {
      const commenter = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
      const targets = await query<{ user_id: number }[]>('SELECT user_id FROM project_members WHERE project_id=? AND user_id != ?', [task[0].project_id, user.id]);
      for (const t of targets) {
        await createNotification(t.user_id, 'task',
          `New comment on task "${task[0].title}"`,
          `${commenter[0]?.name || 'Someone'}: ${content.substring(0, 80)}`,
          `/projects/${task[0].project_id}/tasks/${entity_id}`
        );
      }
    }
  }

  return apiResponse({ id: result.insertId, content }, 201);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { id, content, resolve, unresolve } = await req.json();
  if (!id) return apiError('id required');

  if (resolve) {
    await query('UPDATE comments SET is_resolved=TRUE, resolved_by=?, resolved_at=NOW() WHERE id=?', [user.id, id]);
    return apiResponse({ message: 'Comment resolved' });
  }
  if (unresolve) {
    await query('UPDATE comments SET is_resolved=FALSE, resolved_by=NULL, resolved_at=NULL WHERE id=?', [id]);
    return apiResponse({ message: 'Comment unresolved' });
  }
  if (!content) return apiError('content required');
  await query('UPDATE comments SET content=? WHERE id=? AND user_id=?', [content, id, user.id]);
  return apiResponse({ message: 'Comment updated' });
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  // Only author can delete, or manager/owner
  const comment = await query<{ user_id: number; entity_type: string; entity_id: number }[]>('SELECT user_id, entity_type, entity_id FROM comments WHERE id=?', [id]);
  if (!comment.length) return apiError('Comment not found', 404);
  if (comment[0].user_id !== user.id) {
    // Check if manager/owner of the project
    if (comment[0].entity_type === 'task') {
      const task = await query<{ project_id: number }[]>('SELECT project_id FROM tasks WHERE id=?', [comment[0].entity_id]);
      if (task.length) {
        const m = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [task[0].project_id, user.id]);
        if (!m.length || !['owner','manager'].includes(m[0].role)) return apiError('Not authorized', 403);
      }
    } else {
      return apiError('Not authorized', 403);
    }
  }
  await query('DELETE FROM comments WHERE id=?', [id]);
  return apiResponse({ message: 'Comment deleted' });
});
