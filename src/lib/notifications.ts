import { query } from '@/lib/db';

export async function createNotification(user_id: number, type: string, title: string, body?: string, link?: string) {
  await query('INSERT INTO notifications (user_id, type, title, body, link) VALUES (?,?,?,?,?)',
    [user_id, type, title, body || null, link || null]);

  // Push to WebSocket notification room
  const broadcast = (global as Record<string, unknown>).__wsBroadcast as ((key: string, payload: unknown) => void) | undefined;
  if (broadcast) {
    broadcast(`notif:${user_id}`, {
      type: 'notification',
      notif_type: type,
      title,
      body: body || null,
      link: link || null,
      created_at: new Date().toISOString(),
    });
  }
}
