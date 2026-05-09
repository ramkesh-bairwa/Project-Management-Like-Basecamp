import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const { name, email, password, invite_token } = await req.json();
  if (!name || !email || !password) return apiError('All fields required');

  const existing = await query<{ id: number; email_verified: number }[]>(
    'SELECT id, email_verified FROM users WHERE email = ?', [email]
  );

  // If user exists but unverified, allow resend
  if (existing.length > 0) {
    if (existing[0].email_verified === 0) {
      return NextResponse.json({ error: 'Email already registered but not verified. Please check your inbox or resend verification.', code: 'UNVERIFIED' }, { status: 409 });
    }
    return apiError('Email already registered');
  }

  const setting = await query<{ value: string }[]>(
    "SELECT value FROM site_settings WHERE `key` = 'email_verification_enabled' LIMIT 1"
  );
  const verificationEnabled = setting[0]?.value === '1';

  const hashed = await bcrypt.hash(password, 10);

  if (verificationEnabled) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await query<{ insertId: number }>(
      'INSERT INTO users (name, email, password, email_verified, verification_token, verification_token_expires) VALUES (?, ?, ?, 0, ?, ?)',
      [name, email, hashed, token, expires.toISOString().slice(0, 19).replace('T', ' ')]
    );

    // Handle invitation if present
    if (invite_token) {
      await handleInvitation(invite_token, result.insertId);
    }

    let emailError = '';
    try {
      await sendVerificationEmail(email, name, token);
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Failed to send email';
    }

    if (emailError) {
      // User saved — but email failed. Return the user id so frontend can offer resend.
      return NextResponse.json({
        message: 'Account created but verification email could not be sent.',
        code: 'EMAIL_FAILED',
        userId: result.insertId,
        error: emailError,
      }, { status: 201 });
    }

    return NextResponse.json(
      { message: 'Registration successful. Please check your email to verify your account.', code: 'VERIFY_PENDING' },
      { status: 201 }
    );
  }

  // Verification disabled — register and log in immediately
  const result = await query<{ insertId: number }>(
    'INSERT INTO users (name, email, password, email_verified) VALUES (?, ?, ?, 1)',
    [name, email, hashed]
  );
  
  // Handle invitation if present
  if (invite_token) {
    await handleInvitation(invite_token, result.insertId);
  }
  
  const token = signToken({ id: result.insertId, email, role: 'user', is_org: false });

  const res = NextResponse.json(
    { user: { id: result.insertId, name, email, role: 'user', is_org: false }, token },
    { status: 201 }
  );
  res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' });
  return res;
}

async function handleInvitation(token: string, userId: number) {
  const invites = await query<{ id: number; project_id: number; email: string; status: string; expires_at: string }[]>(
    'SELECT id, project_id, email, status, expires_at FROM project_invitations WHERE token = ?',
    [token]
  );
  
  if (!invites.length || invites[0].status !== 'pending') return;
  if (new Date(invites[0].expires_at) < new Date()) return;
  
  const invite = invites[0];
  
  // Add user to project
  await query(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
    [invite.project_id, userId, 'developer']
  );
  
  // Mark invitation as accepted
  await query(
    'UPDATE project_invitations SET status = ?, accepted_at = NOW() WHERE id = ?',
    ['accepted', invite.id]
  );
}
