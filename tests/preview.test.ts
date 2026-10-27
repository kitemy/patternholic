import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useSongPreview} from '../src/composables/useSongPreview'

class TestAudio {
    static instances: TestAudio[] = []
    src = ''
    volume = 0
    preload = ''
    onended: (() => void) | null = null
    onerror: (() => void) | null = null
    pause = vi.fn()
    load = vi.fn()
    removeAttribute = vi.fn()
    play = vi.fn().mockResolvedValue(undefined)

    constructor() {
        TestAudio.instances.push(this)
    }
}

describe('song previews', () => {
    beforeEach(() => {
        vi.stubGlobal('Audio', TestAudio);
        vi.useFakeTimers();
        TestAudio.instances = []
    })
    afterEach(() => {
        useSongPreview().stop();
        vi.unstubAllGlobals();
        vi.useRealTimers()
    })

    it('stops the previous song when another starts and toggles an active song off', async () => {
        const preview = useSongPreview()
        await preview.toggle(1, 'https://b.ppy.sh/preview/1.mp3')
        const first = TestAudio.instances[0]
        await preview.toggle(2, 'https://b.ppy.sh/preview/2.mp3')
        expect(first.pause).toHaveBeenCalled()
        expect(first.removeAttribute).toHaveBeenCalledWith('src')
        expect(preview.activeId.value).toBe(2)
        await preview.toggle(2, 'https://b.ppy.sh/preview/2.mp3')
        expect(preview.activeId.value).toBeNull()
    })

    it('keeps failed playback local and allows a later retry', async () => {
        const preview = useSongPreview()
        await preview.toggle(1, 'https://b.ppy.sh/preview/1.mp3')
        TestAudio.instances[0].onerror?.()
        expect(preview.activeId.value).toBeNull()
        expect(preview.failure.value?.id).toBe(1)
        await preview.toggle(1, 'https://b.ppy.sh/preview/1.mp3')
        expect(preview.failure.value).toBeNull()
        expect(preview.activeId.value).toBe(1)
    })

    it('ignores late errors and ended events from a previous song', async () => {
        const preview = useSongPreview()
        await preview.toggle(1, 'https://b.ppy.sh/preview/1.mp3')
        const first = TestAudio.instances[0]
        await preview.toggle(2, 'https://b.ppy.sh/preview/2.mp3')
        first.onerror?.()
        first.onended?.()
        expect(preview.activeId.value).toBe(2)
        expect(preview.failure.value).toBeNull()
    })

    it('does not autoplay when a map has no preview', async () => {
        await useSongPreview().toggle(1, null)
        expect(TestAudio.instances).toHaveLength(0)
        expect(useSongPreview().activeId.value).toBeNull()
    })
})
