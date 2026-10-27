import type {BeatmapSearchResult, Beatmapset} from '@/types/beatmaps'

export class LibraryError extends Error {
    constructor(message: string, public code = 'REQUEST_FAILED') {
        super(message)
    }
}

async function readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
    let response: Response
    const timeout = AbortSignal.timeout(40_000)
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
    try {
        response = await fetch(path, {signal: requestSignal, headers: {Accept: 'application/json'}})
    } catch (error) {
        if (signal?.aborted) throw error
        if (timeout.aborted) throw new LibraryError('The library took too long to respond. Please try again.', 'REQUEST_TIMEOUT')
        throw new LibraryError('The library could not be reached. Check your connection and try again.')
    }
    const data = await response.json().catch(() => null)
    if (!response.ok || !data || data.error) {
        throw new LibraryError(typeof data?.error === 'string' ? data.error : 'The library returned an unexpected response. Please try again.', data?.code)
    }
    return data as T
}

export async function searchBeatmaps(query: string, sort: string, cursor: string | null, signal: AbortSignal) {
    const params = new URLSearchParams({q: query, sort})
    if (cursor) params.set('cursor', cursor)
    const result = await readJson<BeatmapSearchResult>(`/api/search?${params}`, signal)
    if (!Array.isArray(result.beatmapsets)) throw new LibraryError('The library returned an unreadable result. Please try again.')
    return result
}

// Share detail requests between visible search cards and the detail page, with bounded concurrency.
const cache = new Map<number, { expires: number; result: Promise<Beatmapset> }>()
const queue: Array<() => void> = []
let activeRequests = 0

export function getBeatmap(id: number, priority = false): Promise<Beatmapset> {
    const existing = cache.get(id)
    if (existing && existing.expires > Date.now()) return existing.result
    const result = new Promise<Beatmapset>((resolve, reject) => {
        const run = () => {
            activeRequests++
            readJson<Beatmapset>(`/api/beatmap?id=${id}`)
                .then(data => {
                    if (data.id !== id || !Array.isArray(data.difficulties) || !data.difficulties.length) {
                        throw new LibraryError('The beatmap data could not be read. Please try again.')
                    }
                    resolve(data)
                })
                .catch(error => {
                    cache.delete(id);
                    reject(error)
                })
                .finally(() => {
                    activeRequests--;
                    queue.shift()?.()
                })
        }
        if (activeRequests < 3) run()
        else if (priority) queue.unshift(run)
        else queue.push(run)
    })
    if (cache.size >= 150) cache.delete(cache.keys().next().value!)
    cache.set(id, {result, expires: Date.now() + 5 * 60_000})
    return result
}

export function formatLength(seconds: number | null) {
    if (seconds === null) return '—'
    const whole = Math.max(0, Math.round(seconds))
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function formatNumber(value: number | null, digits = 1) {
    return value === null ? '—' : value.toLocaleString(undefined, {maximumFractionDigits: digits})
}

export function difficultyColor(stars: number) {
    if (stars < 2) return '#87c8ef'
    if (stars < 2.7) return '#9cdda5'
    if (stars < 4) return '#e6d27c'
    if (stars < 5.3) return '#efac82'
    if (stars < 6.5) return '#e993a9'
    if (stars < 8) return '#c09be6'
    return '#a6a5f4'
}

export function shortTag(name: string) {
    return name.includes('/') ? name.slice(name.indexOf('/') + 1) : name
}
