import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { createNotification } from '@/app/api/notifications/route';

export const GET = withAuth(async (req: NextRequest) => {
  const org_id = new URL(req.url).searchParams.get('org_id');
  if (!org_id) return apiError('org_id required');
  const rows = await query<unknown[]>(
    `SELECT om.role, om.joined_at, u.id, u.name, u.email, u.avatar
     FROM org_members om JOIN users u ON u.id = om.user_id WHERE om.org_id = ?`, [org_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { org_id, user_id, role } = await req.json();
  if (!org_id || !user_id) return apiError('org_id and user_id required');

  const owner = await query<unknown[]>('SELECT id FROM org_members WHERE org_id=? AND user_id=? AND role IN ("owner","admin")', [org_id, user.id]);
  if (!owner.length) return apiError('Not authorized', 403);

  await query('INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [org_id, user_id, role || 'member']);

  const org = await query<{ name: string }[]>('SELECT name FROM organizations WHERE id=?', [org_id]);
  const adder = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
  await createNotification(user_id, 'project',
    `You were added to organization "${org[0]?.name || 'an organization'}"`,
    `Added by ${adder[0]?.name || 'someone'} as ${role || 'member'}.`,
    '/organizations'
  );

  return apiResponse({ message: 'Member added' }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const { org_id, user_id } = await req.json();
  if (!org_id || !user_id) return apiError('org_id and user_id required');

  const owner = await query<unknown[]>('SELECT id FROM org_members WHERE org_id=? AND user_id=? AND role IN ("owner","admin")', [org_id, user.id]);
  if (!owner.length) return apiError('Not authorized', 403);

  // Remove from org
  await query('DELETE FROM org_members WHERE org_id=? AND user_id=?', [org_id, user_id]);

  // Remove from all projects under this org
  const projects = await query<{ id: number }[]>(
    'SELECT id FROM projects WHERE org_id=? AND deleted_at IS NULL', [org_id]
  );
  for (const proj of projects) {
    // Remove from project
    await query('DELETE FROM project_members WHERE project_id=? AND user_id=?', [proj.id, user_id]);

    // Remove from all groups in this project
    const groups = await query<{ id: number; chat_id: number | null }[]>(
      'SELECT id, chat_id FROM project_groups WHERE project_id=? AND deleted_at IS NULL', [proj.id]
    );
    for (const grp of groups) {
      await query('DELETE FROM project_group_members WHERE group_id=? AND user_id=?', [grp.id, user_id]);
      if (grp.chat_id) {
        await query('DELETE FROM chat_participants WHERE chat_id=? AND user_id=?', [grp.chat_id, user_id]);
      }
    }

    // Unassign tasks in this project
    await query('UPDATE tasks SET assignee_id=NULL WHERE project_id=? AND assignee_id=? AND deleted_at IS NULL', [proj.id, user_id]);
  }

  // Remove from org chat channels
  await query('DELETE FROM org_chat_members WHERE user_id=? AND chat_id IN (SELECT id FROM org_chats WHERE org_id=?)', [user_id, org_id]);

  // Notify removed user
  const org = await query<{ name: string }[]>('SELECT name FROM organizations WHERE id=?', [org_id]);
  await createNotification(user_id, 'project',
    `You have been removed from organization "${org[0]?.name || 'an organization'}"`,
    'You no longer have access to this organization, its projects, groups, tasks and chats.',
    '/organizations'
  );

  return apiResponse({ message: 'Member removed' });
});
