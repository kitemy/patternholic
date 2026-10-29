import type {BeatmapDifficulty, BeatmapSearchResult, Beatmapset, CommunityTag} from '../src/types/beatmaps'

export interface OsuCredentials {
    OSU_CLIENT_ID?: string
    OSU_CLIENT_SECRET?: string
}

export class OsuError extends Error {
    constructor(public status: number, public code: string, message: string) {
        super(message)
        this.name = 'OsuError'
    }
}

type RecordValue = Record<string, unknown>
const record = (value: unknown): RecordValue =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
const numeric = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null
const positiveId = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback

function mediaUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value) return null
    try {
        const url = new URL(value.startsWith('//') ? `https:${value}` : value)
        // Never send the browser to arbitrary hosts supplied in an upstream payload.
        return url.protocol === 'https:' &&
        (url.hostname === 'ppy.sh' || url.hostname.endsWith('.ppy.sh')) ? url.href : null
    } catch {
        return null
    }
}

function isRanked(value: RecordValue) {
    return value.status === 'ranked' || (value.status == null && value.ranked === 1)
}

export function normalizeBeatmapset(raw: unknown, detail = false): Beatmapset | null {
    const set = record(raw)
    if (!positiveId(set.id) || !isRanked(set) || !Array.isArray(set.beatmaps)) return null

    const definitions = new Map<number, RecordValue>()
    for (const item of Array.isArray(set.related_tags) ? set.related_tags : []) {
        const tag = record(item)
        if (positiveId(tag.id) && typeof tag.name === 'string') definitions.set(tag.id, tag)
    }

    const standardMaps = set.beatmaps.map(record).filter(map =>
        positiveId(map.id) && isRanked(map) && map.convert !== true &&
        (map.mode === 'osu' || (map.mode == null && map.mode_int === 0)),
    )
    if (!standardMaps.length) return null

    const tagsAvailable = Array.isArray(set.related_tags) &&
        standardMaps.every(map => Array.isArray(map.top_tag_ids))
    const totals = new Map<number, CommunityTag>()
    const difficulties: BeatmapDifficulty[] = standardMaps.map(map => {
        const tags: CommunityTag[] = []
        for (const item of Array.isArray(map.top_tag_ids) ? map.top_tag_ids : []) {
            const vote = record(item)
            const definition = definitions.get(vote.tag_id as number)
            const votes = numeric(vote.count)
            // Match osu!'s public display threshold. Mapper metadata `tags` is never used.
            if (!definition || votes === null || votes < 5) continue
            const tag = {
                id: definition.id as number,
                name: text(definition.name),
                description: text(definition.description),
                votes
            }
            tags.push(tag)
            const previous = totals.get(tag.id)
            totals.set(tag.id, {...tag, votes: (previous?.votes ?? 0) + votes})
        }
        return {
            id: map.id as number, name: text(map.version, 'Untitled difficulty'),
            stars: numeric(map.difficulty_rating) ?? 0,
            bpm: numeric(map.bpm) ?? numeric(set.bpm), length: numeric(map.total_length),
            ar: numeric(map.ar), od: numeric(map.accuracy), cs: numeric(map.cs), hp: numeric(map.drain),
            maxCombo: numeric(map.max_combo), circles: numeric(map.count_circles),
            sliders: numeric(map.count_sliders), spinners: numeric(map.count_spinners),
            communityTags: tags.sort((a, b) => b.votes - a.votes || a.id - b.id),
        }
    }).sort((a, b) => a.stars - b.stars || a.id - b.id)

    const covers = record(set.covers)
    return {
        id: set.id, title: text(set.title, 'Untitled'), artist: text(set.artist, 'Unknown artist'),
        creator: text(set.creator, 'Unknown mapper'), creatorId: numeric(set.user_id),
        explicit: set.nsfw === true,
        coverUrl: mediaUrl(covers['cover@2x']) ?? mediaUrl(covers.cover),
        cardCoverUrl: mediaUrl(covers['card@2x']) ?? mediaUrl(covers.card) ?? mediaUrl(covers.cover),
        previewUrl: mediaUrl(set.preview_url), bpm: numeric(set.bpm),
        rankedDate: typeof set.ranked_date === 'string' ? set.ranked_date : null,
        playCount: numeric(set.play_count), favouriteCount: numeric(set.favourite_count),
        downloadAvailable: record(set.availability).download_disabled !== true,
        difficulties,
        communityTags: [...totals.values()].sort((a, b) => b.votes - a.votes || a.id - b.id),
        communityTagsStatus: tagsAvailable ? 'loaded' : detail ? 'unavailable' : 'pending',
    }
}

const API = 'https://osu.ppy.sh/api/v2'
const SORTS = new Set(['relevance_desc', 'ranked_desc', 'plays_desc', 'favourites_desc', 'difficulty_desc'])

