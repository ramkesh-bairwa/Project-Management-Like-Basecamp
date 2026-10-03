import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { apiError } from '@/lib/api';
import { sendVerificationEmail } from '@/lib/mailer';
import { isEmailVerificationEnabled, PENDING_APPROVAL_MESSAGE } from '@/lib/verification';

export async function POST(req: NextRequest) {
  const { name, email, password, invite_token } = await req.json();
  if (!name || !email || !password) return apiError('All fields required');

  const existing = await query<{ id: number; email_verified: number }[]>(
    'SELECT id, email_verified FROM users WHERE email = ?', [email]
  );

  const verificationEnabled = await isEmailVerificationEnabled();

  // If user exists but unverified, allow resend (or tell them they're still waiting for approval)
  if (existing.length > 0) {
    if (existing[0].email_verified === 0) {
      if (!verificationEnabled) {
        return NextResponse.json({ error: PENDING_APPROVAL_MESSAGE, code: 'PENDING_APPROVAL' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Email already registered but not verified. Please check your inbox or resend verification.', code: 'UNVERIFIED' }, { status: 409 });
    }
    return apiError('Email already registered');
  }

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

  // Verification disabled — save the account unverified; an admin must approve it before it can log in
  const result = await query<{ insertId: number }>(
    'INSERT INTO users (name, email, password, email_verified) VALUES (?, ?, ?, 0)',
    [name, email, hashed]
  );

  // Handle invitation if present
  if (invite_token) {
    await handleInvitation(invite_token, result.insertId);
  }

  return NextResponse.json(
    { message: 'Registration successful. ' + PENDING_APPROVAL_MESSAGE, code: 'PENDING_APPROVAL' },
    { status: 201 }
  );
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
