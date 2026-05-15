import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { content } = await req.json();
    const params = await context.params;
    const messageId = params.id;

    console.log('[PATCH] Editing message:', messageId, 'by user:', user.id);

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const messageCheck = await query(
      'SELECT sender_id FROM messages WHERE id = ?',
      [messageId]
    );

    if ((messageCheck as any).length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if ((messageCheck as any)[0].sender_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await query(
      'UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content, messageId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PATCH] Error editing message:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getTokenFromRequest(req);
  if (!user) {
    console.log('[DELETE] Unauthorized - no user');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const messageId = params.id;
    console.log('[DELETE] Attempting to delete message:', messageId, 'by user:', user.id);

    const messageCheck = await query(
      'SELECT sender_id FROM messages WHERE id = ?',
      [messageId]
    );

    console.log('[DELETE] Message check result:', messageCheck);

    if ((messageCheck as any).length === 0) {
      console.log('[DELETE] Message not found');
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if ((messageCheck as any)[0].sender_id !== user.id) {
      console.log('[DELETE] Access denied - sender:', (messageCheck as any)[0].sender_id, 'user:', user.id);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await query(
      'UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [messageId]
    );

    console.log('[DELETE] Update result:', result);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE] Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
