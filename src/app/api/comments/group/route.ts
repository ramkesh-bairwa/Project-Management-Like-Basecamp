import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const group_id = new URL(req.url).searchParams.get('group_id');
  if (!group_id) return apiError('group_id required');

  const grp = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=? AND deleted_at IS NULL', [group_id]);
  if (!grp.length) return apiError('Group not found', 404);

  const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);

  // All task_history entries for tasks in this group — exclude comment_added (shown as actual comments) and subtask_added (noise)
  const history = await query<unknown[]>(
    `SELECT
       th.id, th.action, th.old_value, th.new_value, th.created_at,
       u.name as user_name,
       t.id as task_id, t.title as task_title,
       'history' as kind
     FROM task_history th
     JOIN users u ON u.id = th.changed_by
     JOIN tasks t ON t.id = th.task_id
     WHERE t.group_id = ?
       AND th.action NOT IN ('comment_added', 'subtask_added')
     ORDER BY th.created_at DESC
     LIMIT 100`,
    [group_id]
  );

  // All comments for tasks in this group
  const comments = await query<unknown[]>(
    `SELECT
       c.id, c.content, c.created_at, c.is_resolved,
       u.name as user_name,
       t.id as task_id, t.title as task_title,
       'comment' as kind
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN tasks t ON t.id = c.entity_id
     WHERE c.entity_type = 'task'
       AND t.group_id = ?
       AND t.deleted_at IS NULL
       AND c.deleted_at IS NULL
       AND c.parent_id IS NULL
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [group_id]
  );

  // Merge and sort by created_at desc, limit 80
  const all = [...history, ...comments].sort((a, b) => {
    const ta = new Date((a as { created_at: string }).created_at).getTime();
    const tb = new Date((b as { created_at: string }).created_at).getTime();
    return tb - ta;
  }).slice(0, 80);

  return apiResponse(all);
});
