import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { createNotification } from '@/app/api/notifications/route';
import crypto from 'crypto';

// GET /api/project-groups/invite?group_id=X — list pending invitations
export const GET = withAuth(async (req: NextRequest, user) => {
  const group_id = new URL(req.url).searchParams.get('group_id');
  if (!group_id) return apiError('group_id required');

  const grp = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=?', [group_id]);
  if (!grp.length) return apiError('Group not found', 404);

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner', 'manager'].includes(member[0].role)) return apiError('Not authorized', 403);

  const rows = await query<unknown[]>(
    `SELECT gi.id, gi.email, gi.status, gi.created_at, gi.expires_at, u.name as invited_by_name
     FROM group_invitations gi JOIN users u ON u.id=gi.invited_by
     WHERE gi.group_id=? ORDER BY gi.created_at DESC`, [group_id]
  );
  return apiResponse(rows);
});

// POST /api/project-groups/invite — send invitation by email
export const POST = withAuth(async (req: NextRequest, user) => {
  const { group_id, email } = await req.json();
  if (!group_id || !email) return apiError('group_id and email required');

  const grp = await query<{ project_id: number; name: string }[]>('SELECT project_id, name FROM project_groups WHERE id=?', [group_id]);
  if (!grp.length) return apiError('Group not found', 404);

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner', 'manager'].includes(member[0].role)) return apiError('Not authorized', 403);

  // check if already invited
  const existing = await query<{ status: string }[]>('SELECT status FROM group_invitations WHERE group_id=? AND email=?', [group_id, email]);
  if (existing.length && existing[0].status === 'pending') return apiError('Invitation already sent to this email');

  const token = crypto.randomBytes(32).toString('hex');
  await query(
    `INSERT INTO group_invitations (group_id, invited_by, email, token, expires_at)
     VALUES (?,?,?,?, DATE_ADD(NOW(), INTERVAL 7 DAY))
     ON DUPLICATE KEY UPDATE token=VALUES(token), status='pending', created_at=NOW(), expires_at=DATE_ADD(NOW(), INTERVAL 7 DAY)`,
    [group_id, user.id, email, token]
  );

  // notify the invited user if they have an account
  const invitedUser = await query<{ id: number }[]>('SELECT id FROM users WHERE email=?', [email]);
  if (invitedUser.length) {
    await createNotification(
      invitedUser[0].id,
      'group_invitation',
      `You've been invited to join "${grp[0].name}"`,
      `Click to accept the invitation`,
      `/invite/group?token=${token}`
    );
  }

  return apiResponse({ message: 'Invitation sent', token }, 201);
});

// PUT /api/project-groups/invite — accept or decline by token
export const PUT = withAuth(async (req: NextRequest, user) => {
  const { token, action } = await req.json(); // action: 'accept' | 'decline'
  if (!token || !action) return apiError('token and action required');

  const inv = await query<{ id: number; group_id: number; email: string; status: string; expires_at: string }[]>(
    'SELECT * FROM group_invitations WHERE token=?', [token]
  );
  if (!inv.length) return apiError('Invalid invitation token', 404);
  if (inv[0].status !== 'pending') return apiError(`Invitation already ${inv[0].status}`);
  if (new Date(inv[0].expires_at) < new Date()) {
    await query('UPDATE group_invitations SET status=? WHERE id=?', ['expired', inv[0].id]);
    return apiError('Invitation has expired');
  }

  if (action === 'accept') {
    await query('INSERT IGNORE INTO project_group_members (group_id, user_id, role) VALUES (?,?,?)', [inv[0].group_id, user.id, 'member']);
    await query('UPDATE group_invitations SET status=? WHERE id=?', ['accepted', inv[0].id]);
    return apiResponse({ message: 'Joined group successfully' });
  } else {
    await query('UPDATE group_invitations SET status=? WHERE id=?', ['declined', inv[0].id]);
    return apiResponse({ message: 'Invitation declined' });
  }
});

// DELETE /api/project-groups/invite?id=X — cancel invitation
export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id required');

  const inv = await query<{ group_id: number }[]>('SELECT group_id FROM group_invitations WHERE id=?', [id]);
  if (!inv.length) return apiError('Invitation not found', 404);

  const grp = await query<{ project_id: number }[]>('SELECT project_id FROM project_groups WHERE id=?', [inv[0].group_id]);
  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner', 'manager'].includes(member[0].role)) return apiError('Not authorized', 403);

  await query('DELETE FROM group_invitations WHERE id=?', [id]);
  return apiResponse({ message: 'Invitation cancelled' });
});
