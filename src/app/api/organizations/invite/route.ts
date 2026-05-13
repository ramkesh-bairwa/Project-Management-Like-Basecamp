import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { sendProjectInvitationEmail } from '@/lib/mailer';
import crypto from 'crypto';

export const POST = withAuth(async (req: NextRequest, user) => {
  const { org_id, email, role } = await req.json();
  if (!org_id || !email) return apiError('org_id and email required');

  const member = await query<{ role: string }[]>(
    'SELECT role FROM org_members WHERE org_id=? AND user_id=?', [org_id, user.id]
  );
  if (!member.length || !['owner', 'admin'].includes(member[0].role))
    return apiError('Not authorized', 403);

  const org = await query<{ name: string }[]>('SELECT name FROM organizations WHERE id=?', [org_id]);
  if (!org.length) return apiError('Organization not found', 404);

  const emailLower = email.toLowerCase().trim();

  // Always create invitation and send email — no DB user check
  const existing_inv = await query<{ token: string }[]>(
    'SELECT token FROM org_invitations WHERE org_id=? AND email=? AND status=?',
    [org_id, emailLower, 'pending']
  );

  let inviteToken: string;
  if (existing_inv.length) {
    inviteToken = existing_inv[0].token;
  } else {
    inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await query(
      'INSERT INTO org_invitations (org_id, email, role, token, invited_by, expires_at) VALUES (?,?,?,?,?,?)',
      [org_id, emailLower, role || 'member', inviteToken, user.id, expiresStr]
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginLink = `${appUrl}/login?email=${encodeURIComponent(emailLower)}&org_invite=${inviteToken}`;
  const registerLink = `${appUrl}/register?org_invite=${inviteToken}`;

  try {
    await sendProjectInvitationEmail(emailLower, user.email, org[0].name, loginLink, registerLink);
    return apiResponse({ message: 'Invitation sent', type: 'invited' }, 201);
  } catch (err) {
    return apiError(`Email failed: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
});

// GET - verify invite token
export const GET = async (req: NextRequest) => {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return apiError('token required');

  const invites = await query<{ id: number; org_id: number; email: string; role: string; status: string; expires_at: string }[]>(
    'SELECT id, org_id, email, role, status, expires_at FROM org_invitations WHERE token=?', [token]
  );
  if (!invites.length) return apiError('Invalid invitation', 404);
  const inv = invites[0];
  if (inv.status !== 'pending') return apiError('Invitation already used', 400);
  if (new Date(inv.expires_at) < new Date()) return apiError('Invitation expired', 400);

  const org = await query<{ name: string }[]>('SELECT name FROM organizations WHERE id=?', [inv.org_id]);
  return apiResponse({ email: inv.email, role: inv.role, org_name: org[0]?.name });
};
