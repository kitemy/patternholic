<template>
  <div class="home-page">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="status-dot"></span> The osu! pattern explorer</p>
        <h1 id="hero-title">Every beatmap.<br/>A different <span>rhythm.</span></h1>
        <p class="hero-description">
          Go beyond the star rating. Discover beatmaps, unpack their patterns,
          and see what makes each one feel different.
        </p>
        <a class="text-link hero-link" href="#explore">Find your next beatmap
          <AppIcon name="arrow-right"/>
        </a>
      </div>
      <figure class="pattern-study" aria-label="Illustration of a tilted star jump pattern with five connected hit circles">
        <div class="study-heading">
          <span>Pattern study</span>
          <span class="study-index">001 / JUMPS</span>
        </div>
        <svg class="pattern-canvas" viewBox="0 0 480 285" fill="none" aria-hidden="true">
          <defs>
            <pattern id="playfield-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="currentColor" opacity="0.22"/>
            </pattern>
          </defs>
          <rect x="0" y="0" width="480" height="285" fill="url(#playfield-grid)"/>
          <path class="pattern-trail" d="M256 31 293 241 139 93 350 123 162 223 256 31"/>
          <g class="hit-circle hit-circle--faded">
            <circle cx="256" cy="31" r="25"/>
            <text x="256" y="31">1</text>
          </g>
          <g class="hit-circle hit-circle--faded">
            <circle cx="293" cy="241" r="25"/>
            <text x="293" y="241">2</text>
          </g>
          <g class="hit-circle">
            <circle cx="139" cy="93" r="25"/>
            <text x="139" y="93">3</text>
          </g>
          <circle class="approach-circle" cx="350" cy="123" r="43"/>
          <g class="hit-circle hit-circle--active">
            <circle cx="350" cy="123" r="25"/>
            <text x="350" y="123">4</text>
          </g>
          <g class="hit-circle">
            <circle cx="162" cy="223" r="25"/>
            <text x="162" y="223">5</text>
          </g>
        </svg>
        <figcaption class="study-caption">
          <span><span class="legend-dot"></span> Distance. Timing. Repetition.</span>
          <span>Read between the beats.</span>
        </figcaption>
      </figure>
    </section>
    <section id="explore" class="explore-section" aria-labelledby="explore-title">
      <div class="explore-heading">
        <h2 id="explore-title">Start with a beatmap</h2>
        <span class="muted">Your next discovery is a search away.</span>
      </div>
      <form class="search-form home-search" role="search" @submit.prevent="go()">
        <div class="search-field">
          <AppIcon class="search-icon" name="search"/>
          <label class="sr-only" for="home-search">Search by title, artist, or mapper</label>
          <input id="home-search" v-model="q" class="search-input" type="search"
                 placeholder="Search by title, artist, or mapper…" autocomplete="off"/>
        </div>
        <button class="button button-primary search-button" type="submit" :disabled="!q.trim()">
          Explore beatmaps
          <AppIcon name="arrow-right"/>
        </button>
      </form>
      <div class="search-suggestions">
        <span>A place to start</span>
        <button v-for="artist in suggestedArtists" :key="artist" type="button" @click="go(artist)">
          {{ artist }}
          <AppIcon name="arrow-up-right"/>
        </button>
      </div>
    </section>
    <section class="workflow-section" aria-labelledby="workflow-title">
      <div class="section-heading">
        <h2 id="workflow-title">A little more insight. Every play.</h2>
        <RouterLink class="text-link" to="/about">Inside the analysis
          <AppIcon name="arrow-up-right"/>
        </RouterLink>
      </div>
      <div class="workflow-grid">
        <article v-for="step in steps" :key="step.number" class="workflow-step">
          <div class="step-heading">
            <AppIcon :name="step.icon"/>
            <span>{{ step.number }}</span></div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
        </article>
      </div>
    </section>
    <aside class="method-note">
      <AppIcon name="info"/>
      <p>A pattern score, with context. Our 0–100 heuristic helps explain a map’s patterns; it isn’t an official osu!
        rating.</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const q = ref('')
const router = useRouter()
const suggestedArtists = ['Camellia', 'xi', 'Foreground Eclipse']
const steps = [
  {
    number: '01',
    icon: 'search',
    title: 'Find your map',
    description: 'Explore the osu! beatmap library by song, artist, or the mappers you love.'
  },
  {
    number: '02',
    icon: 'activity',
    title: 'Explore every difficulty',
    description: 'See star ratings, timing, and player-voted community tags in one place.'
  },
  {
    number: '03',
    icon: 'chart',
    title: 'A deeper breakdown, soon',
    description: 'Pattern scores and rhythm timelines are in development. Your map’s workspace is ready.'
  },
] as const

function go(query = q.value) {
  const trimmedQuery = query.trim()
  if (trimmedQuery) router.push({path: '/search', query: {q: trimmedQuery}})
}
</script>
