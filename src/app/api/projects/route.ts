import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const org_id = searchParams.get('org_id');
  const id = searchParams.get('id');

  if (id) {
    const rows = await query<unknown[]>(
      `SELECT p.* FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE p.id = ? AND p.deleted_at IS NULL AND (p.owner_id = ? OR pm.user_id = ?)`, [user.id, id, user.id, user.id]
    );
    if (!rows.length) return apiError('Project not found', 404);
    return apiResponse(rows[0]);
  }

  let rows;
  if (org_id) {
    rows = await query<unknown[]>(
      `SELECT p.* FROM projects p
       JOIN org_members om ON om.org_id = p.org_id AND om.user_id = ?
       WHERE p.org_id = ? AND p.deleted_at IS NULL`, [user.id, org_id]
    );
  } else {
    rows = await query<unknown[]>(
      `SELECT p.* FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE (p.owner_id = ? OR pm.user_id = ?) AND p.deleted_at IS NULL`, [user.id, user.id, user.id]
    );
  }
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { name, description, org_id, status, priority, visibility, start_date, due_date } = await req.json();
  if (!name) return apiError('Project name required');

  if (org_id) {
    const member = await query<unknown[]>('SELECT id FROM org_members WHERE org_id=? AND user_id=?', [org_id, user.id]);
    if (!member.length) return apiError('Not a member of this organization', 403);
  }

  const result = await query<{ insertId: number }>(
    'INSERT INTO projects (owner_id, org_id, name, description, status, priority, visibility, start_date, due_date) VALUES (?,?,?,?,?,?,?,?,?)',
    [user.id, org_id || null, name, description || null, status || 'planning', priority || 'medium', visibility || 'private', start_date || null, due_date || null]
  );
  await query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [result.insertId, user.id, 'owner']);
  return apiResponse({ id: result.insertId, name }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  const projects = await query<{ owner_id: number }[]>('SELECT owner_id FROM projects WHERE id=? AND deleted_at IS NULL', [id]);
  if (!projects.length) return apiError('Project not found', 404);
  if (projects[0].owner_id !== user.id) return apiError('Only the project owner can delete it', 403);
  // Soft delete project and cascade
  await query('UPDATE projects SET deleted_at=NOW() WHERE id=?', [id]);
  await query('UPDATE tasks SET deleted_at=NOW() WHERE project_id=? AND deleted_at IS NULL', [id]);
  await query('UPDATE project_groups SET deleted_at=NOW() WHERE project_id=? AND deleted_at IS NULL', [id]);
  await query("UPDATE documents SET status='archived' WHERE project_id=?", [id]);
  return apiResponse({ message: 'Project deleted' });
});
