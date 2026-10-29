<template>
  <div class="page analyzer-page">
    <header class="page-header library-header">
      <div>
        <p class="eyebrow">The pattern workshop</p>
        <h1 class="page-title">A closer look at your map<span>.</span></h1>
        <p class="page-description">
          Unpack the rhythm. Explore every difficulty, see the patterns, and
          find what makes a beatmap move.
        </p>
      </div>
      <span class="library-source"
        ><span class="status-dot"></span> Files stay in your browser</span
      >
    </header>
    <section
      v-if="!imported"
      class="analyzer-input panel"
      aria-labelledby="import-title"
    >
      <div class="import-heading">
        <div>
          <p class="eyebrow">01 / Bring a beatmap</p>
          <h2 id="import-title">Start with a song. Or a whole set.</h2>
        </div>
        <div class="input-modes" role="group" aria-label="Input method">
          <button
            type="button"
            :aria-pressed="inputMode === 'file'"
            @click="inputMode = 'file'"
          >
            Upload a file</button
          ><button
            type="button"
            :aria-pressed="inputMode === 'paste'"
            @click="inputMode = 'paste'"
          >
            Paste .osu
          </button>
        </div>
      </div>
      <div
        v-if="inputMode === 'file'"
        class="import-dropzone"
        :class="{ 'is-dragging': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <span class="import-icon"><AppIcon name="layers" /></span>
        <h3>Drop your beatmap here</h3>
        <p>
          A complete <strong>.osz</strong> set or a single
          <strong>.osu</strong> difficulty.
        </p>
        <label class="button button-primary import-file-button"
          >Choose a file<input
            type="file"
            accept=".osu,.osz"
            aria-label="Choose an .osu or .osz file"
            :disabled="busy"
            @change="onFile" /><AppIcon name="arrow-up-right"
        /></label>
        <span class="field-hint">Up to 100 MB · osu!standard analysis</span>
      </div>
      <form v-else class="paste-form" @submit.prevent="runPaste">
        <label class="field-label" for="osu-content"
          >Beatmap file contents</label
        ><textarea
          id="osu-content"
          v-model="pastedText"
          class="code-input"
          rows="7"
          placeholder="osu file format v14…"
          :disabled="busy"
          spellcheck="false"
        />
        <div class="form-actions">
          <p class="field-hint">Copy the complete contents of an .osu file.</p>
          <button
            class="button button-primary"
            :disabled="busy || !pastedText.trim()"
          >
            Analyze difficulty<AppIcon name="arrow-right" />
          </button>
        </div>
      </form>
      <div class="import-benefits">
        <span><AppIcon name="layers" /> Every difficulty, one upload</span
        ><span><AppIcon name="play" /> Artwork & audio from your set</span
        ><span><AppIcon name="chart" /> Results saved on this device</span>
      </div>
    </section>
    <p v-if="error" class="status-message status-message--error" role="alert">
      {{ error }}
    </p>
    <div v-if="busy" class="analysis-progress" role="status" aria-live="polite">
      <AppIcon name="activity" /><span>{{ progressLabel }}</span
      ><progress
        :value="completed"
        :max="entries.length || 1"
        aria-label="Analysis progress"
      />
    </div>
    <p v-if="saveError" class="status-message" role="status">{{ saveError }}</p>
    <template v-if="selected && imported">
      <div class="analysis-results-heading">
        <div>
          <p class="eyebrow">02 / Inside the beatmap</p>
          <h2>Your pattern breakdown</h2>
        </div>
        <div class="map-content-labels">
          <span class="badge"
            >{{ completeCount }} / {{ entries.length }} analyzed</span
          ><button
            class="button button-secondary"
            type="button"
            :disabled="busy"
            @click="reset"
          >
            Analyze another file<AppIcon name="file" />
          </button>
        </div>
      </div>
      <header class="beatmap-hero analyzer-hero">
        <BeatmapCover
          :src="selected.coverUrl || remoteSet?.coverUrl || null"
          eager
        />
        <div class="beatmap-hero-content">
          <div class="beatmap-hero-labels">
            <span class="filter-chip"
              ><AppIcon name="file" />{{
                imported.name.toLowerCase().endsWith('.osz')
                  ? 'Beatmap set'
                  : 'Local difficulty'
              }}</span
            ><span class="filter-chip"
              >{{ entries.length }}
              {{ entries.length === 1 ? 'difficulty' : 'difficulties' }}</span
            ><span v-if="remoteSet?.explicit" class="explicit-badge"
              >Explicit</span
            >
          </div>
          <p class="beatmap-artist">
            {{ selected.map?.metadata.Artist || 'Unknown artist' }}
          </p>
          <h2>{{ selected.map?.metadata.Title || imported.name }}</h2>
          <p class="beatmap-byline">
            Mapped by
            <strong>{{
              selected.map?.metadata.Creator || 'Unknown mapper'
            }}</strong>
          </p>
          <div class="beatmap-actions--expanded map-content-labels">
            <button
              v-if="selected.audioUrl || remoteSet?.previewUrl"
              class="button button-primary"
              type="button"
              @click="toggleSong"
            >
              <AppIcon
                :name="song.activeId.value === -1 ? 'pause' : 'play'"
              />{{
                song.activeId.value === -1 ? 'Pause song' : 'Preview song'
              }}</button
            ><a
              v-if="setId"
              class="button button-secondary"
              :href="`https://osu.ppy.sh/beatmapsets/${setId}`"
              target="_blank"
              rel="noopener noreferrer"
              >View on osu!<AppIcon name="arrow-up-right"
            /></a>
          </div>
          <p
            v-if="song.failure.value?.id === -1"
            class="field-hint"
            role="status"
          >
            {{ song.failure.value.message }}
          </p>
        </div>
      </header>
      <div class="beatmap-detail-layout analyzer-detail-layout">
        <aside class="difficulty-sidebar" aria-labelledby="difficulties-title">
          <div class="section-heading">
            <h2 id="difficulties-title">Difficulties</h2>
            <span class="result-count">{{ entries.length }}</span>
          </div>
          <div
            class="difficulty-options"
            role="group"
            aria-label="Choose a difficulty"
          >
            <button
              v-for="(entry, index) in entries"
              :key="entry.filename"
              class="difficulty-option analysis-difficulty"
              :class="{ 'is-selected': selectedIndex === index }"
              :aria-pressed="selectedIndex === index"
              type="button"
              @click="selectDifficulty(index)"
            >
              <span class="difficulty-ring" aria-hidden="true" /><span
                class="difficulty-option-name"
                >{{ entry.map?.metadata.Version || entry.filename
                }}<small>{{ statusLabel(entry) }}</small></span
              ><AppIcon
                v-if="entry.status === 'complete'"
                name="check"
              /><AppIcon
                v-else-if="entry.status === 'analyzing'"
                name="activity"
              />
            </button>
          </div>
          <p class="analysis-sidebar-note">
            Choose a difficulty to view its own preview and results.
          </p>
          <RouterLink to="/recommendations" class="text-link"
            >Find similar patterns<AppIcon name="arrow-right"
          /></RouterLink>
        </aside>
        <div class="beatmap-detail-main analysis-main">
          <section
            v-if="selected.map"
            class="difficulty-overview"
            aria-labelledby="difficulty-title"
          >
            <p class="eyebrow">Inside the difficulty</p>
            <div class="difficulty-overview-heading">
              <h2 id="difficulty-title">
                {{ selected.map.metadata.Version || 'Untitled difficulty' }}
              </h2>
              <span class="badge">{{ modeName(selected.map.mode) }}</span>
            </div>
            <dl class="map-stats">
              <div v-for="stat in mapStats" :key="stat.label">
                <dt>{{ stat.label }}</dt>
                <dd>{{ stat.value }}</dd>
              </div>
            </dl>
            <div class="map-object-stats">
              <span
                >{{ selected.map.hitObjects.length.toLocaleString() }} hit
                objects</span
              ><span>{{ selected.filename }}</span>
            </div>
          </section>
          <p
            v-if="selected.error"
            class="status-message status-message--error"
            role="alert"
          >
            {{ selected.error }}
          </p>
          <template v-if="selected.result">
            <section class="analysis-score-strip" aria-label="Analysis summary">
              <div class="analysis-primary-score">
                <p class="eyebrow">Pattern score</p>
                <p>
                  {{ formatNumber(selected.result.score) }}<small>/ 100</small>
                </p>
                <span>Weighted pattern heuristic</span>
              </div>
              <div>
                <p class="eyebrow">Pattern abuse score</p>
                <strong
                  >{{ selected.result.abuseScore }}<small>/ 100</small></strong
                >
                <p class="field-hint">Repetition, density & timing.</p>
              </div>
              <div>
                <p class="eyebrow">Detected events</p>
                <strong>{{
                  selected.result.events.length.toLocaleString()
                }}</strong>
                <p class="field-hint">Explore the timeline below.</p>
              </div>
            </section>
            <section
              class="analysis-metrics-section"
              aria-labelledby="metrics-title"
            >
              <div class="section-heading">
                <h3 id="metrics-title">Pattern profile</h3>
                <span class="field-hint">For this difficulty</span>
              </div>
              <dl class="analysis-metric-grid">
                <div v-for="metric in metrics" :key="metric.key">
                  <dt>{{ metric.label }}</dt>
                  <dd>
                    {{ formatNumber(selected.result.metrics[metric.key])
                    }}<small v-if="metric.unit">{{ metric.unit }}</small>
                  </dd>
                </div>
              </dl>
              <details class="analysis-extra">
                <summary>More pattern metrics</summary>
                <dl class="analysis-metric-grid">
                  <div v-for="metric in extraMetrics" :key="metric.key">
                    <dt>{{ metric.label }}</dt>
                    <dd>
                      {{ formatNumber(selected.result.metrics[metric.key]) }}
                    </dd>
                  </div>
                </dl>
              </details>
            </section>
            <p class="analysis-disclaimer">
              <AppIcon name="info" />Patternholic heuristic v{{
                selected.result.algorithmVersion
              }}. Experimental, not an official osu! rating.
            </p>
            <p
              v-for="warning in selected.result.warnings"
              :key="warning"
              class="status-message"
            >
              {{ warning }}
            </p>
          </template>
          <MapPreview
            v-if="selected.map?.mode === 0"
            :key="`${imported.name}-${selectedIndex}-${generation}`"
            ref="preview"
            :map="selected.map"
            :audio-url="selected.audioUrl"
            :cover-url="selected.coverUrl || remoteSet?.coverUrl || null"
          />
          <section
            v-if="selected.result"
            class="panel pattern-events"
            aria-labelledby="events-title"
          >
            <div class="section-heading">
              <div>
                <p class="eyebrow">Follow the pattern</p>
                <h3 id="events-title">Event timeline</h3>
              </div>
              <span class="badge"
                >{{ selected.result.events.length }} events</span
              >
            </div>
            <p class="field-hint">
              Select an event to jump to that moment in the preview.
            </p>
            <div v-if="events.length" class="analysis-event-list">
              <button
                v-for="(event, index) in events.slice(0, eventLimit)"
                :key="index"
                type="button"
                @click="preview?.seekTo(event.startTime)"
              >
                <span class="event-type">{{
                  event.type.replace(/-/g, ' ')
                }}</span
                ><span
                  >{{ formatLength(event.startTime / 1000) }} –
                  {{ formatLength(event.endTime / 1000) }}</span
                ><AppIcon name="play" />
              </button>
            </div>
            <p v-else class="analysis-sidebar-note">
              No pattern events were detected in this difficulty.
            </p>
            <button
              v-if="events.length > eventLimit"
              class="button button-secondary"
              @click="eventLimit += 100"
            >
              Show more events
            </button>
          </section>
        </div>
      </div>
    </template>
    <div v-else-if="!busy" class="analyzer-guide">
      <div>
        <span>01</span>
        <h3>Bring your beatmap</h3>
        <p>Drop a set or paste a difficulty. Everything is read locally.</p>
      </div>
      <div>
        <span>02</span>
        <h3>Look inside the rhythm</h3>
        <p>
          Browse difficulties, preview objects, and explore detected patterns.
        </p>
      </div>
      <div>
        <span>03</span>
        <h3>Connect the patterns</h3>
        <p>Compare saved analyses in the recommendations workshop.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BeatmapCover from '@/components/BeatmapCover.vue'
