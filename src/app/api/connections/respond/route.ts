import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { createNotification } from '@/app/api/notifications/route';

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { connection_id, status } = await req.json();
  if (!['accepted', 'rejected', 'blocked'].includes(status)) return apiError('Invalid status');

  const rows = await query<{ id: number; requester_id: number }[]>(
    'SELECT id, requester_id FROM connections WHERE id = ? AND receiver_id = ?', [connection_id, user.id]
  );
  if (!rows.length) return apiError('Connection not found', 404);

  await query('UPDATE connections SET status = ? WHERE id = ?', [status, connection_id]);

  if (status === 'accepted') {
    const responder = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
    await createNotification(rows[0].requester_id, 'connection',
      `${responder[0]?.name || 'Someone'} accepted your connection request`,
      'You are now connected!',
      '/connections'
    );
  }

  return apiResponse({ message: `Connection ${status}` });
});
