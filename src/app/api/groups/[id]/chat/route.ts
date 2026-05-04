import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

// Ensure group chat exists and return chat_id
async function ensureGroupChat(groupId: number, userId: number): Promise<number> {
  const grp = await query<{ chat_id: number | null; name: string }[]>(
    'SELECT chat_id, name FROM `groups` WHERE id=?', [groupId]
  );
  if (!grp.length) throw new Error('Group not found');

  if (grp[0].chat_id) return grp[0].chat_id;

  const chatRes = await query<{ insertId: number }>(
    "INSERT INTO chats (type, name, created_by) VALUES ('group',?,?)",
    [`${grp[0].name} — Group Chat`, userId]
  );
  const chatId = chatRes.insertId;
  await query('UPDATE `groups` SET chat_id=? WHERE id=?', [chatId, groupId]);

  const members = await query<{ user_id: number }[]>(
    'SELECT user_id FROM group_members WHERE group_id=?', [groupId]
  );
  for (const m of members) {
    await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?,?)', [chatId, m.user_id]);
  }
  return chatId;
}

export const GET = withAuth(async (req: NextRequest, user) => {
  const groupId = Number(req.url.split('/groups/')[1].split('/')[0]);

  const member = await query<unknown[]>('SELECT id FROM group_members WHERE group_id=? AND user_id=?', [groupId, user.id]);
  if (!member.length) return apiError('Not a group member', 403);

  const chatId = await ensureGroupChat(groupId, user.id);

  const messages = await query<unknown[]>(
    `SELECT m.id, m.content, m.type, m.created_at, u.name as sender_name
     FROM messages m JOIN users u ON u.id=m.sender_id
     WHERE m.chat_id=? ORDER BY m.created_at ASC LIMIT 100`, [chatId]
  );
  await query('UPDATE chat_participants SET last_read_at=NOW() WHERE chat_id=? AND user_id=?', [chatId, user.id]);
  return apiResponse({ chat_id: chatId, messages });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const groupId = Number(req.url.split('/groups/')[1].split('/')[0]);
  const { content } = await req.json();
  if (!content?.trim()) return apiError('content required');

  const member = await query<unknown[]>('SELECT id FROM group_members WHERE group_id=? AND user_id=?', [groupId, user.id]);
  if (!member.length) return apiError('Not a group member', 403);

  const chatId = await ensureGroupChat(groupId, user.id);

  const result = await query<{ insertId: number }>(
    "INSERT INTO messages (chat_id, sender_id, content, type) VALUES (?,?,?,'text')",
    [chatId, user.id, content]
  );
  return apiResponse({ id: result.insertId, content }, 201);
});
