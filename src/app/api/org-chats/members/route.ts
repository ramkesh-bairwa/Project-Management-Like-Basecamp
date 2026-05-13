import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const chat_id = new URL(req.url).searchParams.get('chat_id');
  if (!chat_id) return apiError('chat_id required');
  const member = await query<{ id: number }[]>(
    'SELECT id FROM org_chat_members WHERE chat_id=? AND user_id=?', [chat_id, user.id]
  );
  if (!member.length) return apiError('Not a member', 403);
  const rows = await query<unknown[]>(
    `SELECT ocm.role, ocm.joined_at, u.id, u.name, u.email, u.avatar
     FROM org_chat_members ocm JOIN users u ON u.id=ocm.user_id WHERE ocm.chat_id=?`, [chat_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { chat_id, user_id } = await req.json();
  if (!chat_id || !user_id) return apiError('chat_id and user_id required');

  const chat = await query<{ org_id: number }[]>('SELECT org_id FROM org_chats WHERE id=?', [chat_id]);
  if (!chat.length) return apiError('Chat not found', 404);

  const myMembership = await query<{ role: string }[]>(
    'SELECT role FROM org_chat_members WHERE chat_id=? AND user_id=?', [chat_id, user.id]
  );
  if (!myMembership.length || myMembership[0].role !== 'admin') return apiError('Not authorized', 403);

  const isOrgMember = await query<{ id: number }[]>(
    'SELECT id FROM org_members WHERE org_id=? AND user_id=?', [chat[0].org_id, user_id]
  );
  if (!isOrgMember.length) return apiError('User is not an org member', 400);

  await query('INSERT IGNORE INTO org_chat_members (chat_id, user_id, role) VALUES (?,?,?)', [chat_id, user_id, 'member']);
  return apiResponse({ message: 'Member added' }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const { chat_id, user_id } = await req.json();
  if (!chat_id || !user_id) return apiError('chat_id and user_id required');

  const myMembership = await query<{ role: string }[]>(
    'SELECT role FROM org_chat_members WHERE chat_id=? AND user_id=?', [chat_id, user.id]
  );
  // Can remove self, or admin can remove others
  if (user_id !== user.id && (!myMembership.length || myMembership[0].role !== 'admin'))
    return apiError('Not authorized', 403);

  await query('DELETE FROM org_chat_members WHERE chat_id=? AND user_id=?', [chat_id, user_id]);
  return apiResponse({ message: 'Member removed' });
});
