import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req, user) => {
  const rows = await query<unknown[]>(
    `SELECT o.*, p.name as plan_name FROM organizations o
     LEFT JOIN plans p ON o.plan_id = p.id
     JOIN org_members om ON om.org_id = o.id
     WHERE om.user_id = ?`, [user.id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  if (!user.is_org) return apiError('Purchase a plan to create an organization', 403);

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
