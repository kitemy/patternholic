import type { HitObject, OsuBeatmap } from './osuParser'

export interface PatternEvent {
  type: string
  startIndex: number
  endIndex: number
  startTime: number
  endTime: number
  value: number
}

export interface AnalysisMetrics {
  jumpCount: number
  streamCount: number
  burstCount: number
  doubleCount: number
  tripleCount: number
  quadCount: number
  deathstreamCount: number
  wideJumpCount: number
  spacedStreamCount: number
  alternatingCount: number
  kickSliderCount: number
  buzzSliderCount: number
  snapAimCount: number
  flowAimCount: number
  repetitionScore: number
  densityPeak: number
  timingIntensity: number
  irregularity: number
}

export interface AnalysisResult {
  algorithmVersion: string
  score: number
  abuseScore: number
  metrics: AnalysisMetrics
  events: PatternEvent[]
  warnings: string[]
}

export const ALGORITHM_VERSION = '1.0.0'

function dist(a: HitObject, b: HitObject): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function analyzeBeatmap(map: OsuBeatmap): AnalysisResult {
  const warnings: string[] = []
  const events: PatternEvent[] = []
  const objs = map.hitObjects.slice().sort((a, b) => a.time - b.time)

  if (map.mode !== 0) warnings.push('Non-standard mode; analysis may not be meaningful.')
  if (objs.length === 0) {
    return { algorithmVersion: ALGORITHM_VERSION, score: 0, abuseScore: 0, metrics: { jumpCount: 0, streamCount: 0, burstCount: 0, doubleCount: 0, tripleCount: 0, quadCount: 0, deathstreamCount: 0, wideJumpCount: 0, spacedStreamCount: 0, alternatingCount: 0, kickSliderCount: 0, buzzSliderCount: 0, snapAimCount: 0, flowAimCount: 0, repetitionScore: 0, densityPeak: 0, timingIntensity: 0, irregularity: 0 }, events, warnings }
  }

  // Jumps: consecutive objects close in time but far in space
  let jumpCount = 0
  for (let i = 0; i < objs.length - 1; i++) {
    const dt = objs[i + 1].time - objs[i].time
    const d = dist(objs[i], objs[i + 1])
    if (dt > 0 && dt <= 150 && d >= 120) {
      jumpCount++
      events.push({ type: 'jump', startIndex: i, endIndex: i + 1, startTime: objs[i].time, endTime: objs[i + 1].time, value: d })
    }
  }

  // Streams: runs of objects with dt between 40 and 125ms
  let streamCount = 0
  let runStart = 0
  for (let i = 1; i <= objs.length; i++) {
    const prevDt = i > 1 ? objs[i - 1].time - objs[i - 2].time : 0
    if (i === 1 || (prevDt >= 40 && prevDt <= 125)) {
      // continue
    } else {
      const len = i - 1 - runStart
      if (len >= 5) {
        streamCount++
        events.push({ type: 'stream', startIndex: runStart, endIndex: i - 2, startTime: objs[runStart].time, endTime: objs[i - 2].time, value: len })
      }
      runStart = i - 1
    }
    if (i === objs.length) {
      const len = i - runStart
      if (len >= 5) {
        streamCount++
        events.push({ type: 'stream', startIndex: runStart, endIndex: i - 1, startTime: objs[runStart].time, endTime: objs[i - 1].time, value: len })
      }
    }
  }
  // silence unused

  // Bursts: short dense windows (>=4 objects within 300ms)
  let burstCount = 0
  for (let i = 0; i < objs.length; i++) {
    let j = i
    while (j + 1 < objs.length && objs[j + 1].time - objs[i].time <= 300) j++
    const cnt = j - i + 1
    if (cnt >= 4) {
      burstCount++
      events.push({ type: 'burst', startIndex: i, endIndex: j, startTime: objs[i].time, endTime: objs[j].time, value: cnt })
      i = j
    }
  }

  // Doubles/Triples/Quads: consecutive objects with very short intervals (<=90ms)
  let doubleCount = 0, tripleCount = 0, quadCount = 0
  let i = 0
  while (i < objs.length - 1) {
    const dts: number[] = []
    let j = i
    while (j + 1 < objs.length && objs[j + 1].time - objs[j].time <= 90) { dts.push(objs[j + 1].time - objs[j].time); j++ }
    const len = j - i + 1
    if (len === 2) doubleCount++
    else if (len === 3) tripleCount++
    else if (len === 4) quadCount++
    i = Math.max(i + 1, j)
  }

  // Wide jumps: consecutive objects with distance >= 200 within 200ms
  let wideJumpCount = 0
  for (let i = 0; i < objs.length - 1; i++) {
    const dt = objs[i + 1].time - objs[i].time
    const d = Math.hypot(objs[i + 1].x - objs[i].x, objs[i + 1].y - objs[i].y)
    if (dt > 0 && dt <= 200 && d >= 200) wideJumpCount++
  }

  // Spaced streams: streams with average dt > 80ms
  let spacedStreamCount = 0
  // reuse stream runs
  let runStart3 = 0
  for (let k = 1; k <= objs.length; k++) {
    const prevDt = k > 1 ? objs[k - 1].time - objs[k - 2].time : 0
    if (k === 1 || (prevDt >= 40 && prevDt <= 125)) {
    } else {
      const len = k - 1 - runStart3
      if (len >= 5) {
        const avgDt = (objs[k - 2].time - objs[runStart3].time) / (len - 1)
        if (avgDt > 80) spacedStreamCount++
      }
      runStart3 = k - 1
    }
    if (k === objs.length) {
      const len = k - runStart3
      if (len >= 5) {
        const avgDt = (objs[k - 1].time - objs[runStart3].time) / (len - 1)
        if (avgDt > 80) spacedStreamCount++
      }
    }
  }

  // Kick sliders: sliders with repeats
  let kickSliderCount = 0, buzzSliderCount = 0
  for (const o of objs) {
    if ((o.type & 2) === 2) {
      const repeat = parseInt(o.params?.[2] || '1', 10) || 1
      if (repeat > 1) kickSliderCount++
    }
  }
  // Buzz sliders: very short sliders (duration < 60ms heuristic)
  for (let i = 0; i < objs.length - 1; i++) {
    if ((objs[i].type & 2) === 2) {
      const dt = objs[i + 1].time - objs[i].time
      if (dt > 0 && dt < 60) buzzSliderCount++
    }
  }

  // Snap aim: large distance within short time
  let snapAimCount = 0, flowAimCount = 0
  for (let i = 0; i < objs.length - 1; i++) {
    const dt = objs[i + 1].time - objs[i].time
    const d = Math.hypot(objs[i + 1].x - objs[i].x, objs[i + 1].y - objs[i].y)
    if (dt > 0 && dt <= 120 && d >= 150) snapAimCount++
    // flow aim: smooth small angle change
    if (i > 0 && i < objs.length - 1) {
      const a1 = Math.atan2(objs[i].y - objs[i-1].y, objs[i].x - objs[i-1].x)
      const a2 = Math.atan2(objs[i+1].y - objs[i].y, objs[i+1].x - objs[i].x)
      const diff = Math.abs(a1 - a2)
      if (diff < 0.3) flowAimCount++
    }
  }
  let deathstreamCount = 0
  let runStart2 = 0
  for (let k = 1; k <= objs.length; k++) {
    const prevDt = k > 1 ? objs[k - 1].time - objs[k - 2].time : 0
    if (k === 1 || (prevDt >= 20 && prevDt <= 60)) {
    } else {
      const len = k - 1 - runStart2
      if (len >= 8) deathstreamCount++
      runStart2 = k - 1
    }
    if (k === objs.length) {
      const len = k - runStart2
      if (len >= 8) deathstreamCount++
    }
  }

  // Density peak: max objects in 1s window
  let densityPeak = 0
  let left = 0
  for (let right = 0; right < objs.length; right++) {
    while (objs[right].time - objs[left].time > 1000) left++
    densityPeak = Math.max(densityPeak, right - left + 1)
  }

  // Timing intensity: mean inverse interval (objects per second) normalized
  const intervals: number[] = []
  for (let i = 1; i < objs.length; i++) intervals.push(objs[i].time - objs[i - 1].time)
  const meanInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 1000
  const timingIntensity = Math.min(100, 1000 / Math.max(meanInterval, 1))

  // Repetition: count repeated (dx,dy,dt) triples
  const sigs = new Map<string, number>()
  for (let i = 0; i < objs.length - 1; i++) {
    const key = `${Math.round(objs[i + 1].x - objs[i].x)},${Math.round(objs[i + 1].y - objs[i].y)},${Math.round(objs[i + 1].time - objs[i].time)}`
    sigs.set(key, (sigs.get(key) || 0) + 1)
  }
  let repeated = 0
  for (const v of sigs.values()) if (v > 1) repeated += v - 1
  const repetitionScore = Math.min(100, (repeated / Math.max(objs.length, 1)) * 100)

  // Irregularity: std dev of intervals normalized
  const mean = meanInterval
  const variance = intervals.length ? intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length : 0
  const std = Math.sqrt(variance)
  const irregularity = Math.min(100, (std / Math.max(mean, 1)) * 100)

  let alternatingCount = 0
  const metrics: AnalysisMetrics = { jumpCount, streamCount, burstCount, doubleCount, tripleCount, quadCount, deathstreamCount, wideJumpCount, spacedStreamCount, alternatingCount, kickSliderCount, buzzSliderCount, snapAimCount, flowAimCount, repetitionScore, densityPeak, timingIntensity, irregularity }

  // Score: weighted heuristic, normalized
  const normJumps = Math.min(1, jumpCount / Math.max(objs.length * 0.1, 1))
  const normStreams = Math.min(1, streamCount / 5)
  const normBursts = Math.min(1, burstCount / 5)
  const normDensity = Math.min(1, densityPeak / 20)
  const normRep = repetitionScore / 100
  const normTiming = timingIntensity / 100
  const normIrr = irregularity / 100

  const score = Math.round(
    (normJumps * 18 + normStreams * 18 + normBursts * 14 + normDensity * 14 + normRep * 12 + normTiming * 12 + normIrr * 12) * 100
  ) / 100
  const clamped = Math.max(0, Math.min(100, score))
  const abuseScore = Math.max(0, Math.min(100, Math.round((repetitionScore * 0.3 + Math.min(100, densityPeak * 5) * 0.25 + timingIntensity * 0.25 + irregularity * 0.2))))
  return { algorithmVersion: ALGORITHM_VERSION, score: clamped, abuseScore, metrics, events, warnings }
}
