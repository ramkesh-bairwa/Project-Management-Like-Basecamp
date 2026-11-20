import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

// Tasks assigned to the signed-in user across every project they still belong to.
// Used by the dashboard "My work" panel and the ⌘K command palette.
export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const includeDone = searchParams.get('include_done') === '1';
  // MySQL 8 + mysql2 execute() rejects `LIMIT ?`, so inline a clamped integer.
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 300);

  const rows = await query<unknown[]>(
    `SELECT t.id, t.uuid, t.slug, t.title, t.status, t.priority, t.due_date, t.created_at, t.updated_at,
            t.project_id, p.name AS project_name, COALESCE(p.slug, p.id) AS project_slug,
            pg.name AS group_name, pg.color AS group_color
       FROM tasks t
       JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
       LEFT JOIN project_groups pg ON pg.id = t.group_id
      WHERE t.assignee_id = ?
        AND t.deleted_at IS NULL
        ${includeDone ? '' : "AND t.status NOT IN ('completed','cancelled','invalid')"}
      ORDER BY (t.due_date IS NULL), t.due_date ASC,
               FIELD(t.priority, 'critical', 'high', 'medium', 'low'), t.updated_at DESC
      LIMIT ${limit}`,
    [user.id, user.id]
  );
  return apiResponse(rows);
});
