import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { sendMail } from '@/lib/mailer';
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
          await sendMail({
            to: emailLower,
            subject: `${user.email} invited you to join "${project.name}" on ProjectHub`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
                  <tr>
                    <td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #e63946, #c1121f); padding: 40px 40px 30px; text-align: center;">
                            <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                              <span style="font-size: 32px;">🚀</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">You're Invited!</h1>
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #1d3557; font-size: 16px; line-height: 1.6;">
                              Hi there! 👋
                            </p>
                            <p style="margin: 0 0 20px; color: #1d3557; font-size: 16px; line-height: 1.6;">
                              <strong style="color: #e63946;">${user.email}</strong> has invited you to collaborate on the project:
                            </p>
                            <div style="background: #f1faee; border-left: 4px solid #e63946; padding: 16px 20px; margin: 0 0 30px; border-radius: 8px;">
                              <div style="font-size: 18px; font-weight: 700; color: #1d3557; margin-bottom: 4px;">📋 ${project.name}</div>
                              <div style="font-size: 14px; color: #6b7a8d;">Join the team and start collaborating!</div>
                            </div>
                            
                            <p style="margin: 0 0 24px; color: #6b7a8d; font-size: 14px; line-height: 1.6;">
                              Click the button below to get started:
                            </p>
                            
                            <!-- CTA Buttons -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" style="padding-bottom: 16px;">
                                  <a href="${registerLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #e63946, #c1121f); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(230, 57, 70, 0.3);">
                                    ✨ Create Account & Join Project
                                  </a>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-bottom: 20px;">
                                  <p style="margin: 0 0 8px; color: #6b7a8d; font-size: 13px;">Already have an account?</p>
                                  <a href="${loginLink}" style="display: inline-block; padding: 12px 28px; background: #f1faee; color: #1d3557; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; border: 2px solid #d0dce8;">
                                    🔐 Sign In
                                  </a>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- Features -->
                            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0;">
                              <div style="font-size: 14px; font-weight: 700; color: #1d3557; margin-bottom: 12px;">What you can do:</div>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="padding: 6px 0;">
                                    <span style="color: #2a9d8f; font-weight: 700;">✓</span>
                                    <span style="color: #6b7a8d; font-size: 14px; margin-left: 8px;">Manage tasks and track progress</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 6px 0;">
                                    <span style="color: #2a9d8f; font-weight: 700;">✓</span>
                                    <span style="color: #6b7a8d; font-size: 14px; margin-left: 8px;">Collaborate with team members</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 6px 0;">
                                    <span style="color: #2a9d8f; font-weight: 700;">✓</span>
                                    <span style="color: #6b7a8d; font-size: 14px; margin-left: 8px;">Share documents and files</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 6px 0;">
                                    <span style="color: #2a9d8f; font-weight: 700;">✓</span>
                                    <span style="color: #6b7a8d; font-size: 14px; margin-left: 8px;">Real-time chat and updates</span>
                                  </td>
                                </tr>
                              </table>
                            </div>
                            
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                              <p style="margin: 0 0 8px; color: #6b7a8d; font-size: 13px; line-height: 1.5;">
                                ⏰ This invitation expires in <strong>7 days</strong>.
                              </p>
                              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                                If you didn't expect this invitation, you can safely ignore this email.
                              </p>
                            </div>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="background: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 8px; color: #1d3557; font-size: 16px; font-weight: 700;">
                              ProjectHub
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                              Collaborate better, deliver faster
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
          });
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
