<template>
  <div class="page">
    <header class="page-header">
      <p class="eyebrow">Behind the numbers</p>
      <h1 class="page-title">A closer look at every pattern.</h1>
      <p class="page-description">
        Explore ranked osu!standard beatmaps and player-voted community tags.
        Pattern analysis is in development; the methodology below describes the current prototype.
      </p>
    </header>

    <section class="panel prose" aria-labelledby="score-heading">
      <p class="eyebrow">The Pattern Abuse Score</p>
      <h2 id="score-heading" class="section-heading">Seven signals. One starting point.</h2>
      <p>
        The prototype calculates a score from 0 to 100 using seven weighted
        pattern metrics. A higher score means these signals are more pronounced.
        It does not tell you whether a map is good, bad, or enjoyable to play.
      </p>
      <p class="muted">
        This is an experimental heuristic for osu!standard, not an official osu!
        rating or a replacement for star difficulty. Algorithm version {{ ALGORITHM_VERSION }}.
      </p>
    </section>

    <section class="section-stack" aria-labelledby="metrics-heading">
      <div>
        <p class="eyebrow">The methodology</p>
        <h2 id="metrics-heading" class="section-heading">What goes into a score</h2>
      </div>
      <div class="methodology-grid">
        <article v-for="metric in methodology" :key="metric.name" class="methodology-item">
          <p class="eyebrow">{{ metric.weight }}% weight</p>
          <h3>{{ metric.name }}</h3>
          <p class="muted">{{ metric.description }}</p>
        </article>
      </div>
    </section>

    <section class="panel prose" aria-labelledby="reading-heading">
      <h2 id="reading-heading" class="section-heading">Read the breakdown, not just the score.</h2>
      <p>
        Counts and density are normalized before weighting; repetition and
        irregularity are expressed as percentages. Detected events show where
        jumps, streams, and bursts occur, so you can put the numbers in context.
      </p>
      <p>
        Search for a beatmap and choose a difficulty to explore its metadata and
        community tags. The pattern workspace will display analysis once the analyzer is ready.
      </p>
      <RouterLink to="/search" class="text-link">
        Find a beatmap
        <AppIcon name="arrow-right"/>
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import {ALGORITHM_VERSION} from '@/lib/analysis'

const methodology = [
  {
    name: 'Jumps',
    weight: 18,
    description: 'Consecutive hit objects at least 120 osu! pixels apart and no more than 150 ms apart.',
  },
  {
    name: 'Streams',
    weight: 18,
    description: 'Runs of at least five hit objects with closely spaced timing, using intervals of 40–125 ms.',
  },
  {
    name: 'Bursts',
    weight: 14,
    description: 'Short, dense groups of at least four hit objects within a 300 ms window.',
  },
  {
    name: 'Peak density',
    weight: 14,
    description: 'The highest number of hit objects found in any one-second window.',
  },
  {
    name: 'Repetition',
    weight: 12,
    description: 'Repeated combinations of horizontal movement, vertical movement, and timing between objects.',
  },
  {
    name: 'Timing intensity',
    weight: 12,
    description: 'The inverse of the average interval between hit objects. Shorter intervals produce a higher value.',
  },
  {
    name: 'Irregularity',
    weight: 12,
    description: 'Variation in the time between hit objects, measured relative to the average interval.',
  },
]
</script>
