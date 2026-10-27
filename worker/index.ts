/// <reference types="@cloudflare/workers-types" />
import { parseOsu } from '../src/lib/osuParser'
import { analyzeBeatmap, ALGORITHM_VERSION } from '../src/lib/analysis'
import { createOsuClient, type OsuClient } from '../server/osu'
import { beatmapApi } from '../server/beatmap-api'

interface Env { DB: D1Database; ASSETS: Fetcher; OSU_CLIENT_ID?: string; OSU_CLIENT_SECRET?: string }

const clients = new WeakMap<Env, OsuClient>()

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    try {
      let client = clients.get(env)
      if (!client) { client = createOsuClient(() => env); clients.set(env, client) }
      const beatmapResponse = await beatmapApi(url, request.method, client)
      if (beatmapResponse) return beatmapResponse
      if (path === '/api/health') return json({ ok: true })
      if (path === '/api/analyze' && request.method === 'POST') {
        const body: any = await request.json()
        const text = String(body?.content || '')
        if (!text) return json({ error: 'missing content' }, 400)
        if (text.length > 5_000_000) return json({ error: 'file too large' }, 413)
        const map = parseOsu(text)
        const result = analyzeBeatmap(map)
        // store
        try {
          const beatmapId = parseInt(map.metadata['BeatmapID'] || '0', 10) || 0
          if (beatmapId) {
            await env.DB.prepare('INSERT OR IGNORE INTO beatmaps (id, beatmapset_id, version, mode) VALUES (?,?,?,?)')
              .bind(beatmapId, parseInt(map.metadata['BeatmapSetID'] || '0', 10) || null, map.metadata['Version'] || '', map.mode).run()
            await env.DB.prepare('INSERT INTO analyses (beatmap_id, algorithm_version, status, score, metrics_json, events_json, warnings_json) VALUES (?,?,?,?,?,?,?)')
              .bind(beatmapId, result.algorithmVersion, 'completed', result.score, JSON.stringify(result.metrics), JSON.stringify(result.events), JSON.stringify(result.warnings)).run()
          }
        } catch (e) { /* ignore db errors in dev */ }
        return json({ ...result, metadata: map.metadata, mode: map.mode })
      }
      if (path === '/api/rankings') {
        const rows = await env.DB.prepare('SELECT a.score, a.beatmap_id, a.algorithm_version, a.completed_at, b.version FROM analyses a LEFT JOIN beatmaps b ON a.beatmap_id=b.id WHERE a.status="completed" ORDER BY a.score DESC LIMIT 50').all()
        return json({ items: rows.results })
      }
      if (path === '/api/methodology') {
        return json({ algorithmVersion: ALGORITHM_VERSION })
      }
      // serve assets
      return env.ASSETS.fetch(request)
    } catch (err: any) {
      return json({ error: err?.message || 'error' }, 500)
    }
  }
}
