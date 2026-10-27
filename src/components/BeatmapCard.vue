<template>
  <article ref="card" class="beatmap-card">
    <div class="beatmap-card-art">
      <BeatmapCover :src="beatmap.cardCoverUrl || beatmap.coverUrl"/>
      <div class="beatmap-card-badges">
        <span class="ranked-badge"><AppIcon name="check"/> Ranked</span>
        <div class="map-quick-stats"><span><AppIcon name="clock"/>{{
            formatLength(longestLength)
          }}</span><span>{{ formatNumber(beatmap.bpm) }} BPM</span></div>
      </div>
      <RouterLink class="beatmap-card-title" :to="detailUrl">
        <p>{{ beatmap.artist }}</p>
        <h2>{{ beatmap.title }}</h2>
        <span>mapped by <strong>{{ beatmap.creator }}</strong></span>
        <AppIcon class="card-open-icon" name="arrow-up-right"/>
      </RouterLink>
    </div>
    <div class="beatmap-card-body">
      <div class="beatmap-card-tools">
        <div class="difficulty-summary">
          <div class="difficulty-dots" aria-label="Ranked standard difficulties">
            <RouterLink v-for="difficulty in beatmap.difficulties.slice(0, 8)" :key="difficulty.id"
                        :to="{ path: `/beatmap/${beatmap.id}`, query: { ...searchQuery, difficulty: difficulty.id } }"
                        :style="{ '--difficulty-color': difficultyColor(difficulty.stars) }"
                        :title="`${difficulty.name} · ${difficulty.stars.toFixed(2)} stars`"
                        :aria-label="`${difficulty.name}, ${difficulty.stars.toFixed(2)} stars`"><span></span>
            </RouterLink>
            <span v-if="beatmap.difficulties.length > 8" class="difficulty-overflow">+{{
                beatmap.difficulties.length - 8
              }}</span>
          </div>
          <span class="difficulty-range"><AppIcon name="star"/>{{ starRange }} <span>· {{ beatmap.difficulties.length }} diffs</span></span>
        </div>
        <BeatmapActions :beatmap="beatmap"/>
      </div>
      <CommunityTags :tags="tags" :status="tagStatus"/>
    </div>
  </article>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import type {Beatmapset} from '@/types/beatmaps'
import {difficultyColor, formatLength, formatNumber, getBeatmap} from '@/lib/beatmaps'
import AppIcon from './AppIcon.vue'
import BeatmapCover from './BeatmapCover.vue'
import BeatmapActions from './BeatmapActions.vue'
import CommunityTags from './CommunityTags.vue'

const props = defineProps<{ beatmap: Beatmapset }>()
const route = useRoute()
const card = ref<HTMLElement | null>(null)
const tags = ref(props.beatmap.communityTags)
const tagStatus = ref(props.beatmap.communityTagsStatus)
const searchQuery = computed(() => {
  const query = typeof route.query.q === 'string' ? route.query.q : ''
  return {
    q: query,
    sort: typeof route.query.sort === 'string' ? route.query.sort : query ? 'relevance_desc' : 'ranked_desc'
  }
})
const detailUrl = computed(() => ({path: `/beatmap/${props.beatmap.id}`, query: searchQuery.value}))
const longestLength = computed(() => {
  const lengths = props.beatmap.difficulties.map(difficulty => difficulty.length).filter((length): length is number => length !== null)
  return lengths.length ? Math.max(...lengths) : null
})
const starRange = computed(() => {
  const values = props.beatmap.difficulties.map(difficulty => difficulty.stars)
  const low = Math.min(...values).toFixed(2)
  const high = Math.max(...values).toFixed(2)
  return low === high ? low : `${low}–${high}`
})
let observer: IntersectionObserver | undefined
let disposed = false

async function loadTags() {
  observer?.disconnect()
  if (tagStatus.value !== 'pending') return
  try {
    const detail = await getBeatmap(props.beatmap.id)
    if (!disposed) {
      tags.value = detail.communityTags;
      tagStatus.value = detail.communityTagsStatus
    }
  } catch {
    if (!disposed) tagStatus.value = 'unavailable'
  }
}

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    void loadTags();
    return
  }
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) void loadTags()
  }, {rootMargin: '160px'})
  if (card.value) observer.observe(card.value)
})
onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect()
})
</script>
