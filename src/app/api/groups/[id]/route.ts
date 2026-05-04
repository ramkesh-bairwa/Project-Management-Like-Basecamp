import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const id = Number(req.url.split('/groups/')[1].split('/')[0]);

  const member = await query<unknown[]>('SELECT id FROM group_members WHERE group_id=? AND user_id=?', [id, user.id]);
  if (!member.length) return apiError('Not a group member', 403);

  const grp = await query<unknown[]>('SELECT * FROM `groups` WHERE id=?', [id]);
  if (!grp.length) return apiError('Group not found', 404);

  const members = await query<unknown[]>(
    `SELECT gm.role, gm.joined_at, u.id, u.name, u.email
     FROM group_members gm JOIN users u ON u.id=gm.user_id
     WHERE gm.group_id=?`, [id]
  );

  return apiResponse({ ...(grp[0] as object), members });
});
