'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  token_number: string;
  title: string;
  description: string;
  user_name: string;
  project_name: string;
  status: string;
  priority: string;
  completion_percentage: number;
  report_date: string;
  report_id: number;
  task_type: string;
  estimated_hours: number;
  actual_hours: number;
  blocker_issue: string;
  comments: string;
  image_url?: string;
  blocker_type?: string;
}

// Create Slide Panel Component
const CreateSlidePanel = ({
  isOpen,
  onClose,
  projects,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onCreate: (form: any) => Promise<void>;
}) => {
  const [form, setForm] = useState({ title: '', description: '', project_id: '', status: 'todo', priority: 'medium', task_type: 'feature', estimated_hours: 0, actual_hours: 0, completion_percentage: 0, blocker_issue: '', comments: '' });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({ title: '', description: '', project_id: '', status: 'todo', priority: 'medium', task_type: 'feature', estimated_hours: 0, actual_hours: 0, completion_percentage: 0, blocker_issue: '', comments: '' });

  const handleClose = () => { reset(); onClose(); };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.project_id) return;
    setSaving(true);
    await onCreate(form);
    setSaving(false);
    reset();
    onClose();
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleClose} />
      <div className={`fixed right-0 top-0 h-full w-1/2 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderRadius: '16px 0 0 16px', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)' }}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div>
                <p className="text-xs text-emerald-100 font-medium">Daily Report</p>
                <h2 className="text-base font-bold leading-tight">Create New Task</h2>
              </div>
            </div>
            <button onClick={handleClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Project *</label>
              <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Task title..." className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} placeholder="What are you working on?" className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Task Type</label>
                <select value={form.task_type} onChange={e => setForm(f => ({...f, task_type: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="testing">Testing</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Progress %</label>
                <input type="number" min="0" max="100" value={form.completion_percentage} onChange={e => setForm(f => ({...f, completion_percentage: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Est. Hours</label>
                <input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={e => setForm(f => ({...f, estimated_hours: parseFloat(e.target.value) || 0}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Actual Hours</label>
                <input type="number" min="0" step="0.5" value={form.actual_hours} onChange={e => setForm(f => ({...f, actual_hours: parseFloat(e.target.value) || 0}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Blocker / Issue</label>
              <textarea value={form.blocker_issue} onChange={e => setForm(f => ({...f, blocker_issue: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Comments</label>
              <textarea value={form.comments} onChange={e => setForm(f => ({...f, comments: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button onClick={handleCreate} disabled={!form.title.trim() || !form.project_id || saving} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 transition-all shadow-md flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating...</> : 'Create Task'}
            </button>
            <button onClick={handleClose} className="px-4 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
};

// Delete Confirm Modal
const DeleteConfirmModal = ({ task, onConfirm, onCancel, deleting }: { task: Task | null; onConfirm: () => void; onCancel: () => void; deleting: boolean; }) => {
  if (!task) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Task</h3>
        <p className="text-sm text-gray-500 text-center mb-1">Are you sure you want to delete</p>
        <p className="text-sm font-semibold text-gray-800 text-center mb-5">&ldquo;{task.title}&rdquo;?</p>
        <p className="text-xs text-red-500 text-center mb-5">This action cannot be undone. Activity history will be preserved.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-2">
            {deleting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting...</> : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditSlidePanel = ({
  isOpen,
  onClose,
  editForm,
  setEditForm,
  saveEdit,
  task,
}: {
  isOpen: boolean;
  onClose: () => void;
  editForm: Partial<Task>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Task>>>;
  saveEdit: () => void;
  task: Task | null;
}) => {
  if (!task) return null;
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full w-1/2 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ borderRadius: '16px 0 0 16px', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)' }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <div>
                <p className="text-xs text-orange-100 font-medium">{task.token_number}</p>
                <h2 className="text-base font-bold leading-tight">Edit Task</h2>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
              <input value={editForm.title || ''} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
              <textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Status</label>
                <select value={editForm.status || ''} onChange={e => setEditForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Priority</label>
                <select value={editForm.priority || ''} onChange={e => setEditForm(f => ({...f, priority: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Task Type</label>
                <select value={editForm.task_type || ''} onChange={e => setEditForm(f => ({...f, task_type: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="testing">Testing</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Progress %</label>
                <input type="number" min="0" max="100" value={editForm.completion_percentage ?? 0} onChange={e => setEditForm(f => ({...f, completion_percentage: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Est. Hours</label>
                <input type="number" min="0" step="0.5" value={editForm.estimated_hours ?? 0} onChange={e => setEditForm(f => ({...f, estimated_hours: parseFloat(e.target.value) || 0}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Actual Hours</label>
                <input type="number" min="0" step="0.5" value={editForm.actual_hours ?? 0} onChange={e => setEditForm(f => ({...f, actual_hours: parseFloat(e.target.value) || 0}))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Blocker / Issue</label>
              <textarea value={editForm.blocker_issue || ''} onChange={e => setEditForm(f => ({...f, blocker_issue: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Comments</label>
              <textarea value={editForm.comments || ''} onChange={e => setEditForm(f => ({...f, comments: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button onClick={saveEdit} disabled={!editForm.title?.trim()} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 transition-all shadow-md">Save Changes</button>
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
};

// Slide Panel Component
const CommentSlidePanel = ({
  isOpen,
  onClose,
  task,
  taskComments,
  newComment,
  setNewComment,
  addComment,
  loadTaskComments,
  updateTaskField,
  updatingTask,
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  taskComments: any;
  newComment: string;
  setNewComment: (value: string) => void;
  addComment: (taskId: number) => void;
  loadTaskComments: (taskId: number) => void;
  updateTaskField: (taskId: number, field: string, value: string | number) => void;
  updatingTask: number | null;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const showSuccessMessage = () => { 
    setSuccessMessage(true); 
    setTimeout(() => setSuccessMessage(false), 3000); 
  };

  useEffect(() => {
    if (isOpen && task && !taskComments[task.id]) {
      loadTaskComments(task.id);
    }
  }, [isOpen, task, taskComments, loadTaskComments]);

  const handleSubmit = async () => {
    if (!task || !newComment.trim()) return;
    setSubmitting(true);
    await addComment(task.id);
    setSubmitting(false);
    showSuccessMessage();
  };

  if (!task) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide Panel - half screen from right */}
      <div
        className={`fixed right-0 top-0 h-full w-1/2 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ borderRadius: '16px 0 0 16px', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)' }}
      >
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-violet-600 to-purple-700 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <div>
                <p className="text-xs text-violet-200 font-medium">{task.token_number}</p>
                <h2 className="text-base font-bold leading-tight">{task.title}</h2>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Quick Status Controls */}
          <div className="px-6 pt-4 pb-3 border-b border-gray-100 flex-shrink-0 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Update</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                <select
                  value={task.status}
                  onChange={e => updateTaskField(task.id, 'status', e.target.value)}
                  disabled={updatingTask === task.id}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Priority</label>
                <select
                  value={task.priority}
                  onChange={e => updateTaskField(task.id, 'priority', e.target.value)}
                  disabled={updatingTask === task.id}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Progress %</label>
                <input
                  type="number" min="0" max="100"
                  value={task.completion_percentage}
                  onChange={e => updateTaskField(task.id, 'completion_percentage', parseInt(e.target.value) || 0)}
                  disabled={updatingTask === task.id}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>
            {updatingTask === task.id && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-violet-600">
                <div className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            )}
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Comment posted successfully!</p>
                <p className="text-xs text-green-600">Your comment has been added to the task.</p>
              </div>
            </div>
          )}

          {/* Comment Form */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Write a comment</label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your comment here..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-sm text-gray-800 bg-gray-50 placeholder-gray-400 transition"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || submitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Posting...</>
                ) : (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Post Comment</>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {taskComments[task.id]?.comments?.length > 0
                ? `${taskComments[task.id].comments.length} Comment${taskComments[task.id].comments.length > 1 ? 's' : ''}`
                : 'No comments yet'}
            </p>
            <div className="space-y-4">
              {taskComments[task.id]?.comments?.length > 0 ? (
                taskComments[task.id].comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {comment.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{comment.user_name}</span>
                        <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{comment.comment}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">No comments yet</p>
                  <p className="text-xs text-gray-400 mt-1">Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default function DailyReportsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState<string | null>(null);
  const [activitySearch, setActivitySearch] = useState('');
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);
  const [slidePanelTask, setSlidePanelTask] = useState<Task | null>(null);
  const [isSlidePanelOpen, setIsSlidePanelOpen] = useState(false);
  const [taskComments, setTaskComments] = useState<{[key: string]: any}>({});
  const [newComment, setNewComment] = useState('');

  const openCommentPanel = (task: Task) => {
    setSlidePanelTask(task);
    setNewComment('');
    setTimeout(() => setIsSlidePanelOpen(true), 10);
  };

  const closeCommentPanel = () => {
    setIsSlidePanelOpen(false);
    setTimeout(() => setSlidePanelTask(null), 300);
  };
  const [updatingTask, setUpdatingTask] = useState<number | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<number | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateFilter, setDateFilter] = useState('single');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem('token');
    setToken(t);
    if (!t) {
      router.push('/login');
      return;
    }

    fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(data => {
        setIsAdmin(data.role === 'admin');
        loadData(t, data.role === 'admin');
      })
      .catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (allTasks.length > 0 && token) {
      allTasks.forEach(t => loadTaskComments(t.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, token]);

  useEffect(() => {
    let filtered = allTasks;
    if (searchQuery.trim()) {
      filtered = filtered.filter(task => 
        task.token_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.user_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredTasks(filtered);
    setCurrentPage(1);
  }, [searchQuery, allTasks, showAllTasks]);

  // Pagination logic
  const totalRecords = filteredTasks.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const displayTasks = showAllTasks ? filteredTasks.slice(startIndex, endIndex) : filteredTasks;

  const loadData = async (token: string, adminUser: boolean) => {
    try {
      const projectsRes = await fetch('/api/projects', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const projectsData = await projectsRes.json();
      const projectsList = Array.isArray(projectsData) ? projectsData : [];
      setProjects(projectsList);
      const defaultProject = projectsList.length > 0 ? projectsList[0].name : '';
      if (defaultProject) setProjectFilter(defaultProject);

      if (adminUser) {
        const usersRes = await fetch('/api/admin/users', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      await loadReports(token, undefined, undefined, undefined, false, defaultProject);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (filter: string, rangeStart?: string, rangeEnd?: string) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    switch (filter) {
      case 'single': return { start: rangeStart || '', end: rangeStart || '' };
      case 'today': return { start: fmt(today), end: fmt(today) };
      case 'last_week': { const s = new Date(today); s.setDate(today.getDate() - 7); return { start: fmt(s), end: fmt(today) }; }
      case 'last_10': { const s = new Date(today); s.setDate(today.getDate() - 10); return { start: fmt(s), end: fmt(today) }; }
      case 'last_15': { const s = new Date(today); s.setDate(today.getDate() - 15); return { start: fmt(s), end: fmt(today) }; }
      case 'last_month': { const s = new Date(today); s.setDate(today.getDate() - 30); return { start: fmt(s), end: fmt(today) }; }
      case 'range': return { start: rangeStart || '', end: rangeEnd || '' };
      default: return { start: fmt(today), end: fmt(today) };
    }
  };

  const loadReports = async (token: string, filter?: string, rs?: string, re?: string, forceAllTasks?: boolean, forceProject?: string) => {
    const f = filter ?? dateFilter;
    const useAllTasks = forceAllTasks ?? showAllTasks;
    const useProject = forceProject ?? projectFilter;
    
    let params: URLSearchParams;
    
    if (useAllTasks && useProject) {
      params = new URLSearchParams({
        all_tasks: 'true',
        project: useProject,
        user: searchUser
      });
    } else {
      const { start, end } = getDateRange(f, rs ?? (f === 'single' ? singleDate : dateRangeStart), re ?? dateRangeEnd);
      params = new URLSearchParams({
        date: start,
        end_date: end,
        user: searchUser
      });
      if (useProject) {
        params.append('project', useProject);
      }
    }
    
    try {
      const res = await fetch(`/api/daily-reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      console.log('Raw reports data:', data);
      
      const tasks: Task[] = [];
      const tokenCounters: Record<string, number> = {};

      const getProjectPrefix = (name: string): string => {
        const words = name.trim().toUpperCase().split(/\s+/);
        return words.length === 1 ? words[0].substring(0, 4) : words.map(w => w[0]).join('').substring(0, 4);
      };

      const getUserPrefix = (name: string): string =>
        name.trim().toUpperCase().split(/\s+/)[0].substring(0, 3);
      
      if (Array.isArray(data)) {
        data.forEach((report: any) => {
          report.tasks.forEach((task: any) => {
            const projPrefix = getProjectPrefix(report.project_name || 'TASK');
            const userPrefix = getUserPrefix(report.user_name || 'USR');
            const key = `${projPrefix}-${userPrefix}`;
            tokenCounters[key] = (tokenCounters[key] || 0) + 1;
            tasks.push({
              ...task,
              token_number: `${key}-${String(tokenCounters[key]).padStart(4, '0')}`,
              user_name: report.user_name,
              project_name: report.project_name,
              report_date: report.report_date,
              report_id: report.id
            });
          });
        });
      }
      
      setAllTasks(tasks);
      setFilteredTasks(tasks);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const addMembersToReport = async () => {
    if (!token || selectedMembers.length === 0) return;
    
    try {
      const res = await fetch('/api/daily-reports/members', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_ids: selectedMembers,
          report_date: reportDate
        })
      });

      if (res.ok) {
        setSelectedMembers([]);
        await loadReports(token);
        alert('Members added to daily report successfully!');
      }
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

  const toggleTaskDetails = (taskId: string, taskDbId?: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
      if (taskDbId && !taskComments[taskDbId]) loadTaskComments(taskDbId);
    }
    setExpandedTasks(newExpanded);
  };

  const loadTaskComments = async (taskId: number) => {
    if (!token) return;
    
    console.log('Loading comments for task:', taskId);
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Load comments response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Comments data:', data);
        
        setTaskComments(prev => ({
          ...prev,
          [taskId]: data
        }));
      } else {
        console.error('Failed to load comments:', res.status);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const addComment = async (taskId: number) => {
    if (!token || !newComment.trim()) return;
    
    console.log('Adding comment to task ID:', taskId, 'Type:', typeof taskId, 'Comment:', newComment.trim());
    
    // Validate task ID
    if (!taskId || isNaN(taskId) || taskId <= 0) {
      alert('Invalid task ID: ' + taskId);
      return;
    }
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: newComment.trim() })
      });
      
      console.log('Comment response status:', res.status);
      const result = await res.json();
      console.log('Comment response:', result);
      
      if (res.ok) {
        setNewComment('');
        await loadTaskComments(taskId);
        // Reload tasks to get updated data
        await loadReports(token);
        // Success message is handled by the component state
      } else {
        alert('Failed to add comment: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment: ' + error);
    }
  };

  const updateTaskField = async (taskId: number, field: string, value: string | number) => {
    if (!token) return;
    
    setUpdatingTask(taskId);
    try {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      const updateData = {
        id: taskId,
        title: task.title,
        description: task.description,
        image_url: task.image_url || '',
        status: task.status,
        priority: task.priority,
        task_type: task.task_type,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        completion_percentage: task.completion_percentage,
        blocker_type: task.blocker_type || '',
        blocker_issue: task.blocker_issue || '',
        comments: task.comments || '',
        [field]: value
      };

      const res = await fetch('/api/daily-reports/tasks', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (res.ok) {
        // Reload tasks and comments to get updated data
        await loadReports(token);
        await loadTaskComments(taskId);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setUpdatingTask(null);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!token) return;
    setDeletingTask(taskId);
    try {
      const res = await fetch('/api/daily-reports/tasks', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId })
      });
      if (res.ok) { setDeleteConfirmTask(null); await loadReports(token); }
      else { const d = await res.json(); alert(d.error || 'Failed to delete'); }
    } catch (e) { console.error(e); }
    finally { setDeletingTask(null); }
  };

  const createTask = async (form: any) => {
    if (!token) return;
    const res = await fetch('/api/daily-reports/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, project_id: parseInt(form.project_id) })
    });
    if (res.ok) await loadReports(token);
    else { const d = await res.json(); alert(d.error || 'Failed to create task'); }
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditForm({
      title: task.title, description: task.description, status: task.status,
      priority: task.priority, task_type: task.task_type,
      estimated_hours: task.estimated_hours, actual_hours: task.actual_hours,
      completion_percentage: task.completion_percentage,
      blocker_issue: task.blocker_issue, comments: task.comments
    });
    setTimeout(() => setIsEditPanelOpen(true), 10);
  };

  const saveEdit = async () => {
    if (!token || !editTask) return;
    const res = await fetch('/api/daily-reports/tasks', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editTask.id, ...editForm })
    });
    if (res.ok) { setIsEditPanelOpen(false); setTimeout(() => setEditTask(null), 300); await loadReports(token); await loadTaskComments(editTask.id); }
    else { const d = await res.json(); alert(d.error || 'Failed to save'); }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading daily reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto p-6">
      <CreateSlidePanel
        isOpen={isCreatePanelOpen}
        onClose={() => setIsCreatePanelOpen(false)}
        projects={projects}
        onCreate={createTask}
      />

      <DeleteConfirmModal
        task={deleteConfirmTask}
        onConfirm={() => deleteConfirmTask && deleteTask(deleteConfirmTask.id)}
        onCancel={() => setDeleteConfirmTask(null)}
        deleting={deletingTask !== null}
      />

      <CommentSlidePanel
        isOpen={isSlidePanelOpen}
        onClose={closeCommentPanel}
        task={slidePanelTask}
        taskComments={taskComments}
        newComment={newComment}
        setNewComment={setNewComment}
        addComment={addComment}
        loadTaskComments={loadTaskComments}
        updateTaskField={updateTaskField}
        updatingTask={updatingTask}
      />

      <EditSlidePanel
        isOpen={isEditPanelOpen}
        onClose={() => { setIsEditPanelOpen(false); setTimeout(() => setEditTask(null), 300); }}
        editForm={editForm}
        setEditForm={setEditForm}
        saveEdit={saveEdit}
        task={editTask}
      />
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Reports</h1>
            <p className="text-gray-600">Track and manage daily tasks with token numbers</p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setIsCreatePanelOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add New Task
            </button>
          )}
        </div>
      </div>

      {/* Today's Tasks Box */}
      {(() => {
        const today = new Date().toDateString();
        const todayTasks = allTasks.filter(t => new Date(t.report_date).toDateString() === today);
        const done = todayTasks.filter(t => t.status === 'done').length;
        const inProgress = todayTasks.filter(t => t.status === 'in_progress').length;
        const blocked = todayTasks.filter(t => t.status === 'blocked').length;
        const todo = todayTasks.filter(t => t.status === 'todo').length;
        if (todayTasks.length === 0) return null;
        return (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">📋</span>
              <h3 className="font-bold text-gray-900 text-sm">Today&apos;s Tasks</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ml-auto">{todayTasks.length} total</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#f0fdf9' }}>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-xs font-semibold text-green-700">Done</span>
                <span className="text-xs font-black text-green-800">{done}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#eff6ff' }}>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-xs font-semibold text-blue-700">In Progress</span>
                <span className="text-xs font-black text-blue-800">{inProgress}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#fef2f2' }}>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-xs font-semibold text-red-700">Blocked</span>
                <span className="text-xs font-black text-red-800">{blocked}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#f8fafc' }}>
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="text-xs font-semibold text-gray-600">Todo</span>
                <span className="text-xs font-black text-gray-700">{todo}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Tasks</label>
            <input
              type="text"
              placeholder="Search by token number, title, or user name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Project</label>
            <select
              value={projectFilter}
              onChange={(e) => {
                const val = e.target.value;
                setProjectFilter(val);
                if (!val) setShowAllTasks(false);
                if (token) loadReports(token, undefined, undefined, undefined, showAllTasks && !!val, val);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Show Tasks</label>
            <div className="flex items-center gap-3 h-10">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllTasks}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    
                    if (checked && !projectFilter) {
                      alert('Please select a project first to view all tasks');
                      return;
                    }
                    
                    setShowAllTasks(checked);
                    setCurrentPage(1);
                    if (token) loadReports(token, undefined, undefined, undefined, checked, projectFilter);
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">All Tasks of Selected Project</span>
              </label>
            </div>
          </div>
          {showAllTasks && (
            <div className="min-w-[120px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Records/Page</label>
              <select
                value={recordsPerPage}
                onChange={(e) => {
                  setRecordsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
          {!showAllTasks && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Filter</label>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value !== 'range' && e.target.value !== 'single' && token) loadReports(token, e.target.value);
                    if (e.target.value === 'single' && token) loadReports(token, 'single', singleDate);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="single">Single Date</option>
                  <option value="today">Today</option>
                  <option value="last_week">Last Week</option>
                  <option value="last_10">Last 10 Days</option>
                  <option value="last_15">Last 15 Days</option>
                  <option value="last_month">Last Month</option>
                  <option value="range">Date Range</option>
                </select>
              </div>
              {dateFilter === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => {
                      setSingleDate(e.target.value);
                      if (token) loadReports(token, 'single', e.target.value);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              {dateFilter === 'range' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => {
                        setDateRangeStart(e.target.value);
                        if (dateRangeEnd && token) loadReports(token, 'range', e.target.value, dateRangeEnd);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => {
                        setDateRangeEnd(e.target.value);
                        if (dateRangeStart && token) loadReports(token, 'range', dateRangeStart, e.target.value);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadReports(token!)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Filter Reports
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Add Members to Report</h3>
            
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 mb-4">
              {filteredUsers.map(user => (
                <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, user.id]);
                      } else {
                        setSelectedMembers(selectedMembers.filter(id => id !== user.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={addMembersToReport}
              disabled={selectedMembers.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Add {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''} to Report
            </button>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              All Tasks ({filteredTasks.length})
              {showAllTasks && totalPages > 1 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Page {currentPage} of {totalPages})
                </span>
              )}
            </h2>
            {showAllTasks && totalPages > 1 && (
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords} tasks
              </div>
            )}
          </div>
        </div>
        
        {displayTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'No tasks match your search criteria.' : 'No tasks created yet.'}
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayTasks.map((task) => {
                  const taskKey = `${task.report_id}-${task.id}`;
                  const isExpanded = expandedTasks.has(taskKey);
                  
                  return (
                    <React.Fragment key={taskKey}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {task.token_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                          )}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.user_name}</td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.project_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            task.status === 'done' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </span>
                        </td>


                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(task.report_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => toggleTaskDetails(taskKey, task.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-all shadow-sm"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                            <button
                              onClick={() => openCommentPanel(task)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                              </svg>
                              Comment
                            </button>
                            <button
                              onClick={() => openEdit(task)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-all"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirmTask(task)}
                              disabled={deletingTask === task.id}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all"
                            >
                              {deletingTask === task.id
                                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              }
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>


                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Task Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div><span className="font-medium text-gray-700">Type:</span> <span className="capitalize">{task.task_type}</span></div>
                                  <div><span className="font-medium text-gray-700">Estimated Hours:</span> {task.estimated_hours}h</div>
                                  <div><span className="font-medium text-gray-700">Actual Hours:</span> {task.actual_hours}h</div>
                                  <div><span className="font-medium text-gray-700">Progress:</span> {task.completion_percentage}%</div>
                                  <div><span className="font-medium text-gray-700">Priority:</span> <span className="capitalize">{task.priority}</span></div>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                                <p className="text-sm text-gray-600">{task.description || 'No description provided'}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Issues & Notes</h4>
                                <div className="space-y-3">
                                  {task.blocker_issue && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <h5 className="text-xs font-semibold text-red-800 mb-1">Blocker/Issue:</h5>
                                      <p className="text-xs text-red-700">{task.blocker_issue}</p>
                                    </div>
                                  )}
                                  {task.comments && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <h5 className="text-xs font-semibold text-blue-800 mb-1">Comments:</h5>
                                      <p className="text-xs text-blue-700">{task.comments}</p>
                                    </div>
                                  )}
                                  {!task.blocker_issue && !task.comments && (
                                    <p className="text-sm text-gray-500 italic">No issues or notes</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}</tbody>
            </table>
            
            {/* Pagination Controls */}
            {showAllTasks && totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, totalRecords)}</span> of{' '}
                    <span className="font-medium">{totalRecords}</span> results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Recent Activity Section */}
        {(() => {
          type ActivityItem = { kind: 'comment' | 'activity'; created_at: string; user_name: string; taskTitle: string; taskToken: string; content?: string; action_type?: string; details?: string; old_value?: string; new_value?: string; };
          const items: ActivityItem[] = [];
          allTasks.forEach(task => {
            (taskComments[task.id]?.comments || []).forEach((c: any) => {
              items.push({ kind: 'comment', created_at: c.created_at, user_name: c.user_name, taskTitle: task.title, taskToken: task.token_number, content: c.comment });
            });
            (taskComments[task.id]?.activities || []).forEach((a: any) => {
              items.push({ kind: 'activity', created_at: a.created_at, user_name: a.user_name, taskTitle: task.title, taskToken: task.token_number, action_type: a.action_type, details: a.details, old_value: a.old_value, new_value: a.new_value });
            });
          });
          items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          if (items.length === 0) return null;

          const fmtDate = (d: string) => {
            const dt = new Date(d);
            const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
            const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
            if (same(dt, today)) return 'Today';
            if (same(dt, yesterday)) return 'Yesterday';
            return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          };
          const fmtTime = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

          const actCfg: Record<string, { icon: string; bg: string }> = {
            created:          { icon: '✦', bg: '#2a9d8f' },
            status_changed:   { icon: '⇄', bg: '#457b9d' },
            commented:        { icon: '💬', bg: '#457b9d' },
            comment_added:    { icon: '💬', bg: '#457b9d' },
            priority_changed: { icon: '!',  bg: '#f4a261' },
            assigned:         { icon: '→',  bg: '#6d6875' },
            progress_updated: { icon: '↑',  bg: '#7c3aed' },
            blocker_added:    { icon: '✕',  bg: '#e63946' },
            blocker_resolved: { icon: '✓',  bg: '#2a9d8f' },
            title_changed:    { icon: '✎',  bg: '#0ea5e9' },
            hours_updated:    { icon: '⏱',  bg: '#8b5cf6' },
            deleted:          { icon: '🗑',  bg: '#dc2626' },
          };

          const buildMsg = (item: ActivityItem) => {
            const by = item.user_name; const t = `"${item.taskTitle}"`;
            switch (item.action_type) {
              case 'created':          return `${by} created task ${t}`;
              case 'status_changed':   return `${by} changed status of ${t} from "${item.old_value}" to "${item.new_value}"`;
              case 'priority_changed': return `${by} changed priority of ${t} from "${item.old_value}" to "${item.new_value}"`;
              case 'assigned':         return `${by} assigned ${t} to ${item.new_value}`;
              case 'progress_updated': return `${by} updated progress of ${t} to ${item.new_value}%`;
              case 'blocker_added':    return `${by} added a blocker on ${t}`;
              case 'blocker_resolved': return `${by} resolved blocker on ${t}`;
              case 'commented':        return `${by} commented on ${t}`;
              case 'title_changed':    return `${by} renamed ${t} to "${item.new_value}"`;
              case 'hours_updated':    return `${by} updated hours on ${t}`;
              case 'deleted':          return `${by} deleted task ${t}`;
              default:                 return item.details || `${by} updated ${t}`;
            }
          };

          const filtered = activitySearch.trim()
            ? items.filter(item => {
                const q = activitySearch.toLowerCase();
                const msg = item.kind === 'comment' ? `${item.user_name} ${item.taskTitle} ${item.content}` : `${item.user_name} ${item.taskTitle} ${item.details} ${item.old_value} ${item.new_value}`;
                return msg.toLowerCase().includes(q);
              })
            : items;

          // group by date
          const groups: { label: string; items: (ActivityItem & { _idx: number })[] }[] = [];
          filtered.forEach((item, _idx) => {
            const label = fmtDate(item.created_at);
            const last = groups[groups.length - 1];
            if (last && last.label === label) last.items.push({ ...item, _idx });
            else groups.push({ label, items: [{ ...item, _idx }] });
          });

          return (
            <div className="mt-8 rounded-2xl p-6" style={{ background: '#f1f8f1' }}>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h3 className="font-black text-base" style={{ color: '#1d3557' }}>⚡ Recent Activity</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#e8f4ff', color: '#457b9d' }}>{filtered.length}</span>
                <div className="ml-auto flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search activity..."
                    value={activitySearch}
                    onChange={e => setActivitySearch(e.target.value)}
                    className="text-xs outline-none bg-transparent w-40 text-gray-700 placeholder-gray-400"
                  />
                  {activitySearch && (
                    <button onClick={() => setActivitySearch('')} className="text-gray-400 hover:text-gray-600">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              </div>
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No activity found</p>
              ) : (
                <div className="space-y-2">
                  {groups.map(group => (
                    <div key={group.label}>
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs font-black px-3 py-1 rounded-full flex-shrink-0" style={{ background: '#f1f5f9', color: '#64748b' }}>{group.label}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const cfg = item.kind === 'comment' ? { icon: '💬', bg: '#457b9d' } : (actCfg[item.action_type || ''] || { icon: '•', bg: '#94a3b8' });
                          const msg = item.kind === 'comment' ? `${item.user_name} commented on "${item.taskTitle}"` : buildMsg(item);
                          const isExp = expandedActivity === item._idx;
                          return (
                            <div key={item._idx} className="bg-white rounded-2xl overflow-hidden cursor-pointer" style={{ border: `1px solid ${isExp ? '#bfdbfe' : '#d0dce8'}` }}
                              onClick={() => setExpandedActivity(isExp ? null : item._idx)}>
                              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: cfg.bg }}>{cfg.icon}</div>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: `hsl(${(item.user_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                                  {item.user_name[0].toUpperCase()}
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#e8f4ff', color: '#457b9d' }}>{item.taskToken}</span>
                                <span className="flex-1 text-sm" style={{ color: '#1d3557' }}>
                                  {msg}
                                  {!isExp && item.kind === 'comment' && item.content && (
                                    <span style={{ color: '#6b7a8d' }}> — {item.content.length > 60 ? item.content.substring(0, 60) + '…' : item.content}</span>
                                  )}
                                </span>
                                <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>{fmtTime(item.created_at)}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                                  className="flex-shrink-0 transition-transform duration-200"
                                  style={{ transform: isExp ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              </div>
                              {isExp && (
                                <div className="px-4 pb-4 pt-3 space-y-2" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fbff' }}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-gray-500">Task:</span>
                                    <span className="text-xs font-semibold text-gray-800">[{item.taskToken}] {item.taskTitle}</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-gray-500">By:</span>
                                    <span className="text-xs text-gray-700">{item.user_name}</span>
                                    <span className="text-xs text-gray-400">·</span>
                                    <span className="text-xs text-gray-400">{fmtTime(item.created_at)}</span>
                                  </div>
                                  {item.kind === 'comment' && item.content && (
                                    <div className="rounded-xl p-3 text-sm text-gray-700 leading-relaxed" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                                      {item.content}
                                    </div>
                                  )}
                                  {item.kind === 'activity' && (item.old_value || item.new_value) && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {item.old_value && <span className="text-xs px-2 py-0.5 rounded-lg font-bold line-through" style={{ background: '#fef2f2', color: '#b91c1c' }}>{item.old_value}</span>}
                                      {item.old_value && item.new_value && <span className="text-xs text-gray-400">→</span>}
                                      {item.new_value && <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: '#f0fdf9', color: '#0f766e' }}>{item.new_value}</span>}
                                    </div>
                                  )}
                                  {item.kind === 'activity' && item.details && (
                                    <p className="text-xs text-gray-500">{item.details}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}