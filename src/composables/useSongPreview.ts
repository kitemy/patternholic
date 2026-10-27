import {readonly, ref} from 'vue'

const activeId = ref<number | null>(null)
const loading = ref(false)
const failure = ref<{ id: number; message: string } | null>(null)
let audio: HTMLAudioElement | null = null
let playbackId = 0
let timer: ReturnType<typeof setTimeout> | undefined

function stop() {
    playbackId++
    clearTimeout(timer)
    if (audio) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        audio = null
    }
    activeId.value = null
    loading.value = false
}

async function toggle(id: number, url: string | null) {
    if (activeId.value === id) {
        stop();
        return
    }
    stop()
    failure.value = null
    if (!url) return
    const current = playbackId
    const player = new Audio()
    audio = player
    player.preload = 'none'
    player.volume = 0.5
    player.src = url
    activeId.value = id
    loading.value = true

    const fail = () => {
        if (current !== playbackId) return
        stop()
        failure.value = {id, message: 'This song preview is unavailable. You can try it again or listen on osu!.'}
    }
    player.onended = () => {
        if (current === playbackId) stop()
    }
    player.onerror = fail
    timer = setTimeout(fail, 15_000)
    try {
        await player.play()
        if (current === playbackId) {
            loading.value = false;
            clearTimeout(timer)
        }
    } catch {
        fail()
    }
}

export function useSongPreview() {
    return {activeId: readonly(activeId), loading: readonly(loading), failure: readonly(failure), toggle, stop}
}
