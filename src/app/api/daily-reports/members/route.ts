import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    
    // Only admins can add members to reports
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { user_ids, report_date } = await request.json();

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    const date = report_date || new Date().toISOString().split('T')[0];

    // Add members to daily report
    for (const userId of user_ids) {
      try {
        await query(
          'INSERT INTO daily_report_members (report_date, user_id, added_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE added_by = VALUES(added_by)',
          [date, userId, decoded.id]
        );
      } catch (error) {
        // Handle duplicate entries gracefully
        console.log(`User ${userId} already added for date ${date}`);
      }
    }

    return NextResponse.json({ success: true, added_count: user_ids.length });
  } catch (error) {
    console.error('Error adding members to daily report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    
    // Only admins can view members list
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const members = await query(
      `SELECT 
        drm.id,
        drm.report_date,
        u.id as user_id,
        u.name,
        u.email,
        admin.name as added_by_name
      FROM daily_report_members drm
      JOIN users u ON drm.user_id = u.id
      JOIN users admin ON drm.added_by = admin.id
      WHERE drm.report_date = ?
      ORDER BY u.name`,
      [date]
    );

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching daily report members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}