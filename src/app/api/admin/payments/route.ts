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

  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];
  if (search) { conditions.push('(u.name LIKE ? OR u.email LIKE ? OR pl.name LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { conditions.push('py.status = ?'); params.push(status); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [payments, total, summary] = await Promise.all([
    query<unknown[]>(
      `SELECT py.id, py.amount, py.billing_cycle, py.status, py.created_at, py.provider_ref,
        u.name as user_name, u.email as user_email,
        pl.name as plan_name
       FROM payments py
       JOIN users u ON u.id=py.user_id
       JOIN plans pl ON pl.id=py.plan_id
       ${where} ORDER BY py.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    query<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM payments py JOIN users u ON u.id=py.user_id JOIN plans pl ON pl.id=py.plan_id ${where}`, params
    ),
    query<{ total_revenue: number; completed: number; pending: number }[]>(
      `SELECT COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0) as total_revenue,
        SUM(status='completed') as completed, SUM(status='pending') as pending
       FROM payments`
    ),
  ]);

  return apiResponse({ payments, total: total[0]?.total || 0, page, limit, summary: summary[0] });
});
