import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest) => {
  const org_id = new URL(req.url).searchParams.get('org_id');
  if (!org_id) return apiError('org_id required');
  const rows = await query<unknown[]>(
    `SELECT om.role, om.joined_at, u.id, u.name, u.email, u.avatar
     FROM org_members om JOIN users u ON u.id = om.user_id WHERE om.org_id = ?`, [org_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { org_id, user_id, role } = await req.json();
  if (!org_id || !user_id) return apiError('org_id and user_id required');

  const owner = await query<unknown[]>('SELECT id FROM org_members WHERE org_id=? AND user_id=? AND role IN ("owner","admin")', [org_id, user.id]);
  if (!owner.length) return apiError('Not authorized', 403);

  await query('INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [org_id, user_id, role || 'member']);
  return apiResponse({ message: 'Member added' }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const { org_id, user_id } = await req.json();
  const owner = await query<unknown[]>('SELECT id FROM org_members WHERE org_id=? AND user_id=? AND role IN ("owner","admin")', [org_id, user.id]);
  if (!owner.length) return apiError('Not authorized', 403);
  await query('DELETE FROM org_members WHERE org_id=? AND user_id=?', [org_id, user_id]);
  return apiResponse({ message: 'Member removed' });
});
