<template>
  <div>
    <h1>Top Plays</h1>
    <p class="muted">Your osu!standard top plays (requires login + configured osu! API).</p>
    <p v-if="loading">Loading...</p>
    <p v-if="error" class="muted">{{ error }}</p>
    <ul v-if="items.length"><li v-for="(p,i) in items" :key="i">{{ p }}</li></ul>
    <p v-if="!loading && !items.length && !error" class="muted">No top plays available.</p>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const loading = ref(true)
const error = ref('')
const items = ref<any[]>([])
onMounted(async () => {
  try {
    const r = await fetch('/api/topplays')
    if (!r.ok) { const d = await r.json(); throw new Error(d.error || r.statusText) }
    const d = await r.json(); items.value = d.items || []
  } catch (e: any) { error.value = e.message }
  finally { loading.value = false }
})
</script>
