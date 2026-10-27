function parseOsu(text) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let section = '';
  const general = {}, metadata = {}, difficulty = {};
  const hitObjects = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    const m = line.match(/^osu file format v(\d+)$/i);
    if (m) continue;
    if (line.startsWith('[') && line.endsWith(']')) { section = line.slice(1, -1).toLowerCase(); continue; }
    if (section === 'general' || section === 'metadata' || section === 'difficulty') {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim(), val = line.slice(idx + 1).trim();
      if (section === 'general') general[key] = val;
      else if (section === 'metadata') metadata[key] = val;
      else difficulty[key] = val;
      continue;
    }
    if (section === 'hitobjects') {
      const parts = line.split(',');
      if (parts.length < 4) continue;
      hitObjects.push({ x: +parts[0] || 0, y: +parts[1] || 0, time: +parts[2] || 0 });
    }
  }
  return { general, metadata, difficulty, hitObjects, mode: parseInt(general['Mode'] || '0', 10) };
}

function analyze(map) {
  const warnings = [], events = [];
  const objs = map.hitObjects.slice().sort((a, b) => a.time - b.time);
  const ALG = '1.0.0';
  if (map.mode !== 0) warnings.push('Non-standard mode; analysis may not be meaningful.');
  if (objs.length === 0) return { algorithmVersion: ALG, score: 0, metrics: { jumpCount: 0, streamCount: 0, burstCount: 0, repetitionScore: 0, densityPeak: 0, timingIntensity: 0, irregularity: 0 }, events, warnings };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let jumpCount = 0;
  for (let i = 0; i < objs.length - 1; i++) {
    const dt = objs[i + 1].time - objs[i].time;
    const d = dist(objs[i], objs[i + 1]);
    if (dt > 0 && dt <= 150 && d >= 120) { jumpCount++; events.push({ type: 'jump', startIndex: i, endIndex: i + 1, startTime: objs[i].time, endTime: objs[i + 1].time, value: d }); }
  }
  let streamCount = 0, runStart = 0;
  for (let i = 1; i <= objs.length; i++) {
    const prevDt = i > 1 ? objs[i - 1].time - objs[i - 2].time : 0;
    if (i === 1 || (prevDt >= 40 && prevDt <= 125)) {
    } else {
      const len = i - 1 - runStart;
      if (len >= 5) { streamCount++; events.push({ type: 'stream', startIndex: runStart, endIndex: i - 2, startTime: objs[runStart].time, endTime: objs[i - 2].time, value: len }); }
      runStart = i - 1;
    }
    if (i === objs.length) {
      const len = i - runStart;
      if (len >= 5) { streamCount++; events.push({ type: 'stream', startIndex: runStart, endIndex: i - 1, startTime: objs[runStart].time, endTime: objs[i - 1].time, value: len }); }
    }
  }
  let burstCount = 0;
  for (let i = 0; i < objs.length; i++) {
    let j = i;
    while (j + 1 < objs.length && objs[j + 1].time - objs[i].time <= 300) j++;
    const cnt = j - i + 1;
    if (cnt >= 4) { burstCount++; events.push({ type: 'burst', startIndex: i, endIndex: j, startTime: objs[i].time, endTime: objs[j].time, value: cnt }); i = j; }
  }
  let densityPeak = 0, left = 0;
  for (let right = 0; right < objs.length; right++) {
    while (objs[right].time - objs[left].time > 1000) left++;
    densityPeak = Math.max(densityPeak, right - left + 1);
  }
  const intervals = [];
  for (let i = 1; i < objs.length; i++) intervals.push(objs[i].time - objs[i - 1].time);
  const meanInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 1000;
  const timingIntensity = Math.min(100, 1000 / Math.max(meanInterval, 1));
  const sigs = {};
  for (let i = 0; i < objs.length - 1; i++) {
    const key = `${Math.round(objs[i + 1].x - objs[i].x)},${Math.round(objs[i + 1].y - objs[i].y)},${Math.round(objs[i + 1].time - objs[i].time)}`;
    sigs[key] = (sigs[key] || 0) + 1;
  }
  let repeated = 0;
  for (const k in sigs) if (sigs[k] > 1) repeated += sigs[k] - 1;
  const repetitionScore = Math.min(100, (repeated / Math.max(objs.length, 1)) * 100);
  const mean = meanInterval;
  const variance = intervals.length ? intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length : 0;
  const std = Math.sqrt(variance);
  const irregularity = Math.min(100, (std / Math.max(mean, 1)) * 100);
  const metrics = { jumpCount, streamCount, burstCount, repetitionScore, densityPeak, timingIntensity, irregularity };
  const normJumps = Math.min(1, jumpCount / Math.max(objs.length * 0.1, 1));
  const normStreams = Math.min(1, streamCount / 5);
  const normBursts = Math.min(1, burstCount / 5);
  const normDensity = Math.min(1, densityPeak / 20);
  const normRep = repetitionScore / 100;
  const normTiming = timingIntensity / 100;
  const normIrr = irregularity / 100;
  const score = Math.max(0, Math.min(100, Math.round((normJumps * 18 + normStreams * 18 + normBursts * 14 + normDensity * 14 + normRep * 12 + normTiming * 12 + normIrr * 12) * 100) / 100));
  return { algorithmVersion: ALG, score, metrics, events, warnings };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).end(JSON.stringify({ error: 'method' }));
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const { content } = body || {};
    if (!content) return res.status(400).end(JSON.stringify({ error: 'missing content' }));
    const map = parseOsu(String(content));
    const result = analyze(map);
    res.end(JSON.stringify({ ...result, metadata: map.metadata, mode: map.mode }));
  } catch (e) {
    res.status(500).end(JSON.stringify({ error: e.message }));
  }
}