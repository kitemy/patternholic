<template>
  <div class="page library-page">
    <header class="page-header library-header">
      <div>
        <p class="eyebrow">The beatmap library</p>
        <h1 class="page-title">Find your next obsession<span>.</span></h1>
        <p class="page-description">Good music. Great patterns. Explore ranked osu!standard beatmaps, one discovery at a
          time.</p>
      </div>
      <span class="library-source"><span class="status-dot"></span> From the osu! library</span>
    </header>

    <form class="search-form" role="search" @submit.prevent="submitSearch">
      <label class="sr-only" for="beatmap-search">Search by song, artist, mapper, or community tag</label>
      <div class="search-field">
        <AppIcon name="search" class="search-icon"/>
        <input id="beatmap-search" v-model="q" class="search-input" type="search" maxlength="200"
               placeholder="A song, an artist, a mapper…" autocomplete="off"/>
      </div>
      <button class="button button-primary search-button" type="submit"><span>Find beatmaps</span>
        <AppIcon name="arrow-right"/>
      </button>
    </form>

    <div class="library-toolbar">
      <div class="library-filters" aria-label="Active library filters">
        <span class="filter-chip"><span class="standard-symbol" aria-hidden="true"></span> osu!standard</span>
        <span class="filter-chip"><AppIcon name="check"/> Ranked only</span>
      </div>
      <div class="library-sort">
        <label for="beatmap-sort">Sort by</label>
        <select id="beatmap-sort" v-model="sort" @change="submitSearch">
          <option value="relevance_desc">Relevance</option>
          <option value="ranked_desc">Recently ranked</option>
          <option value="plays_desc">Most played</option>
          <option value="favourites_desc">Most favourited</option>
          <option value="difficulty_desc">Highest difficulty</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="library-notice" :class="{ 'library-notice--setup': error.code === 'OSU_NOT_CONFIGURED' }"
         role="alert">
      <AppIcon name="info"/>
      <div>
        <h2>{{
            error.code === 'OSU_NOT_CONFIGURED' ? 'The library is waiting to connect.' : 'We couldn’t load those beatmaps.'
          }}</h2>
        <p>{{ error.message }}</p>
      </div>
      <button class="button button-secondary" type="button" :disabled="loading" @click="load(lastRequestWasMore)">
        <AppIcon name="refresh"/>
        Try again
      </button>
    </div>

    <section class="library-results" :aria-busy="loading" aria-label="Beatmap search results">
      <div class="section-heading library-results-heading">
        <h2>{{ currentQuery ? `Results for “${currentQuery}”` : 'Discover ranked beatmaps' }}</h2>
        <p class="result-count" role="status">{{
            loading && !items.length ? 'Searching the library…' : `${items.length} beatmapsets${cursor ? ' · more to explore' : ''}`
          }}</p>
      </div>

      <div v-if="loading && !items.length" class="beatmap-grid" aria-hidden="true">
        <div v-for="index in 6" :key="index" class="beatmap-skeleton">
          <div></div>
          <span></span><span></span></div>
      </div>
      <div v-else-if="items.length" class="beatmap-grid">
        <BeatmapCard v-for="beatmap in items" :key="beatmap.id" :beatmap="beatmap"/>
      </div>
      <div v-else-if="!error" class="empty-state">
        <AppIcon name="search" class="empty-state-icon"/>
        <h2>No ranked standard maps found.</h2>
        <p>Try a different artist or title. You can also search community tags, such as tag="skillset/jumps".</p>
        <button class="button button-secondary" type="button" @click="resetSearch">Browse recently ranked</button>
      </div>

      <div v-if="cursor && !error" class="load-more">
        <button class="button button-secondary" type="button" :disabled="loading" @click="load(true)">
          {{ loading ? 'Loading beatmaps…' : 'Discover more' }}
          <AppIcon name="arrow-right"/>
        </button>
      </div>
    </section>
    <p class="library-footnote">
      <AppIcon name="tag"/>
      Community tags are player-voted characteristics. Select a tag to explore more maps like it.
    </p>
  </div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BeatmapCard from '@/components/BeatmapCard.vue'
import {LibraryError, searchBeatmaps} from '@/lib/beatmaps'
import {useSongPreview} from '@/composables/useSongPreview'
import type {Beatmapset} from '@/types/beatmaps'

const route = useRoute()
const router = useRouter()
const q = ref('')
const sort = ref('relevance_desc')
const currentQuery = ref('')
const currentSort = ref('relevance_desc')
const items = ref<Beatmapset[]>([])
const cursor = ref<string | null>(null)
const loading = ref(false)
const error = ref<LibraryError | null>(null)
const lastRequestWasMore = ref(false)
const sorts = ['relevance_desc', 'ranked_desc', 'plays_desc', 'favourites_desc', 'difficulty_desc']
let controller: AbortController | undefined

async function load(more = false) {
  if (more && (loading.value || !cursor.value)) return
  controller?.abort()
  const request = new AbortController()
  controller = request
  lastRequestWasMore.value = more
  loading.value = true
  error.value = null
  if (!more) {
    items.value = [];
    cursor.value = null;
    useSongPreview().stop()
  }
  try {
    const data = await searchBeatmaps(currentQuery.value, currentSort.value, more ? cursor.value : null, request.signal)
    if (request.signal.aborted) return
    const seen = new Set(items.value.map(item => item.id))
    items.value = [...items.value, ...data.beatmapsets.filter(item => !seen.has(item.id))]
    cursor.value = data.cursor
  } catch (cause) {
    if (!request.signal.aborted) error.value = cause instanceof LibraryError ? cause : new LibraryError('The search could not be completed. Please try again.')
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}

async function submitSearch() {
  const query = q.value.trim()
  if (query === currentQuery.value && sort.value === currentSort.value) {
    await load();
    return
  }
  await router.push({path: '/search', query: {...(query ? {q: query} : {}), sort: sort.value}})
}

function resetSearch() {
  q.value = '';
  sort.value = 'ranked_desc';
  void submitSearch()
}

watch(() => [route.query.q, route.query.sort], () => {
  q.value = typeof route.query.q === 'string' ? route.query.q : ''
  const requestedSort = typeof route.query.sort === 'string' ? route.query.sort : q.value ? 'relevance_desc' : 'ranked_desc'
  sort.value = sorts.includes(requestedSort) ? requestedSort : 'relevance_desc'
  currentQuery.value = q.value.trim()
  currentSort.value = sort.value
  void load()
}, {immediate: true})

onBeforeUnmount(() => {
  controller?.abort();
  useSongPreview().stop()
})
</script>
