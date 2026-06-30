import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    
    const reportId = parseInt(params.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

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
      WHERE dr.id = ?
    `;
    
    const params_arr = [reportId];

    // If not admin, only allow viewing own reports
    if (decoded.role !== 'admin') {
      sql += ' AND dr.user_id = ?';
      params_arr.push(decoded.id);
    }

    sql += ' ORDER BY drt.id';

    const results = await query(sql, params_arr);
    
    if (results.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Build report object
    const report = {
      id: results[0].id,
      user_name: results[0].user_name,
      project_name: results[0].project_name,
      report_date: results[0].report_date,
      tasks: results
        .filter((row: any) => row.task_id)
        .map((row: any) => ({
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
        }))
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}