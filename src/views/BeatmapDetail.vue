<template>
  <div class="page beatmap-page">
    <RouterLink class="text-link back-to-library" :to="backLink">
      <AppIcon name="arrow-left"/>
      Back to the library
    </RouterLink>

    <div v-if="loading" class="loading-state" role="status">
      <AppIcon name="activity"/>
      <p>Opening the beatmap…</p></div>
    <section v-else-if="error" class="empty-state">
      <AppIcon name="music" class="empty-state-icon"/>
      <h1 class="page-title">This beatmap couldn’t be opened.</h1>
      <p role="alert">{{ error }}</p>
      <button class="button button-secondary" type="button" @click="loadBeatmap">
        <AppIcon name="refresh"/>
        Try again
      </button>
    </section>

    <template v-else-if="data && selected">
      <header class="beatmap-hero">
        <BeatmapCover :src="data.coverUrl || data.cardCoverUrl" eager/>
        <div class="beatmap-hero-content">
          <div class="beatmap-hero-labels"><span class="ranked-badge"><AppIcon name="check"/> Ranked</span><span
              class="filter-chip"><span class="standard-symbol" aria-hidden="true"></span> osu!standard</span><span v-if="data.explicit" class="explicit-badge">Explicit</span></div>
          <p class="beatmap-artist">{{ data.artist }}</p>
          <h1>{{ data.title }}</h1>
          <p class="beatmap-byline">Mapped by <a v-if="data.creatorId"
                                                 :href="`https://osu.ppy.sh/users/${data.creatorId}`" target="_blank"
                                                 rel="noopener noreferrer">{{ data.creator }}</a><strong
              v-else>{{ data.creator }}</strong><span v-if="rankedDate"> · Ranked {{ rankedDate }}</span></p>
          <BeatmapActions :beatmap="data" :difficulty-id="selected.id" expanded/>
        </div>
      </header>

      <div class="beatmap-detail-layout">
        <aside class="difficulty-sidebar" aria-labelledby="difficulties-title">
          <div class="section-heading"><h2 id="difficulties-title">Difficulties</h2><span
              class="result-count">{{ data.difficulties.length }}</span></div>
          <div class="difficulty-options" role="group" aria-label="Choose a difficulty">
            <button v-for="difficulty in data.difficulties" :key="difficulty.id" type="button"
                    class="difficulty-option" :class="{ 'is-selected': selected.id === difficulty.id }"
                    :style="{ '--difficulty-color': difficultyColor(difficulty.stars) }"
                    :aria-pressed="selected.id === difficulty.id" @click="selectDifficulty(difficulty.id)">
              <span class="difficulty-ring" aria-hidden="true"></span>
              <span class="difficulty-option-name">{{ difficulty.name }}</span>
              <span class="difficulty-option-stars">{{ difficulty.stars.toFixed(2) }} <AppIcon name="star"/></span>
            </button>
          </div>
          <div class="beatmap-popularity">
            <p>
              <AppIcon name="play"/>
              <span>{{ formatNumber(data.playCount, 0) }} plays</span></p>
            <p>
              <AppIcon name="heart"/>
              <span>{{ formatNumber(data.favouriteCount, 0) }} favourites</span></p>
          </div>
        </aside>

        <div class="beatmap-detail-main">
          <section class="difficulty-overview" aria-labelledby="difficulty-title">
            <p class="eyebrow">Inside the difficulty</p>
            <div class="difficulty-overview-heading"><h2 id="difficulty-title">{{ selected.name }}</h2><span
                class="star-rating" :style="{ '--difficulty-color': difficultyColor(selected.stars) }"><AppIcon
                name="star"/>{{ selected.stars.toFixed(2) }}</span></div>
            <dl class="map-stats">
              <div>
                <dt>Length</dt>
                <dd>{{ formatLength(selected.length) }}</dd>
              </div>
              <div>
                <dt>BPM</dt>
                <dd>{{ formatNumber(selected.bpm) }}</dd>
              </div>
              <div>
                <dt>Circle size</dt>
                <dd>{{ formatNumber(selected.cs) }}</dd>
              </div>
              <div>
                <dt>Approach rate</dt>
                <dd>{{ formatNumber(selected.ar) }}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>{{ formatNumber(selected.od) }}</dd>
              </div>
              <div>
                <dt>HP drain</dt>
                <dd>{{ formatNumber(selected.hp) }}</dd>
              </div>
            </dl>
            <div class="map-object-stats"><span>{{
                formatNumber(selected.circles, 0)
              }} circles</span><span>{{
                formatNumber(selected.sliders, 0)
              }} sliders</span><span>{{
                formatNumber(selected.spinners, 0)
              }} spinners</span><span>{{ formatNumber(selected.maxCombo, 0) }} max combo</span></div>
            <CommunityTags :tags="selected.communityTags" :status="data.communityTagsStatus" :limit="30" show-votes/>
            <p class="tag-explainer">Tags voted on by osu! players for this difficulty.</p>
          </section>

          <section class="pattern-workspace" aria-labelledby="pattern-title">
            <div class="section-heading">
              <div><p class="eyebrow">The next layer</p>
                <h2 id="pattern-title">Pattern insights</h2></div>
              <span class="coming-soon"><AppIcon name="lock"/> Coming soon</span></div>
            <p class="pattern-intro">The pattern analyzer is being built. This space will show the score, rhythm
              breakdown, and detected events for <strong>{{ selected.name }}</strong> once it is ready.</p>
            <div class="pending-metrics">
              <div v-for="metric in pendingMetrics" :key="metric"><span>{{ metric }}</span><strong
                  aria-label="Not calculated">—</strong><small>Awaiting analysis</small></div>
            </div>
            <div class="pending-timeline">
              <AppIcon name="activity"/>
              <h3>Your pattern timeline will live here.</h3>
              <p>Jumps, streams, and rhythm changes, mapped to the music.</p>
              <div class="timeline-guide" aria-hidden="true"><span>00:00</span><span>{{
                  formatLength(selected.length)
                }}</span></div>
            </div>
            <p class="analysis-disclaimer">
              <AppIcon name="info"/>
              No pattern scores have been calculated for this difficulty.
            </p>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import type {Beatmapset} from '@/types/beatmaps'
