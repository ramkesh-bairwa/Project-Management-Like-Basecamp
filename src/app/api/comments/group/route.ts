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

  const rows = await query<unknown[]>(
    `SELECT c.id, c.content, c.created_at, c.parent_id, c.is_resolved,
      u.name as user_name, u.avatar as user_avatar,
      t.id as task_id, t.title as task_title
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN tasks t ON t.id = c.entity_id
     WHERE c.entity_type = 'task'
       AND t.group_id = ?
       AND t.deleted_at IS NULL
       AND c.parent_id IS NULL
     ORDER BY c.created_at DESC
     LIMIT 50`,
    [group_id]
  );
  return apiResponse(rows);
});
