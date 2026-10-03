import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { isEmailVerificationEnabled } from '@/lib/verification';

async function ensureOAuthColumns() {
  try {
    await query(`ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(100) DEFAULT NULL`);
  } catch { /* columns already exist */ }
}

function htmlResponse(token: string | null, error?: string) {
  if (error || !token) {
    return new Response(`<!DOCTYPE html><html><body><script>window.location.href='/login?error=${error || 'oauth_failed'}';</script></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
  return new Response(`<!DOCTYPE html>
<html><head><title>Signing in…</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f5f7fa">
  <div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">⏳</div><p style="color:#6b7280">Signing you in…</p></div>
  <script>
    try {
      var token = ${JSON.stringify(token)};
      var payload = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('token', token);
      localStorage.setItem('userId', String(payload.id));
      document.cookie = 'token=' + token + '; path=/; max-age=' + (60*60*24*7) + '; samesite=lax';
      window.location.href = '/dashboard';
    } catch(e) {
      window.location.href = '/login?error=oauth_failed';
    }
  </script>
</body></html>`, {
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return htmlResponse(null, 'oauth_cancelled');

  try {
    await ensureOAuthColumns();

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${base}/api/auth/oauth/callback/google`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error('[Google OAuth] token exchange error:', tokenData);
      return htmlResponse(null, 'oauth_failed');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.email) return htmlResponse(null, 'no_email');

    const token = await upsertOAuthUser({
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      oauthProvider: 'google',
      oauthId: String(profile.id),
    });

    // null = account exists but is waiting for admin approval
    if (!token) return htmlResponse(null, 'pending_approval');
    return htmlResponse(token);
  } catch (e) {
    console.error('[Google OAuth]', e);
    return htmlResponse(null, 'oauth_failed');
  }
}

async function upsertOAuthUser({ email, name, oauthProvider, oauthId }: { email: string; name: string; oauthProvider: string; oauthId: string }) {
  // With email verification OFF, new accounts need admin approval (email_verified=1) before they can sign in
  const needsApproval = !(await isEmailVerificationEnabled());

  let users = await query<{ id: number; email: string; role: string; is_org: boolean; email_verified: number }[]>(
    'SELECT id, email, role, is_org, email_verified FROM users WHERE oauth_provider = ? AND oauth_id = ?',
    [oauthProvider, oauthId]
  );

  if (!users.length) {
    users = await query<{ id: number; email: string; role: string; is_org: boolean; email_verified: number }[]>(
      'SELECT id, email, role, is_org, email_verified FROM users WHERE email = ?', [email]
    );
    if (users.length) {
      await query('UPDATE users SET oauth_provider = ?, oauth_id = ?, email_verified = IF(?, email_verified, 1) WHERE id = ?',
        [oauthProvider, oauthId, needsApproval, users[0].id]);
      if (!needsApproval) users[0].email_verified = 1;
    }
  }

  if (!users.length) {
    const result = await query<{ insertId: number }>(
      'INSERT INTO users (name, email, password, email_verified, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, '', needsApproval ? 0 : 1, oauthProvider, oauthId]
    );
    if (needsApproval) return null;
    return signToken({ id: result.insertId, email, role: 'user', is_org: false });
  }

  const user = users[0];
  if (user.email_verified != 1) {
    if (needsApproval) return null;
    // Email verification mode: signing in with the provider proves the email
    await query('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id]);
  }
  return signToken({ id: user.id, email: user.email, role: user.role, is_org: user.is_org });
}
