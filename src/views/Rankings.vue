<template>
  <div class="page">
    <header class="page-header">
      <p class="eyebrow">Compare the patterns</p>
      <h1 class="page-title">The rankings.</h1>
      <p class="page-description">
        Analyzed beatmaps, ordered by Pattern Abuse Score. A different perspective
        on the maps you play.
      </p>
    </header>

    <div v-if="loading" class="loading-state" role="status">
      <AppIcon name="activity"/>
      <p>Loading the rankings…</p>
    </div>

    <section v-else-if="error" class="empty-state">
      <span class="empty-state-icon"><AppIcon name="chart"/></span>
      <h2>Rankings are unavailable</h2>
      <p class="status-message status-message--error" role="alert">{{ error }}</p>
      <button class="button button-secondary" type="button" @click="loadRankings">Try again</button>
    </section>

    <section v-else-if="items.length" class="section-stack" aria-labelledby="rankings-heading">
      <h2 id="rankings-heading" class="section-heading">{{ items.length }} analyzed
        {{ items.length === 1 ? 'beatmap' : 'beatmaps' }}</h2>
      <div class="table-wrap">
        <table class="data-table" aria-label="Beatmaps ranked by Pattern Abuse Score">
          <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Beatmap ID</th>
            <th scope="col">Difficulty</th>
            <th scope="col">Score / 100</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(item, index) in items" :key="index">
            <td class="muted">{{ String(index + 1).padStart(2, '0') }}</td>
            <td>{{ item.beatmap_id }}</td>
            <td>{{ item.version || 'Untitled difficulty' }}</td>
            <td><span class="score-pill">{{ formatScore(item.score) }}</span></td>
          </tr>
          </tbody>
        </table>
      </div>
      <p class="muted">
        Scores describe pattern characteristics, not map quality or official difficulty.
        <RouterLink to="/about" class="text-link">Read the methodology</RouterLink>
        .
      </p>
    </section>

    <section v-else class="empty-state">
      <span class="empty-state-icon"><AppIcon name="chart"/></span>
      <h2>A fresh leaderboard</h2>
      <p>No analyses have been recorded yet. Find a beatmap to start exploring its patterns.</p>
      <RouterLink to="/search" class="button button-primary">
        Explore beatmaps
        <AppIcon name="arrow-right"/>
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import AppIcon from '@/components/AppIcon.vue'

interface Ranking {
  beatmap_id: number
  version: string | null
  score: number | null
}

const items = ref<Ranking[]>([])
const loading = ref(true)
const error = ref('')

function formatScore(score: number | null) {
  return typeof score === 'number' && Number.isFinite(score)
      ? score.toLocaleString(undefined, {maximumFractionDigits: 2})
      : '—'
}

async function loadRankings() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/rankings')
    if (!response.ok) {
      error.value = 'We could not load the rankings. Please try again in a moment.'
      return
    }
    const data = await response.json()
    if (!Array.isArray(data.items)) {
      error.value = 'We could not load the rankings. Please try again in a moment.'
      return
    }
    items.value = data.items
  } catch {
    error.value = 'We could not load the rankings. Please try again in a moment.'
  } finally {
    loading.value = false
  }
}

onMounted(loadRankings)
</script>
