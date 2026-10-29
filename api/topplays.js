module.exports = async (req, res) => {
  res.setHeader('Content-Type','application/json')
  try {
    const id = process.env.OSU_CLIENT_ID, sec = process.env.OSU_CLIENT_SECRET
    if (!id || !sec) return res.status(503).json({ error: 'osu! API not configured', code: 'NOT_CONFIGURED' })
    res.json({ items: [], lastUpdated: null })
  } catch (e) { res.status(500).json({ error: e.message }) }
}
