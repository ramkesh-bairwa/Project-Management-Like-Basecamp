import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';

async function ensureColumns() {
  try {
    await query(`ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS github_access_token VARCHAR(255) DEFAULT NULL`);
  } catch { /* already exist */ }
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
    await ensureColumns();

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${base}/api/auth/oauth/callback/github`,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error('[GitHub OAuth] token exchange error:', tokenData);
      return htmlResponse(null, 'oauth_failed');
    }

    const accessToken: string = tokenData.access_token;

    const [profileRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'ProjectHub' } }),
      fetch('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'ProjectHub' } }),
    ]);
    const profile = await profileRes.json();
    const emails: { email: string; primary: boolean; verified: boolean }[] = await emailsRes.json();
    const primaryEmail = emails.find(e => e.primary && e.verified)?.email || emails[0]?.email;
    if (!primaryEmail) return htmlResponse(null, 'no_email');

    const token = await upsertOAuthUser({
      email: primaryEmail,
      name: profile.name || profile.login || 'GitHub User',
      oauthId: String(profile.id),
      accessToken,
    });

    return htmlResponse(token);
  } catch (e) {
    console.error('[GitHub OAuth]', e);
    return htmlResponse(null, 'oauth_failed');
  }
}

async function upsertOAuthUser({ email, name, oauthId, accessToken }: { email: string; name: string; oauthId: string; accessToken: string }) {
  let users = await query<{ id: number; email: string; role: string; is_org: boolean }[]>(
    'SELECT id, email, role, is_org FROM users WHERE oauth_provider = ? AND oauth_id = ?',
    ['github', oauthId]
  );

  if (!users.length) {
    users = await query<{ id: number; email: string; role: string; is_org: boolean }[]>(
      'SELECT id, email, role, is_org FROM users WHERE email = ?', [email]
    );
    if (users.length) {
      await query('UPDATE users SET oauth_provider = ?, oauth_id = ?, email_verified = 1, github_access_token = ? WHERE id = ?',
        ['github', oauthId, accessToken, users[0].id]);
    }
  }

  if (!users.length) {
    const result = await query<{ insertId: number }>(
      'INSERT INTO users (name, email, password, email_verified, oauth_provider, oauth_id, github_access_token) VALUES (?, ?, ?, 1, ?, ?, ?)',
      [name, email, '', 'github', oauthId, accessToken]
    );
    return signToken({ id: result.insertId, email, role: 'user', is_org: false });
  }

  // Update stored access token
  await query('UPDATE users SET github_access_token = ? WHERE id = ?', [accessToken, users[0].id]);

  const user = users[0];
  return signToken({ id: user.id, email: user.email, role: user.role, is_org: user.is_org });
}
