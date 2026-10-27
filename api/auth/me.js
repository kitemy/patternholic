const crypto = require('crypto');
function sign(payload, secret) { return crypto.createHmac('sha256', secret).update(payload).digest('hex'); }
module.exports = (req, res) => {
  res.setHeader('Content-Type','application/json');
  const cookies = (req.headers.cookie||'').split(';').map(s=>s.trim()).reduce((a,c)=>{const [k,v]=c.split('=');a[k]=v;return a;},{});
  const raw = cookies.session;
  if (!raw) return res.json({user:null});
  const [payload, sig] = raw.split('.');
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-me';
  if (sign(payload, secret) !== sig) return res.json({user:null});
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (data.exp < Date.now()) return res.json({user:null});
    res.json({user:data.user});
  } catch { res.json({user:null}); }
};
