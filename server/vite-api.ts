import type {IncomingMessage, ServerResponse} from 'node:http'
import type {Plugin} from 'vite'
import {createOsuClient, type OsuCredentials} from './osu'
import {beatmapApi} from './beatmap-api'

/** Run the same osu! API adapter with both `vite` and `vite preview`. */
export function localApi(env: OsuCredentials): Plugin {
    const client = createOsuClient(() => env)
    const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()
        try {
            const response = await beatmapApi(url, req.method ?? 'GET', client)
            if (response) {
                res.statusCode = response.status
                response.headers.forEach((value, key) => res.setHeader(key, value))
                res.end(await response.text())
                return
            }
            res.setHeader('Content-Type', 'application/json')
            if (url.pathname === '/api/health') return void res.end(JSON.stringify({ok: true}))
            if (url.pathname === '/api/rankings') return void res.end(JSON.stringify({items: []}))
            res.statusCode = 404
            res.end(JSON.stringify({error: 'Endpoint not available in the local preview.', code: 'NOT_FOUND'}))
        } catch {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({error: 'The local API could not complete the request.', code: 'INTERNAL_ERROR'}))
        }
    }
    return {
        name: 'patternholic-local-api',
        configureServer(server) {
            server.middlewares.use(middleware)
        },
        configurePreviewServer(server) {
            server.middlewares.use(middleware)
        },
    }
}
