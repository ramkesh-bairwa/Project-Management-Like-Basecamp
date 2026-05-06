import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

// GET /api/tasks/attachments?task_id=X
export const GET = withAuth(async (req: NextRequest, user) => {
  const task_id = new URL(req.url).searchParams.get('task_id');
  if (!task_id) return apiError('task_id required');

  const task = await query<{ project_id: number }[]>('SELECT project_id FROM tasks WHERE id=? AND deleted_at IS NULL', [task_id]);
  if (!task.length) return apiError('Task not found', 404);
  const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [task[0].project_id, user.id]);
  if (!member.length) return apiError('Not authorized', 403);

  const rows = await query<unknown[]>(
    `SELECT ta.*, u.name as uploaded_by_name FROM task_attachments ta
     JOIN users u ON u.id = ta.uploaded_by
     WHERE ta.task_id = ? ORDER BY ta.created_at ASC`,
    [task_id]
  );
  return apiResponse(rows);
});

// POST /api/tasks/attachments — multipart upload OR json link
export const POST = withAuth(async (req: NextRequest, user) => {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const task_id = formData.get('task_id') as string | null;
    if (!file || !task_id) return apiError('file and task_id required');

    const task = await query<{ project_id: number }[]>('SELECT project_id FROM tasks WHERE id=? AND deleted_at IS NULL', [task_id]);
    if (!task.length) return apiError('Task not found', 404);
    const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [task[0].project_id, user.id]);
    if (!member.length) return apiError('Not authorized', 403);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const folder = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tasks', folder);
    await mkdir(uploadDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    await writeFile(path.join(uploadDir, safeName), buffer);
    const fileUrl = `/uploads/tasks/${folder}/${safeName}`;
    const fileType = file.type.startsWith('video/') ? 'video' : 'image';

    const result = await query<{ insertId: number }>(
      'INSERT INTO task_attachments (task_id, uploaded_by, file_url, file_name, file_type, file_size) VALUES (?,?,?,?,?,?)',
      [task_id, user.id, fileUrl, file.name, fileType, file.size]
    );
    return apiResponse({ id: result.insertId, file_url: fileUrl, file_name: file.name, file_type: fileType }, 201);
  }

  // JSON link
  const { task_id, file_url, file_name } = await req.json();
  if (!task_id || !file_url) return apiError('task_id and file_url required');

  const task = await query<{ project_id: number }[]>('SELECT project_id FROM tasks WHERE id=? AND deleted_at IS NULL', [task_id]);
  if (!task.length) return apiError('Task not found', 404);
  const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [task[0].project_id, user.id]);
  if (!member.length) return apiError('Not authorized', 403);

  const isVideo = /youtube|youtu\.be|vimeo|\.mp4|\.webm/i.test(file_url);
  const result = await query<{ insertId: number }>(
    'INSERT INTO task_attachments (task_id, uploaded_by, file_url, file_name, file_type) VALUES (?,?,?,?,?)',
    [task_id, user.id, file_url, file_name || file_url, isVideo ? 'video' : 'link']
  );
  return apiResponse({ id: result.insertId, file_url, file_type: isVideo ? 'video' : 'link' }, 201);
});

// DELETE /api/tasks/attachments?id=X
export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');

  const rows = await query<{ task_id: number; uploaded_by: number; file_url: string; file_type: string }[]>(
    'SELECT ta.task_id, ta.uploaded_by, ta.file_url, ta.file_type FROM task_attachments ta WHERE ta.id=?', [id]
  );
  if (!rows.length) return apiError('Not found', 404);
  const att = rows[0];

  const task = await query<{ project_id: number }[]>('SELECT project_id FROM tasks WHERE id=?', [att.task_id]);
  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [task[0].project_id, user.id]);
  if (!member.length) return apiError('Not authorized', 403);
  if (att.uploaded_by !== user.id && !['owner','admin','manager'].includes(member[0].role)) return apiError('Not authorized', 403);

  // Delete file from disk if it's an uploaded file
  if (att.file_type !== 'link' && att.file_url.startsWith('/uploads/tasks/')) {
    try {
      await unlink(path.join(process.cwd(), 'public', att.file_url));
    } catch {}
  }

  await query('DELETE FROM task_attachments WHERE id=?', [id]);
  return apiResponse({ message: 'Attachment deleted' });
});
