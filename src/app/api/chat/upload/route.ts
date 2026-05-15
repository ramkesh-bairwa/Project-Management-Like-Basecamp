import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;

    if (!file || !conversationId) {
      return NextResponse.json({ error: 'Missing file or conversation ID' }, { status: 400 });
    }

    const participantCheck = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, user.id]
    );

    if ((participantCheck as any).length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/chat/${fileName}`;
    const messageType = file.type.startsWith('image/') ? 'image' : 'file';

    await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url, file_name, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [conversationId, user.id, file.name, messageType, fileUrl, file.name, file.size]
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
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
