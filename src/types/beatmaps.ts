export interface CommunityTag {
    id: number
    name: string
    description: string
    votes: number
}

export type TagStatus = 'pending' | 'loaded' | 'unavailable'

export interface BeatmapDifficulty {
    id: number
    name: string
    stars: number
    bpm: number | null
    length: number | null
    ar: number | null
    od: number | null
    cs: number | null
    hp: number | null
    maxCombo: number | null
    circles: number | null
    sliders: number | null
    spinners: number | null
    communityTags: CommunityTag[]
}

export interface Beatmapset {
    explicit: boolean
    id: number
    title: string
    artist: string
    creator: string
    creatorId: number | null
    coverUrl: string | null
    cardCoverUrl: string | null
    previewUrl: string | null
    bpm: number | null
    rankedDate: string | null
    playCount: number | null
    favouriteCount: number | null
    downloadAvailable: boolean
    difficulties: BeatmapDifficulty[]
    communityTags: CommunityTag[]
    communityTagsStatus: TagStatus
}

export interface BeatmapSearchResult {
    beatmapsets: Beatmapset[]
    cursor: string | null
}

export interface ApiErrorBody {
    error: string
    code: string
}
