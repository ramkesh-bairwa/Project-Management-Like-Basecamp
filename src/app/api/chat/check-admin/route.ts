import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let canCreateGroup = false;

    if (user.is_org) {
      canCreateGroup = true;
    } else {
      const adminCheck = await query(`
        SELECT COUNT(*) as count
        FROM org_members
        WHERE user_id = ? AND role IN ('owner', 'admin')
      `, [user.id]);
      
      canCreateGroup = (adminCheck as any)[0].count > 0;
    }

    return NextResponse.json({ canCreateGroup });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ error: 'Failed to check permissions' }, { status: 500 });
  }
}
