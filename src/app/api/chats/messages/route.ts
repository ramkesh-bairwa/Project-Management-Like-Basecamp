import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const chat_id = new URL(req.url).searchParams.get('chat_id');
  if (!chat_id) return apiError('chat_id required');

  const member = await query<unknown[]>('SELECT id FROM chat_participants WHERE chat_id=? AND user_id=?', [chat_id, user.id]);
  if (!member.length) return apiError('Not a chat participant', 403);

  const rows = await query<unknown[]>(
    `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id=? ORDER BY m.created_at ASC LIMIT 100`, [chat_id]
  );
  await query('UPDATE chat_participants SET last_read_at=NOW() WHERE chat_id=? AND user_id=?', [chat_id, user.id]);
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { chat_id, content, type, file_url } = await req.json();
  if (!chat_id || !content) return apiError('chat_id and content required');

  const member = await query<unknown[]>('SELECT id FROM chat_participants WHERE chat_id=? AND user_id=?', [chat_id, user.id]);
  if (!member.length) return apiError('Not a chat participant', 403);

  const sender = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
  const senderName = sender[0]?.name || 'Unknown';

  const result = await query<{ insertId: number; }>(
    'INSERT INTO messages (chat_id, sender_id, content, type, file_url) VALUES (?,?,?,?,?)',
    [chat_id, user.id, content, type || 'text', file_url || null]
  );

  // Broadcast to WebSocket room
  const broadcast = (global as Record<string, unknown>).__wsBroadcast as ((key: string, payload: unknown) => void) | undefined;
  if (broadcast) {
    broadcast(`chat:${chat_id}`, {
      type: 'chat_message',
      chat_id,
      id: result.insertId,
      content,
      sender_id: user.id,
      sender_name: senderName,
      created_at: new Date().toISOString(),
    });
  }

  return apiResponse({ id: result.insertId, content, sender_name: senderName }, 201);
});
