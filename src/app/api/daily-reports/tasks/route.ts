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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string; is_org: boolean };
    
    // Validate decoded token has id
    if (!decoded.id) {
      console.error('JWT decoded but no id found:', decoded);
      return NextResponse.json({ error: 'Invalid token - no user ID' }, { status: 401 });
    }
    
    const requestBody = await request.json();
    console.log('Received request body:', requestBody);
    console.log('Decoded user ID:', decoded.id);
    
    const {
      project_id,
      title,
      description,
      image_url,
      status,
      priority,
      task_type,
      estimated_hours,
      actual_hours,
      completion_percentage,
      blocker_type,
      blocker_issue,
      comments
    } = requestBody;

    if (!project_id || !title?.trim()) {
      return NextResponse.json({ error: 'Project and title are required' }, { status: 400 });
    }

    const reportDate = new Date().toISOString().split('T')[0];
    console.log('Query parameters for report check:', [decoded.id, project_id, reportDate]);

    // Get or create daily report
    let report = await query(
      'SELECT id FROM daily_reports WHERE user_id = ? AND project_id = ? AND report_date = ?',
      [decoded.id, project_id, reportDate]
    );

    let reportId;
    if (Array.isArray(report) && report.length === 0) {
      console.log('Creating new report with params:', [decoded.id, project_id, reportDate]);
      const newReport = await query(
        'INSERT INTO daily_reports (user_id, project_id, report_date) VALUES (?, ?, ?)',
        [decoded.id, project_id, reportDate]
      );
      reportId = (newReport as any).insertId;
    } else {
      reportId = (report as any)[0].id;
    }

    console.log('Report ID:', reportId);

    // Ensure all numeric values are properly handled
    const safeEstimatedHours = estimated_hours != null ? Number(estimated_hours) : 0;
    const safeActualHours = actual_hours != null ? Number(actual_hours) : 0;
    const safeCompletionPercentage = completion_percentage != null ? Number(completion_percentage) : 0;

    const taskParams = [
      reportId, 
      decoded.id, 
      project_id, 
      title, 
      description || null, 
      image_url || null,
      status || 'todo', 
      priority || 'medium', 
      task_type || 'feature',
      safeEstimatedHours, 
      safeActualHours, 
      safeCompletionPercentage,
      blocker_type || null,
      blocker_issue || null, 
      comments || null
    ];

    console.log('Task insert parameters:', taskParams);
    console.log('Parameter types:', taskParams.map(p => typeof p));

    // Create task
    const result = await query(
      `INSERT INTO daily_report_tasks (
        report_id, user_id, project_id, title, description, image_url,
        status, priority, task_type, estimated_hours, actual_hours,
        completion_percentage, blocker_type, blocker_issue, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      taskParams
    );

    const taskId = (result as any).insertId;

    // Log activity history for task creation
    await query(
      'INSERT INTO task_activity_history (task_id, user_id, action_type, details) VALUES (?, ?, ?, ?)',
      [taskId, decoded.id, 'created', `Task created: "${title}"`]
    );

    return NextResponse.json({ id: taskId, report_id: reportId });
  } catch (error) {
    console.error('Error creating daily report task:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string; is_org: boolean };
    
    const {
      id,
      title,
      description,
      image_url,
      status,
      priority,
      task_type,
      estimated_hours,
      actual_hours,
      completion_percentage,
      blocker_type,
      blocker_issue,
      comments
    } = await request.json();

    if (!id || !title.trim()) {
      return NextResponse.json({ error: 'Task ID and title are required' }, { status: 400 });
    }

    // Check if user can edit this task
    let checkSql = 'SELECT user_id FROM daily_report_tasks WHERE id = ?';
    const taskCheck = await query(checkSql, [id]);
    
    if (!Array.isArray(taskCheck) || taskCheck.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Allow editing if it's the task owner or admin
    if ((taskCheck as any)[0].user_id !== decoded.id && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get old values for comparison
    const oldTask = await query(
      'SELECT * FROM daily_report_tasks WHERE id = ?',
      [id]
    );
    
    const oldValues = (oldTask as any)[0];
    const activities = [];
    
    // Track changes
    if (oldValues.status !== (status || 'todo')) {
      activities.push({
        action_type: 'status_changed',
        old_value: oldValues.status,
        new_value: status || 'todo',
        details: `Status changed from "${oldValues.status}" to "${status || 'todo'}"`
      });
    }
    
    if (oldValues.priority !== (priority || 'medium')) {
      activities.push({
        action_type: 'priority_changed',
        old_value: oldValues.priority,
        new_value: priority || 'medium',
        details: `Priority changed from "${oldValues.priority}" to "${priority || 'medium'}"`
      });
    }
    
    if (oldValues.completion_percentage !== (completion_percentage || 0)) {
      activities.push({
        action_type: 'progress_updated',
        old_value: oldValues.completion_percentage.toString(),
        new_value: (completion_percentage || 0).toString(),
        details: `Progress updated from ${oldValues.completion_percentage}% to ${completion_percentage || 0}%`
      });
    }
    
    if (oldValues.title !== title) {
      activities.push({
        action_type: 'title_changed',
        old_value: oldValues.title,
        new_value: title,
        details: `Title changed from "${oldValues.title}" to "${title}"`
      });
    }
    
    if (oldValues.estimated_hours !== (estimated_hours || 0) || oldValues.actual_hours !== (actual_hours || 0)) {
      activities.push({
        action_type: 'hours_updated',
        old_value: `${oldValues.estimated_hours}h / ${oldValues.actual_hours}h`,
        new_value: `${estimated_hours || 0}h / ${actual_hours || 0}h`,
        details: `Hours updated: Est. ${oldValues.estimated_hours}h → ${estimated_hours || 0}h, Actual ${oldValues.actual_hours}h → ${actual_hours || 0}h`
      });
    }
    
    if ((!oldValues.blocker_issue && blocker_issue) || (oldValues.blocker_issue && !blocker_issue)) {
      if (blocker_issue) {
        activities.push({
          action_type: 'blocker_added',
          old_value: null,
          new_value: blocker_issue,
          details: `Blocker added: "${blocker_issue}"`
        });
      } else {
        activities.push({
          action_type: 'blocker_resolved',
          old_value: oldValues.blocker_issue,
          new_value: null,
          details: `Blocker resolved: "${oldValues.blocker_issue}"`
        });
      }
    }

    // Update task
    await query(
      `UPDATE daily_report_tasks SET
        title = ?, description = ?, image_url = ?, status = ?, priority = ?,
        task_type = ?, estimated_hours = ?, actual_hours = ?, completion_percentage = ?,
        blocker_type = ?, blocker_issue = ?, comments = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        title, 
        description || null, 
        image_url || null, 
        status || 'todo', 
        priority || 'medium',
        task_type || 'feature', 
        estimated_hours || 0, 
        actual_hours || 0, 
        completion_percentage || 0,
        blocker_type || null,
        blocker_issue || null, 
        comments || null, 
        id
      ]
    );
    
    // Log all activity changes
    for (const activity of activities) {
      await query(
        'INSERT INTO task_activity_history (task_id, user_id, action_type, old_value, new_value, details) VALUES (?, ?, ?, ?, ?, ?)',
        [id, decoded.id, activity.action_type, activity.old_value, activity.new_value, activity.details]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating daily report task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const taskCheck = await query('SELECT user_id, title FROM daily_report_tasks WHERE id = ?', [id]);
    if (!Array.isArray(taskCheck) || taskCheck.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = (taskCheck as any)[0];
    if (task.user_id !== decoded.id && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await query('DELETE FROM task_comments WHERE task_id = ?', [id]);
    await query('DELETE FROM daily_report_tasks WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}