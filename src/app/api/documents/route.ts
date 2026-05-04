import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { unlink } from 'fs/promises';
import path from 'path';

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const project_id = searchParams.get('project_id');
  const id = searchParams.get('id');

  if (id) {
    const rows = await query<unknown[]>(
      `SELECT d.*, u.name as created_by_name,
        dv.version_number as latest_version, dv.change_summary as latest_change,
        dv.created_at as last_updated_at, uv.name as last_updated_by_name
       FROM documents d
       JOIN users u ON u.id = d.created_by
       LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.version_number = d.current_version
       LEFT JOIN users uv ON uv.id = dv.uploaded_by
       WHERE d.id = ?`, [id]
    );
    if (!rows.length) return apiError('Document not found', 404);
    return apiResponse(rows[0]);
  }

  if (!project_id) return apiError('project_id required');
  const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);

  const folder_id = searchParams.get('folder_id');
  const folderFilter = folder_id ? 'd.folder_id = ?' : 'd.folder_id IS NULL';
  const params = folder_id ? [project_id, folder_id] : [project_id];
  const rows = await query<unknown[]>(
    `SELECT d.*, u.name as created_by_name,
      dv.version_number as latest_version, dv.change_summary as latest_change,
      dv.created_at as last_updated_at, uv.name as last_updated_by_name,
      dv.file_url, dv.file_name,
      (SELECT COUNT(*) FROM comments WHERE entity_type='document' AND entity_id=d.id) as comment_count
     FROM documents d
     JOIN users u ON u.id = d.created_by
     LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.version_number = d.current_version
     LEFT JOIN users uv ON uv.id = dv.uploaded_by
     WHERE d.project_id = ? AND d.status != 'archived' AND ${folderFilter}
     ORDER BY d.updated_at DESC`, params
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { project_id, title, description, type, content, file_url, file_name, file_size, folder_id } = await req.json();
  if (!project_id || !title) return apiError('project_id and title required');

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);

  const result = await query<{ insertId: number }>(
    'INSERT INTO documents (project_id, folder_id, created_by, title, description, type) VALUES (?,?,?,?,?,?)',
    [project_id, folder_id || null, user.id, title, description || null, type || 'doc']
  );

  // Create version 1
  await query(
    'INSERT INTO document_versions (document_id, version_number, uploaded_by, content, file_url, file_name, file_size, change_summary) VALUES (?,?,?,?,?,?,?,?)',
    [result.insertId, 1, user.id, content || null, file_url || null, file_name || null, file_size || null, 'Initial version']
  );

  return apiResponse({ id: result.insertId, title }, 201);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { id, title, description, status, content, file_url, file_name, file_size, change_summary } = await req.json();
  if (!id) return apiError('id required');

  const docs = await query<{ project_id: number; current_version: number; title: string }[]>('SELECT project_id, current_version, title FROM documents WHERE id=?', [id]);
  if (!docs.length) return apiError('Document not found', 404);

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [docs[0].project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);

  const newVersion = docs[0].current_version + 1;

  // Save new version if content/file changed
  if (content !== undefined || file_url !== undefined) {
    await query(
      'INSERT INTO document_versions (document_id, version_number, uploaded_by, content, file_url, file_name, file_size, change_summary) VALUES (?,?,?,?,?,?,?,?)',
      [id, newVersion, user.id, content || null, file_url || null, file_name || null, file_size || null, change_summary || `Version ${newVersion}`]
    );
    await query('UPDATE documents SET title=?, description=?, status=?, current_version=?, updated_at=NOW() WHERE id=?',
      [title || docs[0].title, description || null, status || 'active', newVersion, id]);
  } else {
    await query('UPDATE documents SET title=?, description=?, status=?, updated_at=NOW() WHERE id=?',
      [title || docs[0].title, description || null, status || 'active', id]);
  }

  return apiResponse({ message: 'Document updated', version: newVersion });
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');

  const docs = await query<{ project_id: number; created_by: number }[]>('SELECT project_id, created_by FROM documents WHERE id=?', [id]);
  if (!docs.length) return apiError('Document not found', 404);

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [docs[0].project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);

  const isManagerOrOwner = ['owner', 'manager'].includes(member[0].role);
  const isCreator = docs[0].created_by === user.id;
  if (!isManagerOrOwner && !isCreator) return apiError('Not authorized', 403);

  // Get all file_urls across all versions to delete from disk
  const versions = await query<{ file_url: string | null }[]>(
    'SELECT file_url FROM document_versions WHERE document_id=?', [id]
  );

  // Delete physical files (ignore errors if file not found)
  for (const v of versions) {
    if (v.file_url?.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', v.file_url);
      await unlink(filePath).catch(() => null); // silently ignore missing files
    }
  }

  // Hard delete DB records regardless of whether files existed
  await query('DELETE FROM document_versions WHERE document_id=?', [id]);
  await query('DELETE FROM comments WHERE entity_type=\'document\' AND entity_id=?', [id]);
  await query('DELETE FROM documents WHERE id=?', [id]);

  return apiResponse({ message: 'Document deleted' });
});
