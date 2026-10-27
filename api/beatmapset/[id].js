export default async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const id = String(req.query.id || new URL(req.url, 'http://x').pathname.split('/').pop() || '');
    if (!/^\d+$/.test(id)) return res.status(400).end(JSON.stringify({error:'Missing or invalid id'}));
    const cid = process.env.OSU_CLIENT_ID, sec = process.env.OSU_CLIENT_SECRET;
    if (!cid || !sec) return res.status(500).end(JSON.stringify({error:'osu! API not configured'}));
    const tr = await fetch('https://osu.ppy.sh/oauth/token', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({client_id:cid, client_secret:sec, grant_type:'client_credentials', scope:'public'}) });
    const td = await tr.json();
    const r = await fetch('https://osu.ppy.sh/api/v2/beatmapsets/'+id, { headers:{Authorization:'Bearer '+td.access_token} });
    res.status(r.status).end(JSON.stringify(await r.json()));
  } catch (e) { res.status(500).end(JSON.stringify({error:e.message})); }
};