import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest) => {
  const document_id = new URL(req.url).searchParams.get('document_id');
  if (!document_id) return apiError('document_id required');
  const rows = await query<unknown[]>(
    `SELECT dv.*, u.name as uploaded_by_name
     FROM document_versions dv JOIN users u ON u.id=dv.uploaded_by
     WHERE dv.document_id=? ORDER BY dv.version_number DESC`, [document_id]
  );
  return apiResponse(rows);
});
