const { calculateScore } = require('osu-pp')
module.exports = async (req, res) => {
  res.setHeader('Content-Type','application/json')
  if (req.method !== 'POST') return res.status(405).json({error:'method'})
  let body=''; req.on('data',c=>body+=c); req.on('end',()=>{
    try {
      const { content, accuracy } = JSON.parse(body||'{}')
      if (!content) return res.status(400).json({error:'missing content'})
      const result = calculateScore({ beatmap: content, rework: 'sep2022', score: { ruleset_id:0, mods:[{acronym:''}], total_score:1000000, legacy_total_score:1000000, accuracy: accuracy||100, max_combo: 0 } })
      res.json({ pp: result.performance_attributes?.pp ?? null, stars: result.difficulty_attributes?.star_rating ?? null })
    } catch (e) { res.status(500).json({error:e.message}) }
  })
}
