import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || date;
    const userSearch = searchParams.get('user') || '';
    const projectFilter = searchParams.get('project') || '';
    const allTasks = searchParams.get('all_tasks') === 'true';

    let sql = `
      SELECT 
        dr.id,
        u.name as user_name,
        p.name as project_name,
        dr.report_date,
        drt.id as task_id,
        drt.title,
        drt.description,
        drt.image_url,
        drt.status,
        drt.priority,
        drt.task_type,
        drt.estimated_hours,
        drt.actual_hours,
        drt.completion_percentage,
        drt.blocker_type,
        drt.blocker_issue,
        drt.comments
      FROM daily_reports dr
      JOIN users u ON dr.user_id = u.id
      JOIN projects p ON dr.project_id = p.id
      LEFT JOIN daily_report_tasks drt ON dr.id = drt.report_id
    `;
    
    let params: any[] = [];
    let whereConditions: string[] = [];

    // Date filtering - only if not fetching all tasks
    if (!allTasks) {
      if (date === endDate) {
        whereConditions.push('dr.report_date = ?');
        params.push(date);
      } else {
        whereConditions.push('dr.report_date BETWEEN ? AND ?');
        params.push(date, endDate);
      }
    }

    // If not admin, only show user's own reports
    if (decoded.role !== 'admin') {
      whereConditions.push('dr.user_id = ?');
      params.push(decoded.id);
    }

    // Add user search filter for admin
    if (decoded.role === 'admin' && userSearch) {
      whereConditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${userSearch}%`, `%${userSearch}%`);
    }

    // Add project filter
    if (projectFilter) {
      whereConditions.push('p.name = ?');
      params.push(projectFilter);
    }

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    sql += ' ORDER BY p.name ASC, u.name ASC, drt.id ASC';

    const results = await query(sql, params);
    
    // Group tasks by report
    const reportsMap = new Map();
    
    results.forEach((row: any) => {
      if (!reportsMap.has(row.id)) {
        reportsMap.set(row.id, {
          id: row.id,
          user_name: row.user_name,
          project_name: row.project_name,
          report_date: row.report_date,
          tasks: []
        });
      }
      
      if (row.task_id) {
        reportsMap.get(row.id).tasks.push({
          id: row.task_id,
          title: row.title,
          description: row.description,
          image_url: row.image_url,
          status: row.status,
          priority: row.priority,
          task_type: row.task_type,
          estimated_hours: row.estimated_hours,
          actual_hours: row.actual_hours,
          completion_percentage: row.completion_percentage,
          blocker_type: row.blocker_type,
          blocker_issue: row.blocker_issue,
          comments: row.comments
        });
      }
    });

    return NextResponse.json(Array.from(reportsMap.values()));
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    
    const { project_id, report_date } = await request.json();

    if (!project_id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const date = report_date || new Date().toISOString().split('T')[0];

    // Check if report already exists
    const existingReport = await query(
      'SELECT id FROM daily_reports WHERE user_id = ? AND project_id = ? AND report_date = ?',
      [decoded.id, project_id, date]
    );

    if (existingReport.length > 0) {
      return NextResponse.json({ id: existingReport[0].id });
    }

    // Create new report
    const result = await query(
      'INSERT INTO daily_reports (user_id, project_id, report_date) VALUES (?, ?, ?)',
      [decoded.id, project_id, date]
    );

    return NextResponse.json({ id: result.insertId });
  } catch (error) {
    console.error('Error creating daily report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}