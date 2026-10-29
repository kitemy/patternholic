<template>
  <div class="page recommendations-page">
    <header class="page-header library-header">
      <div>
        <p class="eyebrow">The discovery workshop</p>
        <h1 class="page-title">
          Familiar patterns. New favourites<span>.</span>
        </h1>
        <p class="page-description">
          Find the common thread in the maps you love. Start with an analyzed
          difficulty and explore what feels similar.
        </p>
      </div>
      <span class="filter-chip"
        ><AppIcon name="activity" /> Work in progress</span
      >
    </header>
    <div class="recommendation-notice">
      <AppIcon name="info" />
      <p>
        <strong>A little discovery, still in the making.</strong> For now,
        matches come from analyses saved on this device. Recommendations across
        the osu! library are coming later.
      </p>
    </div>
    <div v-if="loading" class="loading-state" role="status">
      <AppIcon name="activity" /> Opening your pattern library…
    </div>
    <section v-else-if="error" class="panel empty-state">
      <AppIcon name="info" class="empty-state-icon" />
      <h2>Your library couldn’t be opened.</h2>
      <p role="alert">{{ error }}</p>
      <button class="button button-secondary" @click="load">
        Try again<AppIcon name="refresh" />
      </button>
    </section>
    <template v-else>
      <div class="recommendation-layout">
        <section
          class="panel recommendation-source"
          aria-labelledby="reference-title"
        >
          <p class="eyebrow">01 / Your starting point</p>
          <h2 id="reference-title">A pattern to build on.</h2>
          <p class="field-hint">
            Choose the difficulty you want to find more of.
          </p>
          <template v-if="items.length"
            ><label class="field-label" for="reference-map"
              >Reference difficulty</label
            ><select id="reference-map" v-model.number="refId">
              <option v-for="item in items" :key="item.id" :value="item.id">
                {{ item.metadata.Title || 'Untitled' }} [{{
                  item.metadata.Version || 'Unnamed'
                }}]
              </option>
            </select>
            <div v-if="reference" class="reference-map">
              <AppIcon name="music" />
              <p>{{ reference.metadata.Artist || 'Unknown artist' }}</p>
              <h3>{{ reference.metadata.Title || 'Untitled' }}</h3>
              <span>{{
                reference.metadata.Version || 'Unnamed difficulty'
              }}</span>
              <div class="map-content-labels">
                <span
                  v-for="tag in strongestPatterns(reference.result)"
                  :key="tag"
                  class="filter-chip"
                  >{{ tag }}</span
                >
              </div>
              <RouterLink
                :to="{ path: '/analyze', query: { saved: reference.id } }"
                class="text-link"
                >Open analysis<AppIcon name="arrow-up-right"
              /></RouterLink></div
          ></template>
          <div v-else class="reference-placeholder">
            <AppIcon name="layers" />
            <h3>Your first map starts here.</h3>
            <p>
              Analyze an .osu file or an .osz set to add difficulties to your
              library.
            </p>
          </div>
          <RouterLink
            to="/analyze"
            class="button"
            :class="items.length ? 'button-secondary' : 'button-primary'"
            >{{ items.length ? 'Analyze more maps' : 'Analyze a beatmap'
            }}<AppIcon name="arrow-right"
          /></RouterLink>
          <p class="recommendation-local-note">
            <AppIcon name="lock" /> Your library is saved in this browser.
          </p>
        </section>
        <section class="recommendation-results" aria-labelledby="matches-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">02 / Follow the similarities</p>
              <h2 id="matches-title">Your pattern matches</h2>
            </div>
            <span class="result-count">{{ matches.length }}</span>
          </div>
          <div v-if="!matches.length" class="recommendation-empty">
            <div class="pattern-orbits" aria-hidden="true">
              <span></span><span></span><span></span><AppIcon name="activity" />
            </div>
            <h3>
              {{
                items.length
                  ? 'One more map opens up the possibilities.'
                  : 'Good patterns find good company.'
              }}
            </h3>
            <p>
              {{
                items.length
                  ? 'Add another difficulty analyzed with the same engine to start comparing. An .osz set can bring several at once.'
                  : 'Your matches will appear here once you have at least two analyzed difficulties.'
              }}
            </p>
            <div class="map-content-labels">
              <span class="filter-chip">Jump balance</span
              ><span class="filter-chip">Stream density</span
              ><span class="filter-chip">Rhythm variation</span>
            </div>
          </div>
          <ol v-else class="recommendation-list">
            <li
              v-for="(match, index) in matches"
              :key="match.item.id"
              class="recommendation-card"
            >
              <span class="recommendation-rank">{{
                String(index + 1).padStart(2, '0')
              }}</span>
              <div class="recommendation-map">
                <p>{{ match.item.metadata.Artist || 'Unknown artist' }}</p>
                <h3>
                  <RouterLink
                    :to="{ path: '/analyze', query: { saved: match.item.id } }"
                    >{{ match.item.metadata.Title || 'Untitled'
                    }}<AppIcon name="arrow-up-right"
                  /></RouterLink>
                </h3>
                <span
                  >{{ match.item.metadata.Version || 'Unnamed difficulty' }} ·
                  {{ match.item.metadata.Creator || 'Unknown mapper' }}</span
                >
                <div class="map-content-labels">
                  <span
                    v-for="tag in strongestPatterns(match.item.result)"
                    :key="tag"
                    class="filter-chip"
                    >{{ tag }}</span
                  >
                </div>
              </div>
              <div class="similarity-score">
                <strong
                  >{{ match.similarity.toFixed(1) }}<small>%</small></strong
                ><span>pattern similarity</span
                ><meter
                  min="0"
                  max="100"
                  :value="match.similarity"
                  :aria-label="`${match.similarity.toFixed(1)} percent pattern similarity`"
                />
              </div>
            </li>
          </ol>
        </section>
      </div>
      <section class="recommendation-method">
        <div>
          <p class="eyebrow">What makes a match?</p>
          <h2>Rhythm is the connection.</h2>
          <p>
            These experimental matches compare pattern balance, density,
            repetition, and rhythm variation. Similarity describes a pattern
            profile, not difficulty or how much you’ll enjoy a map.
          </p>
        </div>
        <div class="recommendation-method-grid">
          <div>
            <AppIcon name="layers" />
            <h3>Pattern balance</h3>
            <p>The mix of jumps, streams, and bursts.</p>
          </div>
          <div>
            <AppIcon name="activity" />
            <h3>Rhythmic character</h3>
            <p>How dense, repetitive, and varied the rhythm feels.</p>
          </div>
          <div>
            <AppIcon name="chart" />
            <h3>Room to grow</h3>
            <p>Library-wide discovery is still being developed.</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { loadAnalyses } from '@/lib/storage'
import {
  patternSimilarity,
  recommendationLibrary,
  strongestPatterns,
  type SavedAnalysis
} from '@/lib/recommendations'

const loading = ref(true),
  error = ref('')
const items = ref<SavedAnalysis[]>([])
const refId = ref<number | null>(null)
const reference = computed(() =>
  items.value.find((item) => item.id === refId.value)
)
const matches = computed(() => {
  const source = reference.value
  if (!source) return []
  return items.value
    .filter(
      (item) =>
        item.id !== source.id &&
        item.result.algorithmVersion === source.result.algorithmVersion &&
        (item.engine || 'patternholic') === (source.engine || 'patternholic')
    )
    .map((item) => ({
      item,
      similarity: patternSimilarity(source.result, item.result)
    }))
    .sort((a, b) => b.similarity - a.similarity)
})
async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = recommendationLibrary(await loadAnalyses())
    refId.value = items.value[0]?.id ?? null
  } catch {
    error.value =
      'Browser storage is unavailable. Allow site storage and try again.'
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
