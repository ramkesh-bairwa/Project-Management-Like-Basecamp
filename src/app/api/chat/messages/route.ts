import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  const limit = parseInt(searchParams.get('limit') || '50');
  const before = searchParams.get('before');

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
  }

  try {
    const participantCheck = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, user.id]
    );

    if ((participantCheck as any).length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messagesQuery = `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.message_type, 
        m.file_url, m.file_name, m.file_size, m.created_at, m.updated_at, m.deleted_at,
        u.name as sender_name, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC LIMIT ?`;

    const params = [conversationId, limit];
    const result = await query(messagesQuery, params);

    await query(
      'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?',
      [conversationId, user.id]
    );

    return NextResponse.json({ messages: (result as any).reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { conversationId, content, messageType = 'text', fileUrl, fileName, fileSize } = await req.json();

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const participantCheck = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, user.id]
    );

    if ((participantCheck as any).length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url, file_name, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [conversationId, user.id, content, messageType, fileUrl || null, fileName || null, fileSize || null]
    );

    await query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    const messageResult = await query(
      'SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = LAST_INSERT_ID()',
      []
    );

    const message = (messageResult as any)[0];

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
