import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const project_id = new URL(req.url).searchParams.get('project_id');
  if (!project_id) return apiError('project_id required');
  const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);
  const rows = await query<unknown[]>(
    `SELECT f.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM documents WHERE folder_id=f.id AND status != 'archived') as doc_count
     FROM document_folders f JOIN users u ON u.id=f.created_by
     WHERE f.project_id=? ORDER BY f.created_at ASC`, [project_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { project_id, name } = await req.json();
  if (!project_id || !name) return apiError('project_id and name required');
  const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);
  const result = await query<{ insertId: number }>(
    'INSERT INTO document_folders (project_id, name, created_by) VALUES (?,?,?)', [project_id, name, user.id]
  );
  return apiResponse({ id: result.insertId, name }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  const folders = await query<{ project_id: number }[]>('SELECT project_id FROM document_folders WHERE id=?', [id]);
  if (!folders.length) return apiError('Folder not found', 404);
  const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [folders[0].project_id, user.id]);
  if (!member.length) return apiError('Not authorized', 403);
  await query('UPDATE documents SET folder_id=NULL WHERE folder_id=?', [id]);
  await query('DELETE FROM document_folders WHERE id=?', [id]);
  return apiResponse({ message: 'Folder deleted' });
});
