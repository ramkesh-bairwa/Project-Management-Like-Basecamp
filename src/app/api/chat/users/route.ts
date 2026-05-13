import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';

  try {
    let users;

    if (user.is_org) {
      // If user is organization, show all org members
      users = await query(`
        SELECT u.id, u.name, u.email, u.avatar, om.role as org_role
        FROM users u
        JOIN org_members om ON om.user_id = u.id
        WHERE om.org_id = (SELECT id FROM organizations WHERE owner_id = ?)
        AND u.id != ?
        AND (u.name LIKE ? OR u.email LIKE ?)
        ORDER BY u.name
        LIMIT 50
      `, [user.id, user.id, `%${search}%`, `%${search}%`]);
    } else {
      // If user is member, show org members where they belong
      users = await query(`
        SELECT DISTINCT u.id, u.name, u.email, u.avatar, om.role as org_role
        FROM users u
        JOIN org_members om ON om.user_id = u.id
        WHERE om.org_id IN (
          SELECT org_id FROM org_members WHERE user_id = ?
        )
        AND u.id != ?
        AND (u.name LIKE ? OR u.email LIKE ?)
        ORDER BY u.name
        LIMIT 50
      `, [user.id, user.id, `%${search}%`, `%${search}%`]);
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
