import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, userIds } = await req.json();

    if (!name || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Check if user is organization owner or admin
    let canCreateGroup = false;
    
    if (user.is_org) {
      // User is organization owner
      canCreateGroup = true;
    } else {
      // Check if user is admin in any organization
      const adminCheck = await query(`
        SELECT COUNT(*) as count
        FROM org_members
        WHERE user_id = ? AND role IN ('owner', 'admin')
      `, [user.id]);
      
      canCreateGroup = (adminCheck as any)[0].count > 0;
    }

    if (!canCreateGroup) {
      return NextResponse.json({ error: 'Only organization owners/admins can create groups' }, { status: 403 });
    }

    // Get user's organization(s)
    let orgId;
    if (user.is_org) {
      const orgResult = await query(
        'SELECT id FROM organizations WHERE owner_id = ? LIMIT 1',
        [user.id]
      );
      orgId = (orgResult as any)[0]?.id;
    } else {
      const orgResult = await query(
        'SELECT org_id FROM org_members WHERE user_id = ? AND role IN ("owner", "admin") LIMIT 1',
        [user.id]
      );
      orgId = (orgResult as any)[0]?.org_id;
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Verify all users are in the organization
    const orgCheck = await query(`
      SELECT COUNT(*) as count
      FROM org_members om
      WHERE om.org_id = ?
      AND om.user_id IN (${userIds.map(() => '?').join(',')})
    `, [orgId, ...userIds]);

    if ((orgCheck as any)[0].count !== userIds.length) {
      return NextResponse.json({ error: 'Some users are not in your organization' }, { status: 400 });
    }

    await query(
      'INSERT INTO conversations (type, name, created_by) VALUES (?, ?, ?)',
      ['group', name, user.id]
    );

    const convResult = await query('SELECT LAST_INSERT_ID() as id', []);
    const conversationId = (convResult as any)[0].id;

    // Add creator as admin
    await query(
      'INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)',
      [conversationId, user.id, 1]
    );

    // Add other members
    for (const userId of userIds) {
      if (userId !== user.id) {
        await query(
          'INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)',
          [conversationId, userId, 0]
        );
      }
    }

    return NextResponse.json({ conversationId });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
