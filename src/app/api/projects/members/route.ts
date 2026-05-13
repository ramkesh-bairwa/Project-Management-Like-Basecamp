import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { createNotification } from '@/app/api/notifications/route';

export const GET = withAuth(async (req: NextRequest) => {
  const project_id = new URL(req.url).searchParams.get('project_id');
  if (!project_id) return apiError('project_id required');
  const rows = await query<unknown[]>(
    `SELECT pm.role, pm.joined_at, u.id, u.name, u.email, u.avatar
     FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?`, [project_id]
  );
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { project_id, user_id, role } = await req.json();
  if (!project_id || !user_id) return apiError('project_id and user_id required');

  const owner = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=? AND role IN ("owner","admin","manager")', [project_id, user.id]);
  if (!owner.length) return apiError('Not authorized', 403);

  // Only owner can assign admin role
  if (role === 'admin') {
    const isOwner = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=? AND role="owner"', [project_id, user.id]);
    if (!isOwner.length) return apiError('Only the project owner can grant admin role', 403);
  }

  await query('INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [project_id, user_id, role || 'developer']);

  const [proj, adder] = await Promise.all([
    query<{ name: string }[]>('SELECT name FROM projects WHERE id=?', [project_id]),
    query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]),
  ]);
  await createNotification(user_id, 'project',
    `You were added to project "${proj[0]?.name || 'a project'}"`,
    `Added by ${adder[0]?.name || 'someone'} as ${role || 'developer'}.`,
    `/projects/${project_id}`
  );

  return apiResponse({ message: 'Member added' }, 201);
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const { project_id, user_id } = await req.json();
  if (!project_id || !user_id) return apiError('project_id and user_id required');
  const owner = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=? AND role IN ("owner","admin","manager")', [project_id, user.id]);
  if (!owner.length) return apiError('Not authorized', 403);

  // Remove from project
  await query('DELETE FROM project_members WHERE project_id=? AND user_id=?', [project_id, user_id]);

  // Remove from all project groups
  const groups = await query<{ id: number; chat_id: number | null }[]>(
    'SELECT id, chat_id FROM project_groups WHERE project_id=? AND deleted_at IS NULL', [project_id]
  );
  for (const grp of groups) {
    await query('DELETE FROM project_group_members WHERE group_id=? AND user_id=?', [grp.id, user_id]);
    // Remove from group chat
    if (grp.chat_id) {
      await query('DELETE FROM chat_participants WHERE chat_id=? AND user_id=?', [grp.chat_id, user_id]);
    }
  }

  // Unassign tasks assigned to this user in this project
  await query('UPDATE tasks SET assignee_id=NULL WHERE project_id=? AND assignee_id=? AND deleted_at IS NULL', [project_id, user_id]);

  // Notify removed user
  const proj = await query<{ name: string; slug: string }[]>('SELECT name, slug FROM projects WHERE id=?', [project_id]);
  await createNotification(user_id, 'project',
    `You have been removed from project "${proj[0]?.name || 'a project'}"`,
    'You no longer have access to this project, its groups, tasks and chats.',
    '/projects'
  );

  return apiResponse({ message: 'Member removed' });
});
