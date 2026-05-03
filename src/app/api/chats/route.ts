import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req, user) => {
  const rows = await query<unknown[]>(
    `SELECT c.id, c.type, c.name, c.created_at,
      (SELECT content FROM messages WHERE chat_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages m JOIN chat_participants cp ON cp.chat_id=m.chat_id AND cp.user_id=?
       WHERE m.chat_id=c.id AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)) as unread_count
     FROM chats c
     JOIN chat_participants cp ON cp.chat_id=c.id AND cp.user_id=?
     ORDER BY c.created_at DESC`, [user.id, user.id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { type, name, participant_ids } = await req.json();
  if (!participant_ids?.length) return apiError('participant_ids required');

  if (type === 'direct') {
    const other = participant_ids[0];
    const existing = await query<{ id: number }[]>(
      `SELECT c.id FROM chats c
       JOIN chat_participants cp1 ON cp1.chat_id=c.id AND cp1.user_id=?
       JOIN chat_participants cp2 ON cp2.chat_id=c.id AND cp2.user_id=?
       WHERE c.type='direct' LIMIT 1`, [user.id, other]
    );
    if (existing.length) return apiResponse({ id: existing[0].id, existing: true });
  }

  const result = await query<{ insertId: number }>(
    'INSERT INTO chats (type, name, created_by) VALUES (?,?,?)', [type || 'direct', name || null, user.id]
  );
  const chatId = result.insertId;
  const allParticipants = [...new Set([user.id, ...participant_ids])];
  for (const uid of allParticipants) {
    await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?,?)', [chatId, uid]);
  }
  return apiResponse({ id: chatId }, 201);
});
