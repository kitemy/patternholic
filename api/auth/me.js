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

export default (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const raw = parseCookies(req.headers.cookie).session;
  if (!raw) return res.json({ user: null });
  const [payload, sig] = raw.split('.');
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-me';
  if (sign(payload, secret) !== sig) return res.json({ user: null });
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (data.exp < Date.now()) return res.json({ user: null });
    res.json({ user: data.user });
  } catch {
    res.json({ user: null });
  }
};