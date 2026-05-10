import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { sendProjectInvitationEmail } from '@/lib/invitation-mailer';
import crypto from 'crypto';

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  
  if (!token) return apiError('Token required');
  
  const invites = await query<{ id: number; project_id: number; email: string; status: string; expires_at: string }[]>(
    'SELECT id, project_id, email, status, expires_at FROM project_invitations WHERE token = ?',
    [token]
  );
  
  if (!invites.length) return apiError('Invalid invitation', 404);
  
  const invite = invites[0];
  
  if (invite.status !== 'pending') return apiError('Invitation already used', 400);
  if (new Date(invite.expires_at) < new Date()) return apiError('Invitation expired', 400);
  
  const projects = await query<{ name: string; owner_id: number }[]>(
    'SELECT name, owner_id FROM projects WHERE id = ?',
    [invite.project_id]
  );
  
  const users = await query<{ email: string }[]>(
    'SELECT email FROM users WHERE id = ?',
    [projects[0]?.owner_id]
  );
  
  return apiResponse({
    email: invite.email,
    project_name: projects[0]?.name,
    invited_by: users[0]?.email
  });
};

export const POST = withAuth(async (req: NextRequest, user) => {
  const { project_id, emails } = await req.json();
  
  if (!project_id || !Array.isArray(emails) || emails.length === 0) {
    return apiError('Project ID and emails are required');
  }

  // Verify user owns or is a member of the project
  const projectCheck = await query<{ id: number; name: string; owner_id: number }[]>(
    `SELECT p.id, p.name, p.owner_id FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
     WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`,
    [user.id, project_id, user.id, user.id]
  );

  if (!projectCheck.length) {
    return apiError('Project not found or access denied', 403);
  }

  const project = projectCheck[0];
  const results = [];

  for (const email of emails) {
    const emailLower = email.toLowerCase().trim();
    
    // Check if user already exists
    const existingUser = await query<{ id: number; email: string }[]>(
      'SELECT id, email FROM users WHERE email = ?',
      [emailLower]
    );

    if (existingUser.length > 0) {
      // User exists, add them directly to the project
      const userId = existingUser[0].id;
      
      // Check if already a member
      const memberCheck = await query<{ id: number }[]>(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [project_id, userId]
      );

      if (memberCheck.length === 0) {
        await query(
          'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
          [project_id, userId, 'developer']
        );
        results.push({ email: emailLower, status: 'added', message: 'User added to project' });
      } else {
        results.push({ email: emailLower, status: 'already_member', message: 'Already a member' });
      }
    } else {
      // User doesn't exist, create invitation
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Check if invitation already exists
      const existingInvite = await query<{ id: number }[]>(
        'SELECT id FROM project_invitations WHERE project_id = ? AND email = ? AND status = ?',
        [project_id, emailLower, 'pending']
      );

      if (existingInvite.length === 0) {
        await query(
          `INSERT INTO project_invitations (project_id, email, token, invited_by, expires_at, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [project_id, emailLower, token, user.id, expiresAt, 'pending']
        );

        // Send invitation email
        const loginLink = `${process.env.NEXT_PUBLIC_APP_URL}/login?email=${encodeURIComponent(emailLower)}&invite=${token}`;
        const registerLink = `${process.env.NEXT_PUBLIC_APP_URL}/register?invite=${token}`;
        
        try {
          await sendProjectInvitationEmail(
            emailLower,
            user.email,
            project.name,
            loginLink,
            registerLink
          );
          results.push({ email: emailLower, status: 'invited', message: 'Invitation sent successfully' });
        } catch (error) {
          console.error('Failed to send invitation email:', error);
          // Still mark as invited even if email fails, user can access via invitation token
          results.push({ email: emailLower, status: 'invited', message: 'Invitation created (email delivery pending)' });
        }
      } else {
        results.push({ email: emailLower, status: 'already_invited', message: 'Already invited' });
      }
    }
  }

  return apiResponse({ message: 'Invitations processed', results });
});
