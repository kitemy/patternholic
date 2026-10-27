<template>
  <div class="page">
    <header class="page-header">
      <p class="eyebrow">The pattern breakdown</p>
      <h1 class="page-title">Your analysis.</h1>
      <p class="page-description">
        A closer look at the rhythm and movement inside your beatmap.
      </p>
    </header>

    <p v-if="error" class="status-message status-message--error" role="alert">{{ error }}</p>

    <template v-if="result">
      <div class="analysis-layout">
        <section class="panel score-panel" aria-labelledby="score-heading">
          <h2 id="score-heading" class="eyebrow">Pattern Abuse Score</h2>
          <p class="score-value">
            {{ formatNumber(result.score) }}<span class="score-scale"> / 100</span>
          </p>
          <p class="muted">A weighted pattern heuristic, not an official difficulty rating.</p>
          <RouterLink to="/about" class="text-link">
            Understand the score
            <AppIcon name="arrow-up-right"/>
          </RouterLink>
          <p class="muted">Algorithm {{ result.algorithmVersion }}</p>
        </section>

        <section class="section-stack" aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" class="section-heading">At a glance</h2>
          <dl class="metric-grid">
            <div v-for="metric in metricDefinitions" :key="metric.key" class="metric-card">
              <dt class="metric-label">{{ metric.label }}</dt>
              <dd class="metric-value">
                {{ formatNumber(result.metrics[metric.key]) }}
                <span v-if="metric.unit" class="metric-unit">{{ metric.unit }}</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section class="panel section-stack" aria-labelledby="events-heading">
        <div>
          <p class="eyebrow">On the timeline</p>
          <h2 id="events-heading" class="section-heading">Detected events <span class="muted">({{
              result.events.length
            }})</span></h2>
        </div>
        <ol v-if="result.events.length" class="event-list">
          <li v-for="(event, index) in result.events.slice(0, 50)" :key="index" class="event-row">
            <span>{{ eventLabels[event.type] || event.type }}</span>
            <span class="muted">{{ formatTime(event.startTime) }} – {{ formatTime(event.endTime) }}</span>
          </li>
        </ol>
        <p v-else class="muted">No jumps, streams, or bursts were detected in this file.</p>
        <p v-if="result.events.length > 50" class="muted">
          Showing the first 50 of {{ result.events.length }} events.
        </p>
      </section>

      <section v-if="result.warnings.length" class="panel section-stack" aria-labelledby="warnings-heading">
        <h2 id="warnings-heading" class="section-heading">Analysis notes</h2>
        <ul class="detail-list">
          <li v-for="(warning, index) in result.warnings" :key="index">{{ warning }}</li>
        </ul>
      </section>
    </template>

    <section v-else class="empty-state">
      <span class="empty-state-icon"><AppIcon name="activity"/></span>
      <h2>No analysis loaded yet</h2>
      <p>Choose a beatmap and analyze its .osu file. Your score and pattern breakdown will appear here.</p>
      <RouterLink to="/search" class="button button-primary">
        Find a beatmap
        <AppIcon name="arrow-right"/>
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type {AnalysisMetrics, AnalysisResult} from '@/lib/analysis'

const result = ref<AnalysisResult | null>(null)
const error = ref('')
const metricDefinitions: { key: keyof AnalysisMetrics; label: string; unit: string }[] = [
  {key: 'jumpCount', label: 'Jumps', unit: ''},
  {key: 'streamCount', label: 'Streams', unit: ''},
  {key: 'burstCount', label: 'Bursts', unit: ''},
  {key: 'densityPeak', label: 'Peak density', unit: 'objects/s'},
  {key: 'repetitionScore', label: 'Repetition', unit: '%'},
  {key: 'timingIntensity', label: 'Timing intensity', unit: 'objects/s'},
  {key: 'irregularity', label: 'Irregularity', unit: '%'},
]
const eventLabels: Record<string, string> = {jump: 'Jump', stream: 'Stream', burst: 'Burst'}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {maximumFractionDigits: 2})
}

function formatTime(milliseconds: number) {
  const centiseconds = Math.round(milliseconds / 10)
  const minutes = Math.floor(centiseconds / 6000)
  const seconds = ((centiseconds % 6000) / 100).toFixed(2).padStart(5, '0')
  return `${minutes}:${seconds}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAnalysis(value: unknown): value is AnalysisResult {
  if (!isRecord(value) || !isRecord(value.metrics)) return false
  const metrics = value.metrics
  return (
      typeof value.score === 'number' && Number.isFinite(value.score) &&
      typeof value.algorithmVersion === 'string' &&
      metricDefinitions.every(({key}) => typeof metrics[key] === 'number' && Number.isFinite(metrics[key])) &&
      Array.isArray(value.events) && value.events.every((event) =>
          isRecord(event) && typeof event.type === 'string' &&
          typeof event.startIndex === 'number' && Number.isFinite(event.startIndex) &&
          typeof event.endIndex === 'number' && Number.isFinite(event.endIndex) &&
          typeof event.value === 'number' && Number.isFinite(event.value) &&
          typeof event.startTime === 'number' && Number.isFinite(event.startTime) &&
          typeof event.endTime === 'number' && Number.isFinite(event.endTime),
      ) &&
      Array.isArray(value.warnings) && value.warnings.every((warning) => typeof warning === 'string')
  )
}

onMounted(() => {
  try {
    const saved = sessionStorage.getItem('lastAnalysis')
    if (!saved) return
    const parsed: unknown = JSON.parse(saved)
    if (!isAnalysis(parsed)) {
      error.value = 'Your saved analysis could not be loaded. Please analyze a beatmap again.'
      return
    }
    result.value = parsed
  } catch {
    error.value = 'Your saved analysis could not be loaded. Please analyze a beatmap again.'
  }
})
</script>
