import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest) => {
  const task_id = new URL(req.url).searchParams.get('task_id');
  if (!task_id) return apiError('task_id required');
  const rows = await query<unknown[]>(
    `SELECT th.*, u.name as changed_by_name, u.avatar as changed_by_avatar
     FROM task_history th JOIN users u ON u.id=th.changed_by
     WHERE th.task_id=? ORDER BY th.created_at ASC`, [task_id]
  );
  return apiResponse(rows);
});
