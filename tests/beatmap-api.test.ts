import {describe, expect, it, vi} from 'vitest'
import {beatmapApi} from '../server/beatmap-api'
import {createOsuClient, normalizeBeatmapset} from '../server/osu'

const credentials = () => ({OSU_CLIENT_ID: 'test-client', OSU_CLIENT_SECRET: 'test-secret'})
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status})
const tokenResponse = () => json({access_token: 'test-token', expires_in: 3600})

function map(overrides: Record<string, unknown> = {}) {
    return {
        id: 101, mode: 'osu', mode_int: 0, status: 'ranked', ranked: 1, convert: false,
        version: 'Insane', difficulty_rating: 4.8, total_length: 180, bpm: 180,
        ar: 9, accuracy: 8, cs: 4, drain: 6, top_tag_ids: [{tag_id: 1, count: 8}],
        ...overrides,
    }
}

function set(overrides: Record<string, unknown> = {}) {
    return {
        id: 10, status: 'ranked', ranked: 1, title: 'Test song', artist: 'Test artist', creator: 'Test mapper',
        covers: {cover: 'https://assets.ppy.sh/beatmaps/10/covers/cover.jpg'},
        preview_url: '//b.ppy.sh/preview/10.mp3', tags: 'mapper-only-tag anime source',
        beatmaps: [map()], related_tags: [{id: 1, name: 'skillset/jumps', description: 'Wide jumps'}],
        ...overrides,
    }
}

describe('ranked standard library data', () => {
    it('preserves explicit maps and marks only maps flagged by osu!', () => {
        expect(normalizeBeatmapset(set({nsfw: true}))?.explicit).toBe(true)
        expect(normalizeBeatmapset(set({nsfw: false}))?.explicit).toBe(false)
        expect(normalizeBeatmapset(set())?.explicit).toBe(false)
    })
    it('removes other modes, converts, and unranked difficulties even in a mixed set', () => {
        const result = normalizeBeatmapset(set({
            beatmaps: [
                map(), map({id: 102, mode: 'mania', mode_int: 3}),
                map({id: 103, convert: true}), map({id: 104, status: 'loved', ranked: 4}),
            ]
        }))!
        expect(result.difficulties.map(difficulty => difficulty.id)).toEqual([101])
        expect(normalizeBeatmapset(set({status: 'loved', ranked: 4}))).toBeNull()
        expect(normalizeBeatmapset(set({status: 'approved', ranked: 2}))).toBeNull()
        expect(normalizeBeatmapset(set({beatmaps: [map({mode: 'taiko', mode_int: 1})]}))).toBeNull()
    })

    it('uses voted community tags for the displayed difficulties, never mapper tags or other modes', () => {
        const result = normalizeBeatmapset(set({
            beatmaps: [map({top_tag_ids: [{tag_id: 1, count: 8}, {tag_id: 2, count: 4}]}), map({
                id: 102,
                mode: 'mania',
                top_tag_ids: [{tag_id: 3, count: 50}]
            })],
            related_tags: [{id: 1, name: 'skillset/jumps'}, {id: 2, name: 'skillset/streams'}, {
                id: 3,
                name: 'pattern/jacks'
            }],
        }), true)!
        expect(result.communityTags.map(tag => tag.name)).toEqual(['skillset/jumps'])
        expect(result.communityTags[0].votes).toBe(8)
        expect(result.difficulties[0].communityTags).toEqual(result.communityTags)
        expect(JSON.stringify(result)).not.toContain('mapper-only-tag')
    })

    it('distinguishes unavailable community tags from a confirmed empty list', () => {
        const noTags = set({beatmaps: [map({top_tag_ids: []})], related_tags: []})
        expect(normalizeBeatmapset(noTags, true)?.communityTagsStatus).toBe('loaded')
        const absentTags = set({beatmaps: [map({top_tag_ids: undefined})], related_tags: undefined})
        expect(normalizeBeatmapset(absentTags)?.communityTagsStatus).toBe('pending')
        expect(normalizeBeatmapset(absentTags, true)?.communityTagsStatus).toBe('unavailable')
    })

    it('normalizes protocol-relative previews and honours download restrictions', () => {
        const result = normalizeBeatmapset(set({availability: {download_disabled: true}}))!
        expect(result.previewUrl).toBe('https://b.ppy.sh/preview/10.mp3')
        expect(result.downloadAvailable).toBe(false)
        expect(normalizeBeatmapset(set({preview_url: 'javascript:alert(1)'}))?.previewUrl).toBeNull()
        expect(normalizeBeatmapset(set({preview_url: 'https://unrelated.example/song.mp3'}))?.previewUrl).toBeNull()
    })
})

