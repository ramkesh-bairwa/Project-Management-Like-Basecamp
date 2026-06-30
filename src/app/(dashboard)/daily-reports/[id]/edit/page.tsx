'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface ReportTask {
  id: number;
  title: string;
  description: string;
  image_url: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  task_type: 'feature' | 'bug' | 'testing' | 'meeting';
  estimated_hours: number;
  actual_hours: number;
  completion_percentage: number;
  blocker_type: string;
  blocker_issue: string;
  comments: string;
}

interface Report {
  id: number;
  user_name: string;
  project_name: string;
  report_date: string;
  tasks: ReportTask[];
}

export default function EditReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [editingTask, setEditingTask] = useState<ReportTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const t = localStorage.getItem('token');
    setToken(t);
    if (!t) {
      router.push('/login');
      return;
    }

    loadReport(t);
  }, [router, params.id]);

  const loadReport = async (token: string) => {
    try {
      const res = await fetch(`/api/daily-reports/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to load report');
      }
      
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Failed to load report');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (task: ReportTask) => {
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch('/api/daily-reports/tasks', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
      });

      if (res.ok) {
        setReport(prev => prev ? {
          ...prev,
          tasks: prev.tasks.map(t => t.id === task.id ? task : t)
        } : null);
        setEditingTask(null);
        alert('Task updated successfully!');
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h3>
        <button onClick={() => router.back()} className="text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Reports
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Edit Report</h1>
        <p className="text-gray-600">
          {report.user_name} • {report.project_name} • {report.report_date}
        </p>
      </div>

      <div className="space-y-6">
        {report.tasks.map(task => (
          <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {editingTask?.id === task.id ? (
              <TaskEditForm
                task={editingTask}
                onSave={updateTask}
                onCancel={() => setEditingTask(null)}
                saving={saving}
              />
            ) : (
              <TaskDisplay
                task={task}
                onEdit={() => setEditingTask(task)}
              />
            )}
          </div>
        ))}

        {report.tasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-gray-600">This report doesn't have any tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskDisplay({ task, onEdit }: { task: ReportTask; onEdit: () => void }) {
  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          Edit Task
        </button>
      </div>

      {task.description && (
        <p className="text-gray-600 mb-4">{task.description}</p>
      )}

      {task.image_url && (
        <div className="mb-4">
          <img 
            src={task.image_url} 
            alt="Task attachment" 
            className="max-w-md rounded-lg border border-gray-200" 
          />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="flex gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${
            task.status === 'done' ? 'bg-green-100 text-green-800' :
            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            task.status === 'blocked' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {task.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            task.priority === 'high' ? 'bg-red-100 text-red-800' :
            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {task.priority.toUpperCase()}
          </span>
        </div>
        
        <div className="text-sm text-gray-600">
          Type: <span className="font-medium">{task.task_type}</span>
        </div>
        <div className="text-sm text-gray-600">
          Hours: <span className="font-medium">{task.estimated_hours}h / {task.actual_hours}h</span>
        </div>
        <div className="text-sm text-gray-600">
          Progress: <span className="font-medium">{task.completion_percentage}%</span>
        </div>
      </div>

      {task.blocker_issue && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg">
          <h4 className="font-medium text-red-800 mb-1">Blocker/Issue:</h4>
          <p className="text-red-700 text-sm">{task.blocker_issue}</p>
        </div>
      )}

      {task.comments && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-1">Comments:</h4>
          <p className="text-gray-700 text-sm">{task.comments}</p>
        </div>
      )}
    </div>
  );
}

function TaskEditForm({ task, onSave, onCancel, saving }: {
  task: ReportTask;
  onSave: (task: ReportTask) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<ReportTask>(task);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('hours') || name === 'completion_percentage' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
          <select
            name="task_type"
            value={formData.task_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="testing">Testing</option>
            <option value="meeting">Meeting</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
          <input
            type="number"
            name="estimated_hours"
            value={formData.estimated_hours}
            onChange={handleChange}
            min="0"
            step="0.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Actual Hours</label>
          <input
            type="number"
            name="actual_hours"
            value={formData.actual_hours}
            onChange={handleChange}
            min="0"
            step="0.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Completion %</label>
        <input
          type="number"
          name="completion_percentage"
          value={formData.completion_percentage}
          onChange={handleChange}
          min="0"
          max="100"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Blocker/Issue</label>
        <textarea
          name="blocker_issue"
          value={formData.blocker_issue}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
        <textarea
          name="comments"
          value={formData.comments}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}