import MapPreview from '@/components/MapPreview.vue'
import {
  importBeatmapFile,
  importDifficulty,
  type ImportedDifficulty,
  type ImportedSet
} from '@/lib/beatmapImport'
import { formatLength, formatNumber, getBeatmap } from '@/lib/beatmaps'
import { loadAnalyses, saveAnalysis } from '@/lib/storage'
import { recommendationLibrary } from '@/lib/recommendations'
import type { AnalysisMetrics, AnalysisResult } from '@/lib/analysis'
import type { Beatmapset } from '@/types/beatmaps'
import { useSongPreview } from '@/composables/useSongPreview'

const route = useRoute()
const inputMode = ref<'file' | 'paste'>('file')
const pastedText = ref(''),
  error = ref(''),
  saveError = ref(''),
  busy = ref(false),
  dragging = ref(false)
const imported = shallowRef<ImportedSet | null>(null)
const entries = ref<ImportedDifficulty[]>([])
const selectedIndex = ref(0),
  eventLimit = ref(100),
  generation = ref(0)
const remoteSet = shallowRef<Beatmapset | null>(null)
const preview = ref<InstanceType<typeof MapPreview> | null>(null)
const song = useSongPreview()
let worker: Worker | null = null
let cancelAnalysis: (() => void) | null = null
const selected = computed(() => entries.value[selectedIndex.value])
const completed = computed(
  () =>
    entries.value.filter(
      (entry) => !['queued', 'analyzing'].includes(entry.status)
    ).length
)
const completeCount = computed(
  () => entries.value.filter((entry) => entry.status === 'complete').length
)
const progressLabel = computed(() =>
  entries.value.length
    ? `Analyzing difficulties · ${completed.value} of ${entries.value.length} processed`
    : 'Opening your beatmap…'
)
const events = computed(() =>
  [...(selected.value?.result?.events ?? [])].sort(
    (a, b) => a.startTime - b.startTime
  )
)
const setId = computed(() => {
  const id = Number(selected.value?.map?.metadata.BeatmapSetID)
  return Number.isSafeInteger(id) && id > 0 ? id : null
})
type Metric = { key: keyof AnalysisMetrics; label: string; unit?: string }
const metrics: Metric[] = [
  { key: 'jumpCount', label: 'Jumps' },
  { key: 'streamCount', label: 'Streams' },
  { key: 'burstCount', label: 'Bursts' },
  { key: 'densityPeak', label: 'Peak density', unit: 'obj/s' },
  { key: 'repetitionScore', label: 'Repetition', unit: '%' },
  { key: 'irregularity', label: 'Rhythm variation', unit: '%' }
]
const extraMetrics: Metric[] = [
  { key: 'doubleCount', label: 'Doubles' },
  { key: 'tripleCount', label: 'Triples' },
  { key: 'quadCount', label: 'Quads' },
  { key: 'deathstreamCount', label: 'Deathstreams' },
  { key: 'wideJumpCount', label: 'Wide jumps' },
  { key: 'spacedStreamCount', label: 'Spaced streams' },
  { key: 'kickSliderCount', label: 'Kick sliders' },
  { key: 'buzzSliderCount', label: 'Buzz sliders' },
  { key: 'snapAimCount', label: 'Snap aim' },
  { key: 'flowAimCount', label: 'Flow aim' },
  { key: 'timingIntensity', label: 'Timing intensity' }
]
const mapStats = computed(() => {
  const map = selected.value?.map
  if (!map) return []
  const timing = map.timingPoints.find(
    (point) => point.uninherited && point.beatLength > 0
  )
  return [
    {
      label: 'Length',
      value: formatLength((map.hitObjects.at(-1)?.time ?? 0) / 1000)
    },
    {
      label: 'BPM',
      value: timing ? formatNumber(60000 / timing.beatLength) : '—'
    },
    ...[
      ['Circle size', 'CircleSize'],
      ['Approach rate', 'ApproachRate'],
      ['Accuracy', 'OverallDifficulty'],
      ['HP drain', 'HPDrainRate']
    ].map(([label, key]) => ({ label, value: map.difficulty[key] || '—' }))
  ]
})
function modeName(mode: number) {
  return (
    ['osu!standard', 'osu!taiko', 'osu!catch', 'osu!mania'][mode] ||
    'Unknown ruleset'
  )
}
function statusLabel(entry: ImportedDifficulty) {
  return {
    queued: 'Waiting for analysis',
    analyzing: 'Analyzing…',
    complete: 'Analysis complete',
    unsupported: 'Unsupported ruleset',
    error: 'Could not analyze'
  }[entry.status]
}
function selectDifficulty(index: number) {
  song.stop()
  selectedIndex.value = index
  eventLimit.value = 100
}
function toggleSong() {
  preview.value?.pause()
  void song.toggle(
    -1,
    selected.value.audioUrl || remoteSet.value?.previewUrl || null
  )
}
function reset() {
  generation.value++
  cancelAnalysis?.()
  worker?.terminate()
  worker = null
  song.stop()
  imported.value?.dispose()
  imported.value = null
  entries.value = []
  selectedIndex.value = 0
  remoteSet.value = null
  error.value = ''
  saveError.value = ''
  eventLimit.value = 100
}
async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await openFile(file)
}
async function onDrop(event: DragEvent) {
  dragging.value = false
  if (busy.value) return
  const files = event.dataTransfer?.files
  if (files?.length !== 1) {
    error.value = 'Please choose one .osz set or .osu difficulty at a time.'
    return
  }
  await openFile(files[0])
}
async function openFile(file: File) {
  reset()
  busy.value = true
  const current = generation.value
  try {
    const set = await importBeatmapFile(file)
    if (current !== generation.value) {
      set.dispose()
      return
    }
    await analyzeSet(set, current)
  } catch (cause) {
    if (current === generation.value)
      error.value =
        cause instanceof Error ? cause.message : 'The file could not be opened.'
  } finally {
    if (current === generation.value) busy.value = false
  }
}
async function runPaste() {
  reset()
  busy.value = true
  const current = generation.value
  try {
    await analyzeSet(
      {
        name: 'Pasted difficulty.osu',
        difficulties: [
          importDifficulty(pastedText.value, 'Pasted difficulty.osu')
        ],
        dispose: () => {}
      },
      current
    )
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Analysis failed.'
  } finally {
    if (current === generation.value) busy.value = false
  }
}
async function analyzeSet(set: ImportedSet, current: number) {
  imported.value = set
  entries.value = set.difficulties
  selectedIndex.value = Math.max(
    0,
    entries.value.findIndex((entry) => entry.status === 'queued')
  )
  const pending = entries.value
    .map((entry, id) => ({ entry, id }))
    .filter(({ entry }) => entry.status === 'queued')
  if (!pending.length) return
  for (const { entry, id } of pending) {
    if (current !== generation.value) return
    entry.status = 'analyzing'
    try {
      worker = new Worker(
        new URL('../lib/analysis.worker.ts', import.meta.url),
        { type: 'module' }
      )
      const activeWorker = worker
      const result = await new Promise<AnalysisResult>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer)
          activeWorker.terminate()
          if (worker === activeWorker) worker = null
          cancelAnalysis = null
        }
        const timer = setTimeout(() => {
          cleanup()
          reject(new Error('This difficulty took too long to analyze.'))
        }, 30_000)
        cancelAnalysis = () => {
          cleanup()
          reject(new Error('Analysis cancelled.'))
        }
        activeWorker.onmessage = (event) => {
          if (event.data.id !== id) return
          cleanup()
          event.data.error
            ? reject(new Error(event.data.error))
            : resolve(event.data.result)
        }
        activeWorker.onerror = () => {
          cleanup()
          reject(
            new Error(
              'The analysis worker could not run. Please reload and try again.'
            )
          )
        }
        activeWorker.postMessage({ id, map: toRaw(entry.map) })
      })
      if (current !== generation.value) return
      entry.result = result
      entry.status = 'complete'
      try {
        await saveAnalysis({
          text: entry.text,
          result,
          metadata: entry.map!.metadata,
          engine: 'patternholic',
          mode: entry.map!.mode
        })
      } catch {
        saveError.value =
          'Results are ready, but browser storage is unavailable. These analyses could not be saved for recommendations.'
      }
      try {
        sessionStorage.setItem('lastAnalysis', JSON.stringify(result))
      } catch {
        /* Results remain usable without session storage. */
      }
    } catch (cause) {
      if (current !== generation.value) return
      entry.status = 'error'
      entry.error = cause instanceof Error ? cause.message : 'Analysis failed.'
    }
  }
}
watch([setId, generation], async ([id]) => {
  remoteSet.value = null
  if (!id) return
  const current = generation.value
  try {
    const set = await getBeatmap(id)
    if (current === generation.value && setId.value === id)
      remoteSet.value = set
  } catch {
    /* Local artwork and metadata support offline imports. */
  }
})
watch(
  () => route.query.saved,
  async (id) => {
    if (typeof id !== 'string' || !/^\d+$/.test(id)) return
    const current = generation.value
    try {
      const record = (await loadAnalyses()).find((item) => String(item.id) === id)
      const saved = record ? recommendationLibrary([record])[0] : undefined
      if (current !== generation.value) return
      if (!saved?.text) {
        error.value = 'This saved analysis is no longer available.'
        return
      }
      reset()
      const entry = importDifficulty(
        saved.text,
        `${saved.metadata.Version || 'Saved difficulty'}.osu`
      )
      if (entry.status === 'queued') {
        entry.result = saved.result
        entry.status = 'complete'
      }
      imported.value = {
        name: entry.filename,
        difficulties: [entry],
        dispose: () => {}
      }
      entries.value = [entry]
    } catch (cause) {
      error.value =
        cause instanceof Error
          ? cause.message
          : 'The saved analysis could not be loaded.'
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  generation.value++
  cancelAnalysis?.()
  worker?.terminate()
  song.stop()
  imported.value?.dispose()
})
</script>
