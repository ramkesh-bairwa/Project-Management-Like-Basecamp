import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { createNotification } from '@/app/api/notifications/route';

export const GET = withAuth(async (_req, user) => {
  const rows = await query<unknown[]>(
    `SELECT c.id, c.status, c.created_at,
      u.id as user_id, u.name, u.email, u.avatar,
      CASE WHEN c.requester_id = ? THEN 'sent' ELSE 'received' END as direction
     FROM connections c
     JOIN users u ON u.id = IF(c.requester_id = ?, c.receiver_id, c.requester_id)
     WHERE c.requester_id = ? OR c.receiver_id = ?`,
    [user.id, user.id, user.id, user.id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { receiver_id } = await req.json();
  if (!receiver_id) return apiError('receiver_id required');
  if (receiver_id === user.id) return apiError('Cannot connect with yourself');

  const existing = await query<unknown[]>(
    'SELECT id FROM connections WHERE (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)',
    [user.id, receiver_id, receiver_id, user.id]
  );
  if (existing.length) return apiError('Connection already exists');

  const result = await query<{ insertId: number }>(
    'INSERT INTO connections (requester_id, receiver_id) VALUES (?, ?)', [user.id, receiver_id]
  );

  const sender = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
  await createNotification(receiver_id, 'connection',
    `${sender[0]?.name || 'Someone'} sent you a connection request`,
    'Go to Connections to accept or decline.',
    '/connections'
  );

  return apiResponse({ id: result.insertId, status: 'pending' }, 201);
});
