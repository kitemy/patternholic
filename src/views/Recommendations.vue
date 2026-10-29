<template>
  <div>
    <h1>Recommendations</h1>
    <p class="muted">Compare analyzed beatmaps by pattern similarity.</p>
    <p v-if="loading">Loading...</p>
    <div v-if="items.length">
      <select v-model="refId">
        <option v-for="(a,i) in items" :key="i" :value="i">{{ a.result?.score ?? '?' }} - {{ i }}</option>
      </select>
      <button @click="compute">Recommend</button>
      <ul>
        <li v-for="(r,i) in recs" :key="i">
          Analysis #{{ r.index }} — similarity {{ r.similarity.toFixed(1) }}
        </li>
      </ul>
    </div>
    <p v-if="!loading && !items.length" class="muted">No saved analyses. Analyze a beatmap first.</p>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { loadAnalyses } from '@/lib/storage'
const loading = ref(true)
const items = ref<any[]>([])
const refId = ref(0)
const recs = ref<any[]>([])
onMounted(async () => { items.value = await loadAnalyses(); loading.value = false })
function vec(a: any) { return [a.jumpCount||0, a.streamCount||0, a.burstCount||0, a.densityPeak||0, a.timingIntensity||0, a.repetitionScore||0, a.irregularity||0] }
function cos(a:number[], b:number[]) {
  let dot=0, na=0, nb=0
  for(let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i] }
  if(!na||!nb) return 0
  return (dot/(Math.sqrt(na)*Math.sqrt(nb)))*100
}
function compute() {
  const refVec = vec(items.value[refId.value]?.result?.metrics || {})
  recs.value = items.value.map((it, i) => ({ index: i, similarity: i===refId.value? -1 : cos(refVec, vec(it.result?.metrics||{})) }))
    .filter(r => r.similarity >= 0).sort((a,b) => b.similarity - a.similarity)
}
</script>
