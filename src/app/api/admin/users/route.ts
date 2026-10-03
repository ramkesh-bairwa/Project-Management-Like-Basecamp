import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

function adminOnly(user: { role: string }) {
  if (user.role !== 'admin') throw new Error('Admin only');
}

// GET /api/admin/users?page=1&search=&role=&verified=1|0
// GET /api/admin/users?all=1 — plain list of every user (used by the daily reports page)
export const GET = withAuth(async (req: NextRequest, user) => {
  try { adminOnly(user); } catch { return apiError('Admin only', 403); }
  const { searchParams } = new URL(req.url);

  if (searchParams.get('all') === '1') {
    const all = await query<unknown[]>('SELECT id, name, email, role, created_at FROM users ORDER BY name');
    return apiResponse(all);
  }

  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const verified = searchParams.get('verified') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = `WHERE 1=1 ${search ? `AND (u.name LIKE ? OR u.email LIKE ?)` : ''} ${role ? `AND u.role = ?` : ''} ${verified === '1' || verified === '0' ? `AND u.email_verified = ?` : ''}`;
  const params: (string | number)[] = [];
  if (search) { params.push(`%${search}%`, `%${search}%`); }
  if (role) params.push(role);
  if (verified === '1' || verified === '0') params.push(Number(verified));

  const [users, total, unverified] = await Promise.all([
    query<unknown[]>(
      `SELECT u.id, u.name, u.email, u.role, u.is_org, u.created_at, u.email_verified,
        p.name as plan_name, u.plan_expires_at,
        (SELECT COUNT(*) FROM projects WHERE owner_id=u.id AND deleted_at IS NULL) as project_count,
        (SELECT COUNT(*) FROM subscriptions WHERE user_id=u.id AND status='active') as active_subs
       FROM users u LEFT JOIN plans p ON p.id=u.plan_id
       ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    query<{ total: number }[]>(`SELECT COUNT(*) as total FROM users u ${where}`, params),
    query<{ n: number }[]>('SELECT COUNT(*) as n FROM users WHERE email_verified = 0'),
  ]);

  return apiResponse({ users, total: total[0]?.total || 0, unverified: unverified[0]?.n || 0, page, limit });
});

// PUT /api/admin/users — update one user, or { verify_all: true } to verify every unverified user
export const PUT = withAuth(async (req: NextRequest, user) => {
  try { adminOnly(user); } catch { return apiError('Admin only', 403); }
  const { id, role, plan_id, is_org, ban, email_verified, verify_all } = await req.json();

  if (verify_all) {
    const result = await query<{ affectedRows: number }>(
      'UPDATE users SET email_verified=1, verification_token=NULL, verification_token_expires=NULL WHERE email_verified=0'
    );
    return apiResponse({ message: `${result.affectedRows} user(s) marked as verified` });
  }

  if (!id) return apiError('id required');
  if (role !== undefined) await query('UPDATE users SET role=? WHERE id=?', [role, id]);
  if (plan_id !== undefined) await query('UPDATE users SET plan_id=? WHERE id=?', [plan_id, id]);
  if (is_org !== undefined) await query('UPDATE users SET is_org=? WHERE id=?', [is_org ? 1 : 0, id]);
  if (email_verified !== undefined) await query('UPDATE users SET email_verified=?, verification_token=NULL, verification_token_expires=NULL WHERE id=?', [email_verified ? 1 : 0, id]);
  if (ban !== undefined) {
    await query('UPDATE users SET role=? WHERE id=?', [ban ? 'banned' : 'user', id]);
  }
  return apiResponse({ message: 'User updated' });
});

// DELETE /api/admin/users?id=X — hard delete user
export const DELETE = withAuth(async (req: NextRequest, user) => {
  try { adminOnly(user); } catch { return apiError('Admin only', 403); }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  if (Number(id) === user.id) return apiError('Cannot delete yourself', 400);
  await query('DELETE FROM users WHERE id=?', [id]);
  return apiResponse({ message: 'User deleted' });
});
