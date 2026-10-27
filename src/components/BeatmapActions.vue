<template>
  <div class="beatmap-actions" :class="{ 'beatmap-actions--expanded': expanded }" role="group"
       :aria-label="`Actions for ${beatmap.title}`">
    <button class="map-action preview-action" type="button" :class="{ 'is-playing': playing }"
            :disabled="!beatmap.previewUrl" :aria-pressed="playing"
            :aria-label="playing ? `Stop preview of ${beatmap.title}` : `Play preview of ${beatmap.title}`"
            :title="!beatmap.previewUrl ? 'No song preview available' : playing ? 'Stop preview' : 'Play song preview'"
            @click="preview.toggle(beatmap.id, beatmap.previewUrl)">
      <AppIcon :name="playing ? 'pause' : 'play'"/>
      <span v-if="expanded">{{ playing ? preview.loading.value ? 'Loading…' : 'Stop preview' : 'Song preview' }}</span>
      <span v-if="playing" class="preview-indicator" aria-hidden="true"><i></i><i></i><i></i></span>
    </button>
    <a class="map-action" :href="officialUrl" target="_blank" rel="noopener noreferrer"
       :aria-label="`Open ${beatmap.title} on osu!`" title="Open official osu! page">
      <AppIcon name="arrow-up-right"/>
      <span v-if="expanded">osu! page</span>
    </a>
    <a v-if="beatmap.downloadAvailable" class="map-action"
       :href="`https://osu.ppy.sh/beatmapsets/${beatmap.id}/download`"
       target="_blank" rel="noopener noreferrer"
       :aria-label="`Download ${beatmap.title} from osu! (sign-in may be required)`"
       title="Download from osu! · sign-in may be required">
      <AppIcon name="download"/>
      <span v-if="expanded">Download</span>
    </a>
    <button v-else class="map-action" disabled title="Downloads are disabled for this beatmap"
            aria-label="Download unavailable">
      <AppIcon name="download"/>
      <span v-if="expanded">Unavailable</span>
    </button>
  </div>
  <p v-if="preview.failure.value?.id === beatmap.id" class="preview-error" role="status">
    {{ preview.failure.value.message }}</p>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, watch} from 'vue'
import type {Beatmapset} from '@/types/beatmaps'
import {useSongPreview} from '@/composables/useSongPreview'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ beatmap: Beatmapset; difficultyId?: number; expanded?: boolean }>()
const preview = useSongPreview()
const playing = computed(() => preview.activeId.value === props.beatmap.id)
const officialUrl = computed(() => `https://osu.ppy.sh/beatmapsets/${props.beatmap.id}#osu/${props.difficultyId ?? props.beatmap.difficulties[0]?.id ?? ''}`)
watch(() => props.beatmap.id, (_id, previous) => {
  if (preview.activeId.value === previous) preview.stop()
})
onBeforeUnmount(() => {
  if (playing.value) preview.stop()
})
</script>
