import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

function adminOnly(user: { role: string }) {
  if (user.role !== 'admin') throw new Error('Admin only');
}

// GET /api/admin/plans
export const GET = withAuth(async (_req: NextRequest, user) => {
  try { adminOnly(user); } catch { return apiError('Admin only', 403); }
  const rows = await query<unknown[]>('SELECT * FROM plans ORDER BY sort_order ASC, price ASC');
  return apiResponse(rows);
});

// POST /api/admin/plans — create plan
export const POST = withAuth(async (req: NextRequest, user) => {
  try { adminOnly(user); } catch { return apiError('Admin only', 403); }
  const { name, price, quarterly_price, yearly_price, billing_cycle, max_projects, max_members, max_tasks, max_groups, max_storage_gb, features, is_active, sort_order } = await req.json();
  if (!name) return apiError('name required');
  const result = await query<{ insertId: number }>(
    `INSERT INTO plans (name, price, quarterly_price, yearly_price, billing_cycle, max_projects, max_members, max_tasks, max_groups, max_storage_gb, features, is_active, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [name, price ?? 0, quarterly_price ?? null, yearly_price ?? null, billing_cycle || 'monthly',
     max_projects ?? -1, max_members ?? -1, max_tasks ?? -1, max_groups ?? -1,
     max_storage_gb ?? 5, JSON.stringify(features || []), is_active ?? true, sort_order ?? 0]
  );
  return apiResponse({ id: result.insertId }, 201);
});

// PUT /api/admin/plans — update plan
export const PUT = withAuth(async (req: NextRequest, user) => {
  try { adminOnly(user); } catch { return apiError('Admin only', 403); }
  const { id, name, price, quarterly_price, yearly_price, billing_cycle, max_projects, max_members, max_tasks, max_groups, max_storage_gb, features, is_active, sort_order } = await req.json();
  if (!id) return apiError('id required');
  await query(
    `UPDATE plans SET name=?, price=?, quarterly_price=?, yearly_price=?, billing_cycle=?,
     max_projects=?, max_members=?, max_tasks=?, max_groups=?, max_storage_gb=?,
     features=?, is_active=?, sort_order=? WHERE id=?`,
    [name, price, quarterly_price ?? null, yearly_price ?? null, billing_cycle,
     max_projects, max_members, max_tasks ?? -1, max_groups ?? -1,
     max_storage_gb, JSON.stringify(features || []), is_active, sort_order ?? 0, id]
  );
  return apiResponse({ message: 'Plan updated' });
});

// DELETE /api/admin/plans?id=X
export const DELETE = withAuth(async (req: NextRequest, user) => {
  try { adminOnly(user); } catch { return apiError('Admin only', 403); }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  await query('UPDATE plans SET is_active=FALSE WHERE id=?', [id]);
  return apiResponse({ message: 'Plan deactivated' });
});
