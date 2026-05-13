import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    const rows = await query<unknown[]>(
      `SELECT o.*, p.name as plan_name FROM organizations o
       LEFT JOIN plans p ON o.plan_id = p.id
       JOIN org_members om ON om.org_id = o.id AND om.user_id = ?
       WHERE o.id = ?`, [user.id, id]
    );
    if (!rows.length) return apiError('Not found', 404);
    return apiResponse(rows[0]);
  }
  const rows = await query<unknown[]>(
    `SELECT o.*, p.name as plan_name FROM organizations o
     LEFT JOIN plans p ON o.plan_id = p.id
     JOIN org_members om ON om.org_id = o.id
     WHERE om.user_id = ?`, [user.id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  // Always check is_org from DB, not JWT (token may be stale after payment)
  const dbUser = await query<{ is_org: number; plan_id: number | null; plan_expires_at: string | null }[]>(
    'SELECT is_org, plan_id, plan_expires_at FROM users WHERE id=?', [user.id]
  );
  const isOrg = dbUser[0]?.is_org === 1;
  const hasPaidPlan = dbUser[0]?.plan_id !== null && dbUser[0]?.plan_id !== 1;
  if (!isOrg && !hasPaidPlan) return apiError('Purchase a plan to create an organization', 403);

  const { name, description, website } = await req.json();
  if (!name) return apiError('Organization name required');

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

  const result = await query<{ insertId: number }>(
    'INSERT INTO organizations (owner_id, name, slug, description, website) VALUES (?, ?, ?, ?, ?)',
    [user.id, name, slug, description || null, website || null]
  );
  await query('INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)', [result.insertId, user.id, 'owner']);

  return apiResponse({ id: result.insertId, name, slug }, 201);
});
