import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['p.deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (search) { conditions.push('(p.name LIKE ? OR u.name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (status) { conditions.push('p.status = ?'); params.push(status); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [projects, total] = await Promise.all([
    query<unknown[]>(
      `SELECT p.id, p.name, p.status, p.priority, p.visibility, p.created_at,
        u.name as owner_name, u.email as owner_email,
        (SELECT COUNT(*) FROM project_members WHERE project_id=p.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id=p.id AND deleted_at IS NULL) as task_count
       FROM projects p JOIN users u ON u.id=p.owner_id
       ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    query<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM projects p JOIN users u ON u.id=p.owner_id ${where}`, params
    ),
  ]);

  return apiResponse({ projects, total: total[0]?.total || 0, page, limit });
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  await query('UPDATE projects SET deleted_at=NOW() WHERE id=?', [id]);
  return apiResponse({ message: 'Project deleted' });
});
