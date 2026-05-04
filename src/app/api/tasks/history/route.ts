import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest) => {
  const task_id = new URL(req.url).searchParams.get('task_id');
  if (!task_id) return apiError('task_id required');
  // Include history for the task itself AND its subtasks
  const rows = await query<unknown[]>(
    `SELECT th.*, u.name as changed_by_name, u.avatar as changed_by_avatar,
       t.title as subtask_title, t.parent_task_id
     FROM task_history th
     JOIN users u ON u.id = th.changed_by
     JOIN tasks t ON t.id = th.task_id
     WHERE th.task_id = ?
        OR (t.parent_task_id = ? AND th.action NOT IN ('created','assigned'))
     ORDER BY th.created_at ASC`,
    [task_id, task_id]
  );
  return apiResponse(rows);
});
