<template>
  <div class="app">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="site-header">
      <nav class="site-nav container" aria-label="Main navigation">
        <RouterLink to="/" class="brand" aria-label="Patternholic home">
          <svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M8 23V9l16 14V9" stroke="currentColor" stroke-width="2"/>
            <circle cx="8" cy="9" r="4" fill="currentColor"/>
            <circle cx="24" cy="23" r="4" fill="currentColor"/>
            <circle cx="8" cy="23" r="3" fill="var(--color-bg)" stroke="currentColor" stroke-width="2"/>
            <circle cx="24" cy="9" r="3" fill="var(--color-bg)" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>patternholic<span class="brand-period">.</span></span>
        </RouterLink>
        <div class="nav-links">
          <RouterLink to="/search">Explore</RouterLink>
          <RouterLink to="/rankings">Rankings</RouterLink>
          <RouterLink to="/analyze">Analyze</RouterLink>
          <RouterLink to="/recommendations">Recommendations</RouterLink>
        </div>
        <span class="nav-caption">A closer look at rhythm</span>
      </nav>
    </header>
    <main id="main-content" class="site-main container" tabindex="-1">
      <RouterView/>
    </main>
    <footer class="site-footer container">
      <p>Made for the patterns behind the play.</p>
      <div class="footer-links">
        <span>An independent osu! tool</span>
        <RouterLink to="/about">How it works
          <AppIcon name="arrow-up-right"/>
        </RouterLink>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
</script>
