import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const org_id = new URL(req.url).searchParams.get('org_id');
  if (!org_id) return apiError('org_id required');

  const member = await query<{ role: string }[]>(
    'SELECT role FROM org_members WHERE org_id=? AND user_id=?', [org_id, user.id]
  );
  if (!member.length) return apiError('Not a member of this organization', 403);

  const rows = await query<unknown[]>(
    `SELECT oc.*,
      u.name as created_by_name,
      (SELECT COUNT(*) FROM org_chat_members WHERE chat_id=oc.id) as member_count,
      (SELECT content FROM org_messages WHERE chat_id=oc.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM org_messages WHERE chat_id=oc.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM org_messages om
        LEFT JOIN org_chat_members ocm ON ocm.chat_id=om.chat_id AND ocm.user_id=?
        WHERE om.chat_id=oc.id AND (ocm.last_read_at IS NULL OR om.created_at > ocm.last_read_at)
      ) as unread_count,
      ocm2.role as my_role
     FROM org_chats oc
     JOIN users u ON u.id=oc.created_by
     JOIN org_chat_members ocm2 ON ocm2.chat_id=oc.id AND ocm2.user_id=?
     WHERE oc.org_id=? AND oc.is_archived=0
     ORDER BY last_message_at DESC, oc.created_at DESC`,
    [user.id, user.id, org_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { org_id, type, name, description, member_ids } = await req.json();
  if (!org_id || !type) return apiError('org_id and type required');

  const member = await query<{ role: string }[]>(
    'SELECT role FROM org_members WHERE org_id=? AND user_id=?', [org_id, user.id]
  );
  if (!member.length) return apiError('Not a member', 403);

  if (type === 'announcement' && !['owner', 'admin'].includes(member[0].role))
    return apiError('Only owner or admin can create announcement channels', 403);

  if (type === 'dm') {
    if (!member_ids?.length) return apiError('member_ids required for DM');
    const otherId = member_ids[0];
    // Check existing DM
    const existing = await query<{ id: number }[]>(
      `SELECT oc.id FROM org_chats oc
       JOIN org_chat_members m1 ON m1.chat_id=oc.id AND m1.user_id=?
       JOIN org_chat_members m2 ON m2.chat_id=oc.id AND m2.user_id=?
       WHERE oc.org_id=? AND oc.type='dm' LIMIT 1`,
      [user.id, otherId, org_id]
    );
    if (existing.length) return apiResponse({ id: existing[0].id, existing: true });
  }

  const result = await query<{ insertId: number }>(
    'INSERT INTO org_chats (org_id, type, name, description, created_by) VALUES (?,?,?,?,?)',
    [org_id, type, name || null, description || null, user.id]
  );
  const chatId = result.insertId;

  // Add creator
  await query('INSERT INTO org_chat_members (chat_id, user_id, role) VALUES (?,?,?)', [chatId, user.id, 'admin']);

  // Add other members
  if (member_ids?.length) {
    for (const uid of member_ids) {
      if (uid !== user.id) {
        const isMember = await query<{ id: number }[]>(
          'SELECT id FROM org_members WHERE org_id=? AND user_id=?', [org_id, uid]
        );
        if (isMember.length) {
          await query('INSERT IGNORE INTO org_chat_members (chat_id, user_id, role) VALUES (?,?,?)', [chatId, uid, 'member']);
        }
      }
    }
  }

  // For announcement/group — add all org members
  if (type === 'announcement') {
    const allMembers = await query<{ user_id: number }[]>('SELECT user_id FROM org_members WHERE org_id=?', [org_id]);
    for (const m of allMembers) {
      await query('INSERT IGNORE INTO org_chat_members (chat_id, user_id, role) VALUES (?,?,?)', [chatId, m.user_id, 'member']);
    }
  }

  return apiResponse({ id: chatId, type, name }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');

  const chat = await query<{ org_id: number; created_by: number }[]>(
    'SELECT org_id, created_by FROM org_chats WHERE id=?', [id]
  );
  if (!chat.length) return apiError('Chat not found', 404);

  const member = await query<{ role: string }[]>(
    'SELECT role FROM org_members WHERE org_id=? AND user_id=?', [chat[0].org_id, user.id]
  );
  if (!member.length || !['owner', 'admin'].includes(member[0].role))
    return apiError('Not authorized', 403);

  // Archive instead of delete to preserve message history
  await query('UPDATE org_chats SET is_archived=1 WHERE id=?', [id]);
  return apiResponse({ message: 'Chat archived' });
});
