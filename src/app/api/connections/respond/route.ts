import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { connection_id, status } = await req.json();
  if (!['accepted', 'rejected', 'blocked'].includes(status)) return apiError('Invalid status');

  const rows = await query<{ id: number }[]>(
    'SELECT id FROM connections WHERE id = ? AND receiver_id = ?', [connection_id, user.id]
  );
  if (!rows.length) return apiError('Connection not found', 404);

  await query('UPDATE connections SET status = ? WHERE id = ?', [status, connection_id]);
  return apiResponse({ message: `Connection ${status}` });
});
