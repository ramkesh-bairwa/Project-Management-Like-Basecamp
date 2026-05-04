import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req, user) => {
  const rows = await query<unknown[]>(
    `SELECT
      c.id, c.type, c.name, c.created_at,
      (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
      (
        SELECT COUNT(*) FROM messages m
        LEFT JOIN chat_participants cp2 ON cp2.chat_id = m.chat_id AND cp2.user_id = ?
        WHERE m.chat_id = c.id AND (cp2.last_read_at IS NULL OR m.created_at > cp2.last_read_at)
      ) AS unread_count,
      (
        SELECT u2.name FROM chat_participants cp3
        JOIN users u2 ON u2.id = cp3.user_id
        WHERE cp3.chat_id = c.id AND cp3.user_id != ? AND c.type = 'direct'
        LIMIT 1
      ) AS other_user_name,
      (
        SELECT pg2.slug FROM project_groups pg2
        WHERE pg2.chat_id = c.id AND pg2.deleted_at IS NULL LIMIT 1
      ) AS group_slug,
      (
        SELECT p.slug FROM projects p
        JOIN project_groups pg3 ON pg3.project_id = p.id
        WHERE pg3.chat_id = c.id AND pg3.deleted_at IS NULL LIMIT 1
      ) AS project_slug
    FROM chats c
    JOIN chat_participants cp ON cp.chat_id = c.id AND cp.user_id = ?
    ORDER BY last_message_at DESC, c.created_at DESC`,
    [user.id, user.id, user.id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { type, name, participant_ids } = await req.json();
  if (!participant_ids?.length) return apiError('participant_ids required');

  if (type === 'direct') {
    const other = participant_ids[0];

    // Return existing direct chat if one already exists
    const existing = await query<{ id: number }[]>(
      `SELECT c.id FROM chats c
       JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
       JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
       WHERE c.type = 'direct' LIMIT 1`,
      [user.id, other]
    );
    if (existing.length) return apiResponse({ id: existing[0].id, existing: true });
  }

  const result = await query<{ insertId: number }>(
    'INSERT INTO chats (type, name, created_by) VALUES (?, ?, ?)',
    [type || 'direct', name || null, user.id]
  );

  const chatId = result.insertId;
  const allParticipants = [...new Set([user.id, ...participant_ids])];
  for (const uid of allParticipants) {
    await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?, ?)', [chatId, uid]);
  }

  return apiResponse({ id: chatId }, 201);
});