describe('osu! connection and routes', () => {
    it('returns an actionable configuration response without attempting an unauthenticated search', async () => {
        const request = vi.fn()
        const response = await beatmapApi(new URL('http://localhost/api/search?q=test'), 'GET', createOsuClient(() => ({}), request))
        expect(response?.status).toBe(503)
        expect(await response?.json()).toMatchObject({code: 'OSU_NOT_CONFIGURED'})
        expect(request).not.toHaveBeenCalled()
    })

    it('enforces ranked standard filters, preserves pagination, and reuses the token', async () => {
        const request = vi.fn().mockResolvedValueOnce(tokenResponse())
            .mockResolvedValueOnce(json({
                beatmapsets: [set(), set({id: 11, status: 'loved'})],
                cursor_string: 'next-page'
            }))
            .mockResolvedValueOnce(json({beatmapsets: [], cursor_string: null}))
        const client = createOsuClient(credentials, request)
        const first = await client.search('Camellia', 'plays_desc')
        const second = await client.search('Camellia', 'plays_desc', first.cursor!)
        expect(first.beatmapsets.map(beatmap => beatmap.id)).toEqual([10])
        expect(first.cursor).toBe('next-page')
        expect(second.cursor).toBeNull()
        const url = new URL(request.mock.calls[1][0])
        expect(Object.fromEntries(url.searchParams)).toMatchObject({
            q: 'Camellia',
            m: '0',
            s: 'ranked',
            sort: 'plays_desc',
            nsfw: 'true'
        })
        expect(new URL(request.mock.calls[2][0]).searchParams.get('cursor_string')).toBe('next-page')
        expect(request.mock.calls.filter(([url]) => String(url).endsWith('/oauth/token'))).toHaveLength(1)
    })

    it('rejects unsupported sort values before contacting osu!', async () => {
        const request = vi.fn()
        await expect(createOsuClient(credentials, request).search('test', 'invalid')).rejects.toMatchObject({status: 400})
        expect(request).not.toHaveBeenCalled()
    })

    it('refreshes an expired token once and retries the original request', async () => {
        const request = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(json({}, 401))
            .mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(json({beatmapsets: []}))
        const result = await createOsuClient(credentials, request).search('test')
        expect(result.beatmapsets).toEqual([])
        expect(request).toHaveBeenCalledTimes(4)
    })

    it('stops retrying rejected credentials and does not leak upstream details', async () => {
        const request = vi.fn().mockResolvedValue(json({error: 'sensitive-upstream-debug-information'}, 401))
        const response = await beatmapApi(new URL('http://localhost/api/search'), 'GET', createOsuClient(credentials, request))
        expect(response?.status).toBe(503)
        const body = await response!.text()
        expect(body).toContain('OSU_AUTH_FAILED')
        expect(body).not.toContain('sensitive-upstream')
        expect(body).not.toContain('test-secret')
    })

    it.each([429, 500])('handles osu! HTTP %s with a structured error', async status => {
        const request = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(json({}, status))
        const response = await beatmapApi(new URL('http://localhost/api/search'), 'GET', createOsuClient(credentials, request))
        expect(response?.status).toBe(status === 429 ? 429 : 502)
        expect(await response!.json()).toHaveProperty('code')
    })

    it('handles network failures and non-JSON responses', async () => {
        const offline = createOsuClient(credentials, vi.fn().mockRejectedValue(new Error('network details')))
        await expect(offline.search('test')).rejects.toMatchObject({code: 'OSU_UNREACHABLE'})
        const html = createOsuClient(credentials, vi.fn().mockResolvedValue(new Response('This response is not JSON')))
        await expect(html.search('test')).rejects.toMatchObject({code: 'OSU_INVALID_RESPONSE'})
    })

    it('deduplicates detail requests and supports both the canonical and legacy detail routes', async () => {
        const request = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(json(set()))
        const client = createOsuClient(credentials, request)
        const [a, b] = await Promise.all([
            beatmapApi(new URL('http://localhost/api/beatmap?id=10'), 'GET', client),
            beatmapApi(new URL('http://localhost/api/beatmapset/10'), 'GET', client),
        ])
        expect(a?.status).toBe(200)
        expect(await a?.json()).toEqual(await b?.json())
        expect(request).toHaveBeenCalledTimes(2)
    })

    it('rejects malformed links and unsupported methods without upstream requests', async () => {
        const request = vi.fn()
        const client = createOsuClient(credentials, request)
        const invalid = await beatmapApi(new URL('http://localhost/api/beatmap?id=wrong'), 'GET', client)
        const method = await beatmapApi(new URL('http://localhost/api/search'), 'POST', client)
        expect(invalid?.status).toBe(400)
        expect(method?.status).toBe(405)
        expect(method?.headers.get('Allow')).toBe('GET')
        expect(request).not.toHaveBeenCalled()
    })

    it('returns a useful not-found result for maps outside the library scope', async () => {
        const request = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(json(set({status: 'pending'})))
        const response = await beatmapApi(new URL('http://localhost/api/beatmap?id=10'), 'GET', createOsuClient(credentials, request))
        expect(response?.status).toBe(404)
        expect(await response?.json()).toMatchObject({code: 'BEATMAP_NOT_SUPPORTED'})
    })
})
