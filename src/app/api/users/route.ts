import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const email = searchParams.get('email');

  if (email) {
    const rows = await query<unknown[]>(
      'SELECT id, name, email, avatar FROM users WHERE email = ? LIMIT 1', [email]
    );
    if (!rows.length) return apiError('User not found', 404);
    return apiResponse(rows[0]);
  }

  const rows = await query<unknown[]>(
    'SELECT id, name, email, avatar, bio, is_org FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 50',
    [`%${search}%`, `%${search}%`]
  );
  return apiResponse(rows);
});
