import crypto from 'crypto';

export default (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = process.env.OSU_CLIENT_ID;
  const redirect = process.env.OSU_REDIRECT_URI;
  if (!id || !redirect) return res.status(500).json({ error: 'OAuth not configured' });
  const state = crypto.randomBytes(16).toString('hex');
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=300`);
  const url = 'https://osu.ppy.sh/oauth/authorize?client_id=' + encodeURIComponent(id) + '&redirect_uri=' + encodeURIComponent(redirect) + '&response_type=code&scope=identify+public&state=' + state;
  res.json({ url });
};