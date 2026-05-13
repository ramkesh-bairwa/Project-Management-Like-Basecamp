import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

const DEFAULT_ROLES = ['owner', 'admin', 'manager', 'hr', 'project_admin', 'sales', 'developer', 'designer', 'viewer', 'member'];

export const GET = withAuth(async (req: NextRequest, user) => {
  const org_id = new URL(req.url).searchParams.get('org_id');
  if (!org_id) return apiError('org_id required');
  const member = await query<{ role: string }[]>('SELECT role FROM org_members WHERE org_id=? AND user_id=?', [org_id, user.id]);
  if (!member.length) return apiError('Not a member', 403);
  const custom = await query<{ id: number; name: string }[]>('SELECT id, name FROM org_roles WHERE org_id=? ORDER BY name', [org_id]);
  const all = [...new Set([...DEFAULT_ROLES, ...custom.map(r => r.name)])];
  return apiResponse({ roles: all, custom });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { org_id, name } = await req.json();
  if (!org_id || !name) return apiError('org_id and name required');
  const member = await query<{ role: string }[]>('SELECT role FROM org_members WHERE org_id=? AND user_id=?', [org_id, user.id]);
  if (!member.length || !['owner', 'admin'].includes(member[0].role)) return apiError('Only owner or admin can manage roles', 403);
  const roleName = name.toLowerCase().trim().replace(/\s+/g, '_');
  await query('INSERT IGNORE INTO org_roles (org_id, name) VALUES (?, ?)', [org_id, roleName]);
  return apiResponse({ message: 'Role created', name: roleName }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const org_id = searchParams.get('org_id');
  const name = searchParams.get('name');
  if (!org_id || !name) return apiError('org_id and name required');
  const member = await query<{ role: string }[]>('SELECT role FROM org_members WHERE org_id=? AND user_id=?', [org_id, user.id]);
  if (!member.length || !['owner', 'admin'].includes(member[0].role)) return apiError('Only owner or admin can manage roles', 403);
  if (DEFAULT_ROLES.includes(name)) return apiError('Cannot delete a default role', 400);
  await query('DELETE FROM org_roles WHERE org_id=? AND name=?', [org_id, name]);
  return apiResponse({ message: 'Role deleted' });
});
