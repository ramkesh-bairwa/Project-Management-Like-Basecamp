import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Revoke existing GitHub access token so GitHub always shows the auth screen
  try {
    const user = getTokenFromRequest(req);
    if (user) {
      const rows = await query<{ github_access_token: string }[]>(
        'SELECT github_access_token FROM users WHERE id = ? AND oauth_provider = ? AND github_access_token IS NOT NULL',
        [user.id, 'github']
      );
      if (rows[0]?.github_access_token) {
        await fetch(`https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/token`, {
          method: 'DELETE',
          headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString('base64')}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'ProjectHub',
          },
          body: JSON.stringify({ access_token: rows[0].github_access_token }),
        });
        await query('UPDATE users SET github_access_token = NULL WHERE id = ?', [user.id]);
      }
    }
  } catch { /* non-critical — still redirect even if revoke fails */ }

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/oauth/callback/github`,
    scope: 'user:email read:user',
    allow_signup: 'true',
    state,
  });

  const res = NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
  res.cookies.set('github_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax' });
  return res;
}
