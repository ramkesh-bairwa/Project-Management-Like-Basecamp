import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { sendProjectInvitationEmail } from '@/lib/mailer';
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
  
  console.log('📧 [INVITE] Received invitation request');
  console.log('📧 [INVITE] Project ID:', project_id);
  console.log('📧 [INVITE] Emails:', emails);
  console.log('📧 [INVITE] Inviter:', user.email);
  
  if (!project_id || !Array.isArray(emails) || emails.length === 0) {
    console.error('❌ [INVITE] Invalid request: missing project_id or emails');
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
    console.error('❌ [INVITE] Project not found or access denied');
    return apiError('Project not found or access denied', 403);
  }

  const project = projectCheck[0];
  console.log('✅ [INVITE] Project found:', project.name);
  const results = [];

  for (const email of emails) {
    const emailLower = email.toLowerCase().trim();
    console.log(`\n📧 [INVITE] Processing email: ${emailLower}`);
    
    let token: string;
    
    // Check if invitation already exists
    const existingInvite = await query<{ id: number; token: string }[]>(
      'SELECT id, token FROM project_invitations WHERE project_id = ? AND email = ? AND status = ?',
      [project_id, emailLower, 'pending']
    );

    if (existingInvite.length === 0) {
      // Create new invitation
      token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await query(
        `INSERT INTO project_invitations (project_id, email, token, invited_by, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [project_id, emailLower, token, user.id, expiresAt, 'pending']
      );
      console.log(`✅ [INVITE] Invitation created for: ${emailLower}`);
    } else {
      // Use existing token
      token = existingInvite[0].token;
      console.log(`ℹ️ [INVITE] Using existing invitation for: ${emailLower}`);
    }

    // Send invitation email
    const loginLink = `${process.env.NEXT_PUBLIC_APP_URL}/login?email=${encodeURIComponent(emailLower)}&invite=${token}`;
    const registerLink = `${process.env.NEXT_PUBLIC_APP_URL}/register?invite=${token}`;
    
    console.log(`📧 [INVITE] Sending email to: ${emailLower}`);
    console.log(`📧 [INVITE] Login link: ${loginLink}`);
    console.log(`📧 [INVITE] Register link: ${registerLink}`);
    
    try {
      await sendProjectInvitationEmail(
        emailLower,
        user.email,
        project.name,
        loginLink,
        registerLink
      );
      console.log(`✅ [INVITE] Email sent successfully to: ${emailLower}`);
      results.push({ email: emailLower, status: 'invited', message: 'Invitation sent successfully' });
    } catch (error) {
      console.error(`❌ [INVITE] Failed to send email to ${emailLower}:`, error);
      console.error(`❌ [INVITE] Error details:`, error instanceof Error ? error.message : String(error));
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('SMTP not configured')) {
        results.push({ email: emailLower, status: 'error', message: 'SMTP not configured. Please configure SMTP in Admin Settings.' });
      } else {
        results.push({ email: emailLower, status: 'error', message: `Failed to send email: ${errorMsg}` });
      }
    }
  }

  console.log('\n✅ [INVITE] All invitations processed');
  console.log('📊 [INVITE] Results:', results);
  return apiResponse({ message: 'Invitations processed', results });
});;
