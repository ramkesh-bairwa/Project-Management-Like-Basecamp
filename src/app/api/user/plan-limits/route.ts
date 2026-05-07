import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export const GET = withAuth(async (_req: NextRequest, user) => {
  const userRow = await query<{ plan_id: number | null; plan_expires_at: string | null }[]>(
    'SELECT plan_id, plan_expires_at FROM users WHERE id=?', [user.id]
  );
  const u = userRow[0];

  let plan = { max_projects: 3, max_members: 5, max_tasks: 20, max_groups: 3, max_storage_gb: 1, name: 'Free' };

  const planId = u?.plan_id;
  // NULL expires_at = free plan (never expires). Only treat as expired if expires_at is set AND in the past.
  const expired = u?.plan_expires_at ? new Date(u.plan_expires_at) < new Date() : false;
  const hasPlan = !!planId && !expired;

  if (hasPlan) {
    const planRow = await query<{ name: string; max_projects: number; max_members: number; max_tasks: number; max_groups: number; max_storage_gb: number }[]>(
      'SELECT name, max_projects, max_members, max_tasks, max_groups, max_storage_gb FROM plans WHERE id=?', [planId]
    );
    if (planRow.length) plan = planRow[0];
  }

  const [projectCount] = await query<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM projects WHERE owner_id=? AND deleted_at IS NULL', [user.id]
  );
  const [taskCount] = await query<{ c: number }[]>(
    `SELECT COUNT(*) as c FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE p.owner_id=? AND t.deleted_at IS NULL AND t.parent_task_id IS NULL`, [user.id]
  );
  const [groupCount] = await query<{ c: number }[]>(
    `SELECT COUNT(*) as c FROM project_groups pg
     JOIN projects p ON p.id = pg.project_id
     WHERE p.owner_id=? AND pg.deleted_at IS NULL`, [user.id]
  );
  const [memberCount] = await query<{ c: number }[]>(
    `SELECT COUNT(DISTINCT pm.user_id) as c FROM project_members pm
     JOIN projects p ON p.id = pm.project_id
     WHERE p.owner_id=? AND pm.user_id != ?`, [user.id, user.id]
  );

  return apiResponse({
    plan: plan.name,
    has_plan: hasPlan,
    limits: {
      max_projects: plan.max_projects,
      max_members: plan.max_members,
      max_tasks: plan.max_tasks,
      max_groups: plan.max_groups,
      max_storage_gb: plan.max_storage_gb,
    },
    usage: {
      projects: projectCount?.c ?? 0,
      tasks: taskCount?.c ?? 0,
      groups: groupCount?.c ?? 0,
      members: memberCount?.c ?? 0,
    },
  });
});