/** One client per runtime: tokens and detail requests are reused, never exposed to the browser. */
export function createOsuClient(credentials: () => OsuCredentials, request: typeof fetch = fetch) {
    let token: { value: string; expires: number; clientId: string } | null = null
    let tokenRequest: Promise<string> | null = null
    const details = new Map<string, { expires: number; value: Promise<Beatmapset> }>()

    async function fetchJson(url: string, init: RequestInit = {}): Promise<RecordValue> {
        let response: Response
        try {
            response = await request(url, {...init, signal: AbortSignal.timeout(12_000)})
        } catch {
            throw new OsuError(503, 'OSU_UNREACHABLE', 'osu! could not be reached. Please try again in a moment.')
        }
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new OsuError(503, 'OSU_AUTH_FAILED', 'The osu! connection needs attention. Please check the server’s API credentials.')
            }
            if (response.status === 429) throw new OsuError(429, 'OSU_RATE_LIMITED', 'osu! is receiving too many requests. Please wait a moment before trying again.')
            if (response.status === 404) throw new OsuError(404, 'BEATMAP_NOT_FOUND', 'This beatmap could not be found on osu!.')
            throw new OsuError(502, 'OSU_UPSTREAM_ERROR', 'osu! is temporarily unavailable. Please try again shortly.')
        }
        let data: unknown
        try {
            data = await response.json()
        } catch {
            throw new OsuError(502, 'OSU_INVALID_RESPONSE', 'osu! returned an unreadable response. Please try again.')
        }
        if (!data || typeof data !== 'object' || Array.isArray(data) || record(data).error) {
            throw new OsuError(502, 'OSU_INVALID_RESPONSE', 'osu! could not complete this request. Please try again.')
        }
        return record(data)
    }

    async function getToken(): Promise<string> {
        const env = credentials()
        if (!env.OSU_CLIENT_ID?.trim() || !env.OSU_CLIENT_SECRET?.trim()) {
            throw new OsuError(503, 'OSU_NOT_CONFIGURED', 'The beatmap library is not connected yet. The site owner needs to configure the osu! API connection.')
        }
        if (token && token.clientId === env.OSU_CLIENT_ID && token.expires > Date.now()) return token.value
        if (tokenRequest) return tokenRequest
        tokenRequest = (async () => {
            const result = await fetchJson('https://osu.ppy.sh/oauth/token', {
                method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'},
                body: JSON.stringify({
                    client_id: env.OSU_CLIENT_ID,
                    client_secret: env.OSU_CLIENT_SECRET,
                    grant_type: 'client_credentials',
                    scope: 'public'
                }),
            })
            if (typeof result.access_token !== 'string' || !result.access_token) {
                throw new OsuError(503, 'OSU_AUTH_FAILED', 'The osu! connection needs attention. Please check the server’s API credentials.')
            }
            token = {
                value: result.access_token,
                clientId: env.OSU_CLIENT_ID!,
                expires: Date.now() + Math.max(0, (numeric(result.expires_in) ?? 3600) - 60) * 1000
            }
            return token.value
        })()
        try {
            return await tokenRequest
        } finally {
            tokenRequest = null
        }
    }

    async function api(path: string) {
        for (let attempt = 0; attempt < 2; attempt++) {
            const accessToken = await getToken()
            try {
                return await fetchJson(`${API}${path}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json'
                    }
                })
            } catch (error) {
                if (attempt === 0 && error instanceof OsuError && error.code === 'OSU_AUTH_FAILED') {
                    token = null
                    continue
                }
                throw error
            }
        }
        throw new OsuError(503, 'OSU_AUTH_FAILED', 'The osu! connection could not be authenticated.')
    }

    return {
        async search(query: string, sort = 'relevance_desc', cursor = ''): Promise<BeatmapSearchResult> {
            if (query.length > 200 || cursor.length > 4096 || !SORTS.has(sort)) {
                throw new OsuError(400, 'INVALID_SEARCH', 'Please use a shorter search and a supported sort order.')
            }
            // These filters are enforced server-side; arbitrary client mode/status parameters are ignored.
            const params = new URLSearchParams({q: query.trim(), m: '0', s: 'ranked', sort, nsfw: 'true'})
            if (cursor) params.set('cursor_string', cursor)
            const data = await api(`/beatmapsets/search?${params}`)
            if (!Array.isArray(data.beatmapsets)) throw new OsuError(502, 'OSU_INVALID_RESPONSE', 'osu! returned an unreadable search response. Please try again.')
            return {
                beatmapsets: data.beatmapsets.map(value => normalizeBeatmapset(value)).filter((value): value is Beatmapset => value !== null),
                cursor: typeof data.cursor_string === 'string' && data.cursor_string ? data.cursor_string : null,
            }
        },
        async detail(id: string): Promise<Beatmapset> {
            if (!/^[1-9]\d{0,9}$/.test(id)) throw new OsuError(400, 'INVALID_BEATMAP_ID', 'Please open a valid beatmap link.')
            const cached = details.get(id)
            if (cached && cached.expires > Date.now()) return cached.value
            const value = (async () => {
                const data = await api(`/beatmapsets/${id}`)
                const result = normalizeBeatmapset(data, true)
                if (!result) throw new OsuError(404, 'BEATMAP_NOT_SUPPORTED', 'This library contains ranked osu!standard beatmaps only.')
                return result
            })()
            if (details.size >= 150) details.delete(details.keys().next().value!)
            details.set(id, {value, expires: Date.now() + 5 * 60_000})
            try {
                return await value
            } catch (error) {
                details.delete(id);
                throw error
            }
        },
    }
}

export type OsuClient = ReturnType<typeof createOsuClient>
