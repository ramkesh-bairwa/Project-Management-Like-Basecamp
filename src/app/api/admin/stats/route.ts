import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);

  const [users, projects, tasks, payments, plans, recentUsers, recentPayments] = await Promise.all([
    query<{ total: number; admins: number }[]>(
      `SELECT COUNT(*) as total, SUM(role='admin') as admins FROM users`
    ),
    query<{ total: number; active: number }[]>(
      `SELECT COUNT(*) as total, SUM(status='active') as active FROM projects WHERE deleted_at IS NULL`
    ),
    query<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM tasks WHERE deleted_at IS NULL`
    ),
    query<{ total: number; revenue: number }[]>(
      `SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as revenue FROM payments WHERE status='completed'`
    ),
    query<{ id: number; name: string; price: number; subscribers: number }[]>(
      `SELECT p.id, p.name, p.price,
        (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id=p.id AND s.status='active') as subscribers
       FROM plans p WHERE p.is_active=TRUE ORDER BY p.price ASC`
    ),
    query<unknown[]>(
      `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5`
    ),
    query<unknown[]>(
      `SELECT py.*, u.name as user_name, pl.name as plan_name
       FROM payments py JOIN users u ON u.id=py.user_id JOIN plans pl ON pl.id=py.plan_id
       ORDER BY py.created_at DESC LIMIT 10`
    ),
  ]);

  return apiResponse({
    stats: {
      total_users: users[0]?.total || 0,
      admin_users: users[0]?.admins || 0,
      total_projects: projects[0]?.total || 0,
      active_projects: projects[0]?.active || 0,
      total_tasks: tasks[0]?.total || 0,
      total_payments: payments[0]?.total || 0,
      total_revenue: payments[0]?.revenue || 0,
    },
    plans,
    recent_users: recentUsers,
    recent_payments: recentPayments,
  });
});
