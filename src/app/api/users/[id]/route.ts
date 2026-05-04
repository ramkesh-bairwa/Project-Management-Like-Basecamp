import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, _user) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return apiError('id required');

  const rows = await query<unknown[]>(
    `SELECT u.id, u.name, u.email, u.avatar, u.bio, u.is_org, u.created_at,
      p.name as plan_name,
      (SELECT COUNT(*) FROM project_members WHERE user_id = u.id) as project_count,
      (SELECT COUNT(*) FROM connections WHERE (requester_id = u.id OR receiver_id = u.id) AND status = 'accepted') as connection_count
     FROM users u LEFT JOIN plans p ON u.plan_id = p.id WHERE u.id = ?`, [id]
  );
  if (!rows.length) return apiError('User not found', 404);
  return apiResponse(rows[0]);
});
