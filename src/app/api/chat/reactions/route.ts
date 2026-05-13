import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { messageId, emoji } = await req.json();

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await query(
      'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [messageId, user.id, emoji]
    );

    if ((existing as any).length > 0) {
      await query('DELETE FROM message_reactions WHERE id = ?', [(existing as any)[0].id]);
      return NextResponse.json({ action: 'removed' });
    } else {
      await query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
        [messageId, user.id, emoji]
      );
      return NextResponse.json({ action: 'added' });
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
