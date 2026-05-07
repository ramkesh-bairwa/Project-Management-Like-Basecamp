import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { createNotification } from '@/app/api/notifications/route';
import { generateUUID, uniqueSlug } from '@/lib/slug';

type TaskRow = { id: number; project_id: number; title: string; status: string; priority: string; assignee_id: number | null; group_id: number | null; parent_task_id: number | null };

async function logHistory(task_id: number, changed_by: number, action: string, old_value: string | null, new_value: string | null, note?: string) {
  await query(
    'INSERT INTO task_history (task_id, changed_by, action, old_value, new_value, note) VALUES (?,?,?,?,?,?)',
    [task_id, changed_by, action, old_value, new_value, note || null]
  );
}

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const project_id = searchParams.get('project_id');
  const group_id = searchParams.get('group_id');
  const parent_task_id = searchParams.get('parent_task_id');
  const task_id = searchParams.get('task_id'); // single task by id/uuid/slug

  if (!project_id && !group_id && !parent_task_id && !task_id) return apiError('project_id, group_id, parent_task_id, or task_id required');

  // Single task lookup by id, uuid, or slug
  if (task_id) {
    const rows = await query<{ project_id: number; group_id: number | null } & Record<string, unknown>[]>(
      `SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar,
        cu.name as creator_name,
        pg.name as group_name, pg.color as group_color,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM comments WHERE entity_type='task' AND entity_id = t.id) as comment_count
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users cu ON cu.id = t.created_by
       LEFT JOIN project_groups pg ON pg.id = t.group_id
       WHERE (t.id = ? OR t.uuid = ? OR t.slug = ?) AND t.deleted_at IS NULL`,
      [task_id, task_id, task_id]
    );
    if (!rows.length) return apiError('Task not found', 404);
    const task = rows[0] as { project_id: number; group_id: number | null };
    if (task.group_id) {
      const grpMember = await query<unknown[]>('SELECT id FROM project_group_members WHERE group_id=? AND user_id=?', [task.group_id, user.id]);
      if (!grpMember.length) return apiError('Task not found', 404);
    } else {
      const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [task.project_id, user.id]);
      if (!member.length) return apiError('Task not found', 404);
    }
    return apiResponse(rows[0]);
  }

  let sql = `SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar,
    cu.name as creator_name,
    pg.name as group_name, pg.color as group_color,
    (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as subtask_count,
    (SELECT COUNT(*) FROM comments WHERE entity_type='task' AND entity_id = t.id) as comment_count
   FROM tasks t
   LEFT JOIN users u ON u.id = t.assignee_id
   LEFT JOIN users cu ON cu.id = t.created_by
   LEFT JOIN project_groups pg ON pg.id = t.group_id
   WHERE `;

  const params: (string | number)[] = [];

  if (parent_task_id) {
    const parent = await query<{ group_id: number | null; project_id: number }[]>('SELECT group_id, project_id FROM tasks WHERE id=? AND deleted_at IS NULL', [parent_task_id]);
    if (!parent.length) return apiError('Parent task not found', 404);
    if (parent[0].group_id) {
      const grpMember = await query<unknown[]>('SELECT id FROM project_group_members WHERE group_id=? AND user_id=?', [parent[0].group_id, user.id]);
      if (!grpMember.length) return apiError('Not authorized', 403);
    } else {
      const projMember = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [parent[0].project_id, user.id]);
      if (!projMember.length) return apiError('Not authorized', 403);
    }
    sql += 't.parent_task_id = ? AND t.deleted_at IS NULL';
    params.push(parent_task_id);
  } else if (group_id) {
    const grp = await query<{ id: number }[]>(
      'SELECT id FROM project_groups WHERE id=? OR uuid=? OR slug=?', [group_id, group_id, group_id]
    );
    if (!grp.length) return apiError('Group not found', 404);
    const grpMember = await query<unknown[]>('SELECT id FROM project_group_members WHERE group_id=? AND user_id=?', [grp[0].id, user.id]);
    if (!grpMember.length) return apiError('Not authorized', 403);
    sql += 't.group_id = ? AND t.parent_task_id IS NULL AND t.deleted_at IS NULL';
    params.push(grp[0].id);
  } else {
    const member = await query<unknown[]>('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [project_id!, user.id]);
    if (!member.length) return apiError('Not a project member', 403);
    sql += 't.project_id = ? AND t.parent_task_id IS NULL AND t.deleted_at IS NULL';
    params.push(project_id!);
  }

  sql += ' ORDER BY t.position ASC, t.created_at DESC';
  const rows = await query<unknown[]>(sql, params);
  return apiResponse(rows);
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const { project_id, group_id, parent_task_id, title, description, assignee_id, status, priority, due_date, estimated_hours, image } = await req.json();
  if (!project_id || !title) return apiError('project_id and title required');

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [project_id, user.id]);
  if (!member.length) return apiError('Not a project member', 403);

  // Plan limit check (only for top-level tasks, not subtasks)
  if (!parent_task_id) {
    const projOwner = await query<{ owner_id: number }[]>('SELECT owner_id FROM projects WHERE id=?', [project_id]);
    const ownerId = projOwner[0]?.owner_id ?? user.id;
    const userPlan = await query<{ plan_id: number | null; plan_expires_at: string | null }[]>('SELECT plan_id, plan_expires_at FROM users WHERE id=?', [ownerId]);
    let maxTasks = 20;
    if (userPlan[0]?.plan_id) {
      const expired = userPlan[0].plan_expires_at && new Date(userPlan[0].plan_expires_at) < new Date();
      if (!expired) {
        const pl = await query<{ max_tasks: number }[]>('SELECT max_tasks FROM plans WHERE id=?', [userPlan[0].plan_id]);
        if (pl.length) maxTasks = pl[0].max_tasks;
      }
    }
    if (maxTasks !== -1) {
      const [cnt] = await query<{ c: number }[]>(
        `SELECT COUNT(*) as c FROM tasks t JOIN projects p ON p.id=t.project_id WHERE p.owner_id=? AND t.deleted_at IS NULL AND t.parent_task_id IS NULL`, [ownerId]
      );
      if ((cnt?.c ?? 0) >= maxTasks) return apiError(`Plan limit reached: your plan allows ${maxTasks} task${maxTasks === 1 ? '' : 's'}. Upgrade to create more.`, 403);
    }
  }

  const result = await query<{ insertId: number }>(
    'INSERT INTO tasks (project_id, group_id, created_by, assignee_id, parent_task_id, title, description, image, status, priority, due_date, estimated_hours) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [project_id, group_id || null, user.id, assignee_id || null, parent_task_id || null, title, description || null, image || null, status || 'todo', priority || 'medium', due_date || null, estimated_hours || null]
  );
  const uuid = generateUUID();
  const slug = await uniqueSlug('tasks', 'slug', title);
  await query('UPDATE tasks SET uuid=?, slug=? WHERE id=?', [uuid, slug, result.insertId]);

  await logHistory(result.insertId, user.id, 'created', null, title);
  if (assignee_id) {
    const assigneeName = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [assignee_id]);
    await logHistory(result.insertId, user.id, 'assigned', null, assigneeName[0]?.name || String(assignee_id));
  }
  // Log subtask_added on parent task so it shows in parent's activity feed
  if (parent_task_id) {
    await logHistory(Number(parent_task_id), user.id, 'subtask_added', null, title);
  }

  const creator = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
  const creatorName = creator[0]?.name || 'someone';

  // Notify assignee directly (always, if they are a group/project member)
  if (assignee_id && assignee_id !== user.id) {
    await createNotification(assignee_id, 'task',
      `You were assigned a new task: "${title}"`,
      `Assigned by ${creatorName}.`,
      `/projects/${project_id}/tasks/${slug}`
    );
  }

  // Notify only group members if task belongs to a group, otherwise project members
  if (group_id) {
    const groupMembers = await query<{ user_id: number }[]>(
      'SELECT user_id FROM project_group_members WHERE group_id=? AND user_id != ?', [group_id, user.id]
    );
    for (const m of groupMembers) {
      if (m.user_id === assignee_id) continue;
      await createNotification(m.user_id, 'task',
        `New task in your group: "${title}"`,
        `Created by ${creatorName}.`,
        `/projects/${project_id}/tasks/${slug}`
      );
    }
  } else {
    const projectMembers = await query<{ user_id: number }[]>(
      'SELECT user_id FROM project_members WHERE project_id=? AND user_id != ?', [project_id, user.id]
    );
    for (const m of projectMembers) {
      if (m.user_id === assignee_id) continue;
      await createNotification(m.user_id, 'task',
        `New task created: "${title}"`,
        `Created by ${creatorName}.`,
        `/projects/${project_id}/tasks/${slug}`
      );
    }
  }

  return apiResponse({ id: result.insertId, uuid, slug, title }, 201);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  const { id, title, description, assignee_id, status, priority, due_date, actual_hours, position, group_id, image } = await req.json();
  if (!id) return apiError('Task id required');

  const tasks = await query<TaskRow[]>('SELECT * FROM tasks WHERE id=?', [id]);
  if (!tasks.length) return apiError('Task not found', 404);
  const old = tasks[0];

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [old.project_id, user.id]);
  if (!member.length) return apiError('Not authorized', 403);

  const userRole = member[0].role;

  // Developers cannot reopen a task closed by manager/owner
  if (old.status === 'done' && status !== 'done' && userRole === 'developer') {
    const lastClose = await query<{ changed_by: number; action: string }[]>(
      `SELECT changed_by, action FROM task_history WHERE task_id=? AND action='status_changed' AND new_value='done' ORDER BY created_at DESC LIMIT 1`, [id]
    );
    if (lastClose.length) {
      const closer = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [old.project_id, lastClose[0].changed_by]);
      if (closer.length && ['owner','admin','manager'].includes(closer[0].role)) {
        return apiError('Task was closed by a manager. Only a manager, admin or owner can reopen it.', 403);
      }
    }
  }

  await query(
    'UPDATE tasks SET title=?, description=?, assignee_id=?, status=?, priority=?, due_date=?, actual_hours=?, position=?, group_id=?, image=? WHERE id=?',
    [title ?? old.title, description ?? null, assignee_id ?? null, status ?? old.status, priority ?? old.priority, due_date ?? null, actual_hours ?? null, position ?? 0, group_id ?? old.group_id, image ?? null, id]
  );

  // Log each change
  if (status && status !== old.status) {
    const action = status === 'done' ? 'closed' : old.status === 'done' ? 'reopened' : 'status_changed';
    await logHistory(id, user.id, action, old.status, status);
    // If this is a subtask, also log on parent task
    if (old.parent_task_id) {
      await logHistory(old.parent_task_id, user.id, 'subtask_status_changed', old.title, `${old.title} → ${status}`);
    }
    const updater = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [user.id]);
    const taskSlug = await query<{ slug: string }[]>('SELECT slug FROM tasks WHERE id=?', [id]);
    const taskLink = `/projects/${old.project_id}/tasks/${taskSlug[0]?.slug || id}`;
    const updaterName = updater[0]?.name || 'someone';

    // Notify group members if task is in a group, otherwise project members
    if (old.group_id) {
      const targets = await query<{ user_id: number }[]>(
        'SELECT user_id FROM project_group_members WHERE group_id=? AND user_id != ?', [old.group_id, user.id]
      );
      for (const t of targets) {
        await createNotification(t.user_id, 'task',
          `Task "${old.title}" status changed to ${status}`,
          `Updated by ${updaterName}.`, taskLink
        );
      }
    } else {
      const targets = await query<{ user_id: number }[]>(
        'SELECT user_id FROM project_members WHERE project_id=? AND user_id != ?', [old.project_id, user.id]
      );
      for (const t of targets) {
        await createNotification(t.user_id, 'task',
          `Task "${old.title}" status changed to ${status}`,
          `Updated by ${updaterName}.`, taskLink
        );
      }
    }
  }
  if (title && title !== old.title) await logHistory(id, user.id, 'title_changed', old.title, title);
  if (priority && priority !== old.priority) await logHistory(id, user.id, 'priority_changed', old.priority, priority);
  if (assignee_id !== undefined && assignee_id !== old.assignee_id) {
    // Resolve names for meaningful history
    let oldName: string | null = null;
    let newName: string | null = null;
    if (old.assignee_id) {
      const r = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [old.assignee_id]);
      oldName = r[0]?.name || String(old.assignee_id);
    }
    if (assignee_id) {
      const r = await query<{ name: string }[]>('SELECT name FROM users WHERE id=?', [assignee_id]);
      newName = r[0]?.name || String(assignee_id);
    }
    await logHistory(id, user.id, assignee_id ? 'assigned' : 'unassigned', oldName, newName);
  }
  if (group_id !== undefined && group_id !== old.group_id) {
    let oldGrp: string | null = null;
    let newGrp: string | null = null;
    if (old.group_id) {
      const r = await query<{ name: string }[]>('SELECT name FROM project_groups WHERE id=?', [old.group_id]);
      oldGrp = r[0]?.name || String(old.group_id);
    }
    if (group_id) {
      const r = await query<{ name: string }[]>('SELECT name FROM project_groups WHERE id=?', [group_id]);
      newGrp = r[0]?.name || String(group_id);
    }
    await logHistory(id, user.id, 'moved_group', oldGrp, newGrp);
  }

  return apiResponse({ message: 'Task updated' });
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('Task id required');

  const tasks = await query<TaskRow[]>('SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL', [id]);
  if (!tasks.length) return apiError('Task not found', 404);

  const member = await query<{ role: string }[]>('SELECT role FROM project_members WHERE project_id=? AND user_id=?', [tasks[0].project_id, user.id]);
  if (!member.length) return apiError('Not authorized', 403);

  await query('UPDATE tasks SET deleted_at=NOW() WHERE id=?', [id]);
  await query('UPDATE tasks SET deleted_at=NOW() WHERE parent_task_id=? AND deleted_at IS NULL', [id]);
  await logHistory(Number(id), user.id, 'deleted', tasks[0].title, null);
  return apiResponse({ message: 'Task deleted' });
});
