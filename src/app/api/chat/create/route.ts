import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, name, userIds } = await req.json();

    if (!type || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (type === 'direct') {
      if (userIds.length !== 1) {
        return NextResponse.json({ error: 'Direct chat requires exactly one other user' }, { status: 400 });
      }

      const existingConv = await query(`
        SELECT c.id FROM conversations c
        JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
        JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
        WHERE c.type = 'direct'
        AND cp1.user_id = ?
        AND cp2.user_id = ?
        AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
      `, [user.id, userIds[0]]);

      if ((existingConv as any).length > 0) {
        return NextResponse.json({ conversationId: (existingConv as any)[0].id, existing: true });
      }
    }

    await query(
      'INSERT INTO conversations (type, name, created_by) VALUES (?, ?, ?)',
      [type, name || null, user.id]
    );

    const convResult = await query('SELECT LAST_INSERT_ID() as id', []);
    const conversationId = (convResult as any)[0].id;

    const allUserIds = [user.id, ...userIds];
    for (const userId of allUserIds) {
      const isAdmin = type === 'group' && userId === user.id;
      await query(
        'INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)',
        [conversationId, userId, isAdmin ? 1 : 0]
      );
    }

    return NextResponse.json({ conversationId, existing: false });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
