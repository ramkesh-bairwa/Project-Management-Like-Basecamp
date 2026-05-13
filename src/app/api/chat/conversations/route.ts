import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await query(`
      SELECT 
        c.id,
        c.type,
        c.name,
        c.avatar,
        c.updated_at,
        CASE 
          WHEN c.type = 'direct' THEN (
            SELECT JSON_OBJECT(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'avatar', u.avatar
            )
            FROM conversation_participants cp2
            JOIN users u ON u.id = cp2.user_id
            WHERE cp2.conversation_id = c.id AND cp2.user_id != ?
            LIMIT 1
          )
          ELSE NULL
        END as other_user,
        (
          SELECT CAST(COUNT(*) AS SIGNED)
          FROM messages m
          WHERE m.conversation_id = c.id 
          AND m.created_at > cp.last_read_at
          AND m.sender_id != ?
          AND m.deleted_at IS NULL
        ) as unread_count,
        (
          SELECT JSON_OBJECT(
            'id', m.id,
            'content', m.content,
            'message_type', m.message_type,
            'created_at', m.created_at,
            'sender_name', u.name
          )
          FROM messages m
          JOIN users u ON u.id = m.sender_id
          WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT CAST(COUNT(*) AS SIGNED)
          FROM conversation_participants
          WHERE conversation_id = c.id
        ) as member_count
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE cp.user_id = ?
      ORDER BY c.updated_at DESC
    `, [user.id, user.id, user.id]);

    return NextResponse.json({ conversations: result as any });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch conversations' }, { status: 500 });
  }
}
