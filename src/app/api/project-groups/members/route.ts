import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { createNotification } from '@/app/api/notifications/route';

export const GET = withAuth(async (req: NextRequest) => {
  const group_id = new URL(req.url).searchParams.get('group_id');
  if (!group_id) return apiError('group_id required');
  const rows = await query<unknown[]>(
    `SELECT pgm.role, pgm.joined_at, u.id, u.name, u.email, u.avatar
     FROM project_group_members pgm JOIN users u ON u.id=pgm.user_id WHERE pgm.group_id=?`, [group_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { group_id, user_id, role } = await req.json();
  if (!group_id || !user_id) return apiError('group_id and user_id required');

  const grp = await query<{ project_id: number; name: string }[]>('SELECT project_id, name FROM project_groups WHERE id=?', [group_id]);
  if (!grp.length) return apiError('Group not found', 404);

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner','admin','manager'].includes(member[0].role)) return apiError('Not authorized', 403);

  // Add to group
  await query('INSERT INTO project_group_members (group_id, user_id, role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [group_id, user_id, role || 'member']);

  // Also ensure they are a project member (as developer if not already)
  await query('INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=role',
    [grp[0].project_id, user_id, 'developer']);

  // Also add to group chat if exists
  const grpChat = await query<{ chat_id: number | null }[]>('SELECT chat_id FROM project_groups WHERE id=?', [group_id]);
  if (grpChat[0]?.chat_id) {
    await query('INSERT IGNORE INTO chat_participants (chat_id, user_id) VALUES (?,?)', [grpChat[0].chat_id, user_id]);
  }

  const [adder, proj] = await Promise.all([
    query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]),
    query<{ name: string }[]>('SELECT name FROM projects WHERE id=?', [grp[0].project_id]),
  ]);
  await createNotification(user_id, 'project',
    `You were added to group "${grp[0].name}"`,
    `Added by ${adder[0]?.name || 'someone'} in project "${proj[0]?.name || ''}". You now have access to the project and group chat.`,
    `/projects/${grp[0].project_id}/groups/${group_id}`
  );

  return apiResponse({ message: 'Member added' }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const { group_id, user_id } = await req.json();
  if (!group_id || !user_id) return apiError('group_id and user_id required');
  const grp = await query<{ project_id: number; name: string; chat_id: number | null }[]>(
    'SELECT project_id, name, chat_id FROM project_groups WHERE id=?', [group_id]
  );
  if (!grp.length) return apiError('Group not found', 404);
  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [grp[0].project_id, user.id]);
  if (!member.length || !['owner','admin','manager'].includes(member[0].role)) return apiError('Not authorized', 403);

  // Remove from group
  await query('DELETE FROM project_group_members WHERE group_id=? AND user_id=?', [group_id, user_id]);

  // Remove from group chat
  if (grp[0].chat_id) {
    await query('DELETE FROM chat_participants WHERE chat_id=? AND user_id=?', [grp[0].chat_id, user_id]);
  }

  // Unassign tasks in this group assigned to this user
  await query('UPDATE tasks SET assignee_id=NULL WHERE group_id=? AND assignee_id=? AND deleted_at IS NULL', [group_id, user_id]);

  // Notify removed user
  await createNotification(user_id, 'project',
    `You have been removed from group "${grp[0].name}"`,
    'You no longer have access to this group, its tasks and chat.',
    `/projects/${grp[0].project_id}`
  );

  return apiResponse({ message: 'Member removed' });
});
