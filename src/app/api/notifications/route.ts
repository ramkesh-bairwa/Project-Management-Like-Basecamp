import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req, user) => {
  const rows = await query<unknown[]>(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [user.id]
  );
  return apiResponse(rows);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { id } = await req.json();
  if (id) {
    await query('UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?', [id, user.id]);
  } else {
    await query('UPDATE notifications SET is_read=TRUE WHERE user_id=?', [user.id]);
  }
  return apiResponse({ message: 'Marked as read' });
});

export async function createNotification(user_id: number, type: string, title: string, body?: string, link?: string) {
  await query('INSERT INTO notifications (user_id, type, title, body, link) VALUES (?,?,?,?,?)',
    [user_id, type, title, body || null, link || null]);
}

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');
  await query('DELETE FROM notifications WHERE id=? AND user_id=?', [id, user.id]);
  return apiResponse({ message: 'Notification deleted' });
});
