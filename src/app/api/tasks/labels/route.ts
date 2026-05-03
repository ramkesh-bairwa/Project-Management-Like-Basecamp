import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest) => {
  const project_id = new URL(req.url).searchParams.get('project_id');
  if (!project_id) return apiError('project_id required');
  const rows = await query<unknown[]>('SELECT * FROM task_labels WHERE project_id=?', [project_id]);
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest) => {
  const { project_id, name, color } = await req.json();
  if (!project_id || !name) return apiError('project_id and name required');
  const result = await query<{ insertId: number }>('INSERT INTO task_labels (project_id, name, color) VALUES (?,?,?)', [project_id, name, color || '#6366f1']);
  return apiResponse({ id: result.insertId, name, color }, 201);
});
