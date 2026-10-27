export default async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const u = new URL(req.url, 'http://x');
    const q = u.searchParams.get('q') || '';
    const sort = u.searchParams.get('sort') || '';
    const id = process.env.OSU_CLIENT_ID, sec = process.env.OSU_CLIENT_SECRET;
    if (!id || !sec) return res.status(500).end(JSON.stringify({ error: 'osu! API not configured' }));

    const tr = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials', scope: 'public' }),
    });
    if (!tr.ok) return res.status(502).end(JSON.stringify({ error: 'osu! token request failed (' + tr.status + ')' }));
    const td = await tr.json();

    let url = 'https://osu.ppy.sh/api/v2/beatmapsets/search?q=' + encodeURIComponent(q) + '&m=0';
    if (sort) url += '&sort=' + encodeURIComponent(sort);

    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + td.access_token } });
    res.status(r.status).end(JSON.stringify(await r.json()));
  } catch (e) {
    res.status(500).end(JSON.stringify({ error: e.message }));
  }
};