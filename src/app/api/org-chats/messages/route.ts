import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const chat_id = searchParams.get('chat_id');
  const before = searchParams.get('before'); // for pagination
  if (!chat_id) return apiError('chat_id required');

  const member = await query<{ id: number }[]>(
    'SELECT id FROM org_chat_members WHERE chat_id=? AND user_id=?', [chat_id, user.id]
  );
  if (!member.length) return apiError('Not a chat member', 403);

  const rows = await query<unknown[]>(
    `SELECT om.*, u.name as sender_name, u.avatar as sender_avatar
     FROM org_messages om JOIN users u ON u.id=om.sender_id
     WHERE om.chat_id=? ${before ? 'AND om.id < ?' : ''}
     ORDER BY om.created_at DESC LIMIT 50`,
    before ? [chat_id, before] : [chat_id]
  );

  await query('UPDATE org_chat_members SET last_read_at=NOW() WHERE chat_id=? AND user_id=?', [chat_id, user.id]);
  return apiResponse((rows as unknown[]).reverse());
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { chat_id, content, type, file_url } = await req.json();
  if (!chat_id || !content?.trim()) return apiError('chat_id and content required');

  const member = await query<{ id: number }[]>(
    'SELECT id FROM org_chat_members WHERE chat_id=? AND user_id=?', [chat_id, user.id]
  );
  if (!member.length) return apiError('Not a chat member', 403);

  // Announcement channels: only admin can post
  const chat = await query<{ type: string }[]>('SELECT type FROM org_chats WHERE id=?', [chat_id]);
  if (chat[0]?.type === 'announcement') {
    const chatMember = await query<{ role: string }[]>(
      'SELECT role FROM org_chat_members WHERE chat_id=? AND user_id=?', [chat_id, user.id]
    );
    if (chatMember[0]?.role !== 'admin') return apiError('Only admins can post in announcement channels', 403);
  }

  const result = await query<{ insertId: number }>(
    'INSERT INTO org_messages (chat_id, sender_id, content, type, file_url) VALUES (?,?,?,?,?)',
    [chat_id, user.id, content.trim(), type || 'text', file_url || null]
  );

  const sender = await query<{ name: string; avatar: string }[]>('SELECT name, avatar FROM users WHERE id=?', [user.id]);

  return apiResponse({
    id: result.insertId,
    chat_id: Number(chat_id),
    sender_id: user.id,
    sender_name: sender[0]?.name,
    sender_avatar: sender[0]?.avatar,
    content: content.trim(),
    type: type || 'text',
    created_at: new Date().toISOString(),
  }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');

  const msg = await query<{ sender_id: number; chat_id: number }[]>(
    'SELECT sender_id, chat_id FROM org_messages WHERE id=?', [id]
  );
  if (!msg.length) return apiError('Message not found', 404);

  const chat = await query<{ org_id: number }[]>('SELECT org_id FROM org_chats WHERE id=?', [msg[0].chat_id]);
  const isAdmin = await query<{ role: string }[]>(
    'SELECT role FROM org_members WHERE org_id=? AND user_id=?', [chat[0]?.org_id, user.id]
  );

  if (msg[0].sender_id !== user.id && !['owner', 'admin'].includes(isAdmin[0]?.role))
    return apiError('Not authorized', 403);

  // Soft delete — keep for history, just clear content
  await query("UPDATE org_messages SET content='[Message deleted]', is_edited=1, edited_at=NOW() WHERE id=?", [id]);
  return apiResponse({ message: 'Message deleted' });
});
