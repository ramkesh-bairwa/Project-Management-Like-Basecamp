import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const POST = withAuth(async (req: NextRequest, user) => {
  const { token } = await req.json();
  
  if (!token) return apiError('Token required');
  
  const invites = await query<{ id: number; project_id: number; email: string; status: string; expires_at: string }[]>(
    'SELECT id, project_id, email, status, expires_at FROM project_invitations WHERE token = ?',
    [token]
  );
  
  if (!invites.length) return apiError('Invalid invitation', 404);
  
  const invite = invites[0];
  
  if (invite.status !== 'pending') return apiError('Invitation already used', 400);
  if (new Date(invite.expires_at) < new Date()) return apiError('Invitation expired', 400);
  
  // Check if user is already a member
  const memberCheck = await query<{ id: number }[]>(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
    [invite.project_id, user.id]
  );
  
  if (memberCheck.length > 0) {
    // Already a member, just mark invitation as accepted
    await query(
      'UPDATE project_invitations SET status = ?, accepted_at = NOW() WHERE id = ?',
      ['accepted', invite.id]
    );
    return apiResponse({ message: 'Already a member of this project' });
  }
  
  // Add user to project
  await query(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
    [invite.project_id, user.id, 'developer']
  );
  
  // Mark invitation as accepted
  await query(
    'UPDATE project_invitations SET status = ?, accepted_at = NOW() WHERE id = ?',
    ['accepted', invite.id]
  );
  
  return apiResponse({ message: 'Successfully joined project' });
});