import {difficultyColor, formatLength, formatNumber, getBeatmap} from '@/lib/beatmaps'
import AppIcon from '@/components/AppIcon.vue'
import BeatmapCover from '@/components/BeatmapCover.vue'
import BeatmapActions from '@/components/BeatmapActions.vue'
import CommunityTags from '@/components/CommunityTags.vue'

const route = useRoute()
const router = useRouter()
const data = ref<Beatmapset | null>(null)
const loading = ref(true)
const error = ref('')
let requestId = 0
const pendingMetrics = ['Pattern score', 'Jumps', 'Streams', 'Bursts']
const selected = computed(() => data.value?.difficulties.find(difficulty => difficulty.id === Number(route.query.difficulty)) ?? data.value?.difficulties[0])
const backLink = computed(() => ({
  path: '/search',
  query: {...(typeof route.query.q === 'string' ? {q: route.query.q} : {}), ...(typeof route.query.sort === 'string' ? {sort: route.query.sort} : {})}
}))
const rankedDate = computed(() => {
  if (!data.value?.rankedDate) return ''
  const date = new Date(data.value.rankedDate)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

function selectDifficulty(id: number) {
  void router.replace({query: {...route.query, difficulty: id}})
}

async function loadBeatmap() {
  const current = ++requestId
  loading.value = true
  error.value = ''
  data.value = null
    const id = String(route.params.id)
    if (!/^[1-9]\d{0,9}$/.test(id)) {
        error.value = 'This beatmap link is invalid. Choose a ranked standard beatmap from the library.'
        loading.value = false
        return
    }
  try {
    const result = await getBeatmap(Number(id), true)
    if (current === requestId) data.value = result
  } catch (cause) {
    if (current === requestId) error.value = cause instanceof Error ? cause.message : 'The beatmap could not be loaded. Please try again.'
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch(() => route.params.id, loadBeatmap, {immediate: true})
onBeforeUnmount(() => {
  requestId++
})
</script>
