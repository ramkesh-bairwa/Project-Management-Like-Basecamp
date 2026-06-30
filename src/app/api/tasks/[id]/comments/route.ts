import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    jwt.verify(token, JWT_SECRET);
    
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const comments = await query(
      `SELECT 
        tc.id, tc.comment, tc.created_at,
        u.name as user_name, u.avatar
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC`,
      [taskId]
    );

    // Get activity history
    const activities = await query(
      `SELECT 
        tah.id, tah.action_type, tah.old_value, tah.new_value, 
        tah.details, tah.created_at,
        u.name as user_name, u.avatar
      FROM task_activity_history tah
      JOIN users u ON tah.user_id = u.id
      WHERE tah.task_id = ?
      ORDER BY tah.created_at ASC`,
      [taskId]
    );

    return NextResponse.json({ comments, activities });
  } catch (error) {
    console.error('Error fetching task comments/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const requestBody = await request.json();
    const { comment } = requestBody;
    if (!comment?.trim()) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    const taskExists = await query(
      'SELECT id FROM daily_report_tasks WHERE id = ?',
      [taskId]
    );
    
    if (!Array.isArray(taskExists) || taskExists.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const commentResult = await query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [taskId, decoded.id, comment.trim()]
    );

    await query(
      'INSERT INTO task_activity_history (task_id, user_id, action_type, details) VALUES (?, ?, ?, ?)',
      [taskId, decoded.id, 'commented', `Added a comment: "${comment.trim().substring(0, 50)}${comment.length > 50 ? '...' : ''}"`]
    );

    return NextResponse.json({ id: (commentResult as any).insertId, success: true });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}