import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { signToken } from '@/lib/auth';

export const POST = withAuth(async (_req, user) => {
  const rows = await query<{ id: number; email: string; role: string; is_org: number }[]>(
    'SELECT id, email, role, is_org FROM users WHERE id=?', [user.id]
  );
  if (!rows.length) return apiError('User not found', 404);
  const u = rows[0];
  const token = signToken({ id: u.id, email: u.email, role: u.role, is_org: u.is_org === 1 });
  return apiResponse({ token });
});
