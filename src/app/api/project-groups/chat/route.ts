import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

// GET /api/project-groups/chat?group_id=X  — returns chat + messages (group_id can be id, uuid, or slug)
export const GET = withAuth(async (req: NextRequest, user) => {
  const group_id = new URL(req.url).searchParams.get('group_id');
  if (!group_id) return apiError('group_id required');

  const grp = await query<{ id: number; project_id: number; name: string; chat_id: number | null }[]>(
    'SELECT id, project_id, name, chat_id FROM project_groups WHERE (id=? OR uuid=? OR slug=?) AND deleted_at IS NULL',
    [group_id, group_id, group_id]
  );
  if (!grp.length) return apiError('Group not found', 404);

  // ensure caller is a project member
  const pm = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!pm.length) return apiError('Not a project member', 403);

  let chatId = grp[0].chat_id;

  // auto-create chat if not exists
  if (!chatId) {
    const res = await query<{ insertId: number }>(
      "INSERT INTO chats (type, name, created_by) VALUES ('group',?,?)",
      [`${grp[0].name} — Group Chat`, user.id]
    );
    chatId = res.insertId;
    await query('UPDATE project_groups SET chat_id=? WHERE id=?', [chatId, group_id]);

    // add all project group members as chat participants
    const members = await query<{ user_id: number }[]>(
      'SELECT user_id FROM project_group_members WHERE group_id=?', [group_id]
    );
    // fallback: add all project members if group has no members yet
    const participants = members.length
      ? members
      : await query<{ user_id: number }[]>('SELECT user_id FROM project_members WHERE project_id=?', [grp[0].project_id]);

    for (const m of participants) {
      await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?,?)', [chatId, m.user_id]);
    }
  }

  const messages = await query<unknown[]>(
    `SELECT m.*, u.name as sender_name FROM messages m
     JOIN users u ON u.id=m.sender_id
     WHERE m.chat_id=? ORDER BY m.created_at ASC LIMIT 200`, [chatId]
  );

  await query('UPDATE chat_participants SET last_read_at=NOW() WHERE chat_id=? AND user_id=?', [chatId, user.id]);

  return apiResponse({ chat_id: chatId, messages });
});

// POST — send a message to the group chat
export const POST = withAuth(async (req: NextRequest, user) => {
  const { group_id, content } = await req.json();
  if (!group_id || !content) return apiError('group_id and content required');

  const grp = await query<{ id: number; chat_id: number | null; project_id: number; name: string }[]>(
    'SELECT id, chat_id, project_id, name FROM project_groups WHERE (id=? OR uuid=? OR slug=?) AND deleted_at IS NULL',
    [group_id, group_id, group_id]
  );
  if (!grp.length) return apiError('Group not found', 404);

  const gm = await query<unknown[]>('SELECT id FROM project_group_members WHERE group_id=? AND user_id=?', [grp[0].id, user.id]);
  if (!gm.length) return apiError('Not a group member', 403);

  let chatId = grp[0].chat_id;

  if (!chatId) {
    const res = await query<{ insertId: number }>(
      "INSERT INTO chats (type, name, created_by) VALUES ('group',?,?)",
      [`${grp[0].name} — Group Chat`, user.id]
    );
    chatId = res.insertId;
    await query('UPDATE project_groups SET chat_id=? WHERE id=?', [chatId, group_id]);
    const members = await query<{ user_id: number }[]>('SELECT user_id FROM project_group_members WHERE group_id=?', [grp[0].id]);
    const participants = members.length
      ? members
      : await query<{ user_id: number }[]>('SELECT user_id FROM project_members WHERE project_id=?', [grp[0].project_id]);
    for (const m of participants) {
      await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?,?)', [chatId, m.user_id]);
    }
  }

  await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?,?)', [chatId, user.id]);

  const sender = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
  const senderName = sender[0]?.name || 'Unknown';

  const result = await query<{ insertId: number }>(
    "INSERT INTO messages (chat_id, sender_id, content, type) VALUES (?,?,?,'text')",
    [chatId, user.id, content]
  );

  // Broadcast via WebSocket
  const broadcast = (global as Record<string, unknown>).__wsBroadcast as ((key: string, payload: unknown) => void) | undefined;
  if (broadcast) {
    broadcast(`chat:${chatId}`, {
      type: 'chat_message',
      chat_id: chatId,
      id: result.insertId,
      content,
      sender_id: user.id,
      sender_name: senderName,
      created_at: new Date().toISOString(),
    });
  }

  return apiResponse({ id: result.insertId, content, chat_id: chatId }, 201);
});
