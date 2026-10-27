<template>
  <div class="analyze-page">
    <h1>Analyze a Beatmap</h1>
    <p class="muted">Upload or paste a .osu file to analyze its patterns.</p>
    <div class="card dropzone" @dragover.prevent @drop.prevent="onDrop">
      <p>Drag and drop a .osu file here</p>
      <input type="file" accept=".osu" @change="onFile" />
    </div>
    <textarea v-model="text" rows="8" placeholder="Or paste .osu contents here..."></textarea>
    <button @click="run" :disabled="loading || !text">Analyze</button>
    <p v-if="error" class="muted">{{ error }}</p>
    <div v-if="result" class="card">
      <h2>Score: {{ result.score }} / 100</h2>
      <ul><li v-for="(v,k) in result.metrics" :key="k">{{ k }}: {{ v }}</li></ul>
      <p class="muted">Save is not available on this deployment.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { parseOsu } from '@/lib/osuParser'
import { analyzeBeatmap } from '@/lib/analysis'
const text = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<any>(null)
function onFile(e:any){ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{text.value=String(r.result)}; r.readAsText(f) }
function onDrop(e:any){ const f=e.dataTransfer.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{text.value=String(r.result)}; r.readAsText(f) }
function run(){
  loading.value=true; error.value=''; result.value=null
  try { const m=parseOsu(text.value); result.value=analyzeBeatmap(m) }
  catch(e:any){ error.value=e.message }
  finally { loading.value=false }
}
</script>
