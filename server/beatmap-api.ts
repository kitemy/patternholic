import {OsuError, type OsuClient} from './osu'

export async function beatmapApi(url: URL, method: string, client: OsuClient): Promise<Response | null> {
    const path = url.pathname
    if (path !== '/api/search' && path !== '/api/beatmap' && !path.startsWith('/api/beatmapset/')) return null
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'},
    })
    if (method !== 'GET') return new Response(JSON.stringify({
        error: 'Use GET for this endpoint.',
        code: 'METHOD_NOT_ALLOWED'
    }), {
        status: 405, headers: {'Content-Type': 'application/json', Allow: 'GET'},
    })
    try {
        if (path === '/api/search') return json(await client.search(
            url.searchParams.get('q') ?? '',
            url.searchParams.get('sort') ?? 'relevance_desc',
            url.searchParams.get('cursor') ?? '',
        ))
        const id = path === '/api/beatmap' ? url.searchParams.get('id') ?? '' : path.slice('/api/beatmapset/'.length)
        return json(await client.detail(id))
    } catch (error) {
        if (error instanceof OsuError) return json({error: error.message, code: error.code}, error.status)
        return json({
            error: 'The beatmap library is temporarily unavailable. Please try again.',
            code: 'INTERNAL_ERROR'
        }, 500)
    }
}
