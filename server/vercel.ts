import type {VercelRequest, VercelResponse} from '@vercel/node'
import {createOsuClient} from './osu.js'
import {beatmapApi} from './beatmap-api.js'

const client = createOsuClient(() => process.env)

export async function handleBeatmapApi(req: VercelRequest, res: VercelResponse) {
    const response = await beatmapApi(new URL(req.url ?? '/', 'http://localhost'), req.method ?? 'GET', client)
    if (!response) return res.status(404).json({error: 'Endpoint not found.', code: 'NOT_FOUND'})
    response.headers.forEach((value, key) => res.setHeader(key, value))
    return res.status(response.status).send(await response.text())
}
