import crypto from 'crypto';

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function parseCookies(header) {
  const out = {};
  for (const part of (header || '').split(';')) {
    const s = part.trim();
    if (!s) continue;
    const i = s.indexOf('=');
    if (i === -1) continue;
    out[s.slice(0, i)] = s.slice(i + 1);
  }
  return out;
}

export default async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const u = new URL(req.url, 'http://x');
    const code = u.searchParams.get('code');
    const state = u.searchParams.get('state');
    const cookies = parseCookies(req.headers.cookie);
    if (!code || !state || state !== cookies.oauth_state) return res.status(400).json({ error: 'invalid state' });
    const id = process.env.OSU_CLIENT_ID, sec = process.env.OSU_CLIENT_SECRET, redirect = process.env.OSU_REDIRECT_URI;
    if (!id || !sec || !redirect) return res.status(500).json({ error: 'OAuth not configured' });
    const tr = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: sec, code, grant_type: 'authorization_code', redirect_uri: redirect }),
    });
    if (!tr.ok) return res.status(400).json({ error: 'token exchange failed' });
    const td = await tr.json();
    const ur = await fetch('https://osu.ppy.sh/api/v2/me', { headers: { Authorization: 'Bearer ' + td.access_token } });
    const user = ur.ok ? await ur.json() : null;
    const secret = process.env.SESSION_SECRET || 'dev-secret-change-me';
    const session = Buffer.from(JSON.stringify({ user, exp: Date.now() + 7 * 24 * 3600 * 1000 })).toString('base64');
    const sig = sign(session, secret);
    const secure = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', [
      'oauth_state=; HttpOnly; Path=/; Max-Age=0',
      `session=${session}.${sig}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=604800`,
    ]);
    res.redirect(302, '/');
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};