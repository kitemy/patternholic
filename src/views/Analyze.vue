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
      <p>Pattern Abuse Meter (heuristic): {{ result.abuseScore }} / 100</p>
      <ul><li v-for="(v,k) in result.metrics" :key="k">{{ k }}: {{ v }}</li></ul>
    </div>
    <div v-if="parsed" class="card">
      <h2>Pattern Explorer</h2>
      <div class="timeline">
        <div v-for="(e,i) in result?.events || []" :key="i" class="tl-item" :class="{selected: selected===i}" @click="select(i)">
          {{ e.type }} {{ (e.startTime/1000).toFixed(2) }}s - {{ (e.endTime/1000).toFixed(2) }}s
        </div>
      </div>
      <audio ref="audio" :src="audioUrl" />
      <div class="controls">
        <button @click="play">{{ playing?'Pause':'Play' }}</button>
        <button @click="restart">Restart</button>
        <input type="range" min="0" :max="duration" step="1" v-model.number="seek" @input="seekTo" />
        <span>{{ (currentTime/1000).toFixed(2) }} / {{ (duration/1000).toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { parseOsu } from '@/lib/osuParser'
import { analyzeBeatmap } from '@/lib/analysis'
import { saveAnalysis } from '@/lib/storage'
const text = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<any>(null)
const parsed = ref<any>(null)
const selected = ref<number|null>(null)
const seek = ref(0)
const canvas = ref<HTMLCanvasElement|null>(null)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const audioUrl = ref('')
const audio = ref<HTMLAudioElement|null>(null)
let raf = 0
let startTs = 0
let baseTime = 0

function onFile(e:any){ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{text.value=String(r.result)}; r.readAsText(f) }
function onDrop(e:any){ const f=e.dataTransfer.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{text.value=String(r.result)}; r.readAsText(f) }
async function run(){
  loading.value=true; error.value=''; result.value=null; parsed.value=null
  try { const m=parseOsu(text.value); parsed.value=m; result.value=analyzeBeatmap(m); duration.value = m.hitObjects.length? m.hitObjects[m.hitObjects.length-1].time+1000 : 0; await saveAnalysis({ text: text.value, result: result.value, metadata: m.metadata }); if (m.metadata?.BeatmapID) { try { const r=await fetch('/api/beatmap?id='+m.metadata.BeatmapID); const d=await r.json(); if (d?.previewUrl) audioUrl.value=d.previewUrl } catch {} } }
  catch(e:any){ error.value=e.message }
  finally { loading.value=false }
}
function select(i:number){ selected.value=i; if(result.value?.events?.[i]) currentTime.value=result.value.events[i].startTime }
function play(){ playing.value=!playing.value; if(playing.value){ baseTime=currentTime.value; startTs=performance.now(); loop() } else cancelAnimationFrame(raf) }
function restart(){ currentTime.value=0; seek.value=0; if(playing.value){ baseTime=0; startTs=performance.now() } }
function seekTo(){ currentTime.value=seek.value; baseTime=currentTime.value; startTs=performance.now() }
function loop(){
  if(!playing.value) return
  currentTime.value = baseTime + (performance.now()-startTs)
  if(currentTime.value>duration.value){ currentTime.value=duration.value; playing.value=false; return }
  if(audio.value){ audio.value.currentTime = currentTime.value/1000; if(playing.value && audio.value.paused) audio.value.play().catch(()=>{}) }
  if(!playing.value && audio.value) audio.value.pause()
  draw()
  raf=requestAnimationFrame(loop)
}
function draw(){
  const c=canvas.value; if(!c) return
  const ctx=c.getContext('2d')!; ctx.clearRect(0,0,c.width,c.height)
  ctx.fillStyle='#0b1324'; ctx.fillRect(0,0,c.width,c.height)
  if(!parsed.value) return
  const objs=parsed.value.hitObjects
  const maxX=Math.max(...objs.map((o:any)=>o.x),1)
  const maxY=Math.max(...objs.map((o:any)=>o.y),1)
  const sx=c.width/(maxX+50), sy=c.height/(maxY+50)
  // approach circles for upcoming objects
  for(const o of objs){
    if(o.time < currentTime.value-200 || o.time > currentTime.value+2000) continue
    const r = 6 + Math.max(0, 60*(1 - Math.min(1, (o.time-currentTime.value)/1000)))
    ctx.beginPath(); ctx.arc(o.x*sx+25, o.y*sy+25, r, 0, Math.PI*2); ctx.strokeStyle='rgba(59,130,246,0.4)'; ctx.stroke()
    ctx.beginPath(); ctx.arc(o.x*sx+25, o.y*sy+25, 6, 0, Math.PI*2); ctx.fillStyle='#3b82f6'; ctx.fill()
  }
  // sliders as lines to next object
  for(let i=0;i<objs.length-1;i++){
    const o=objs[i], n=objs[i+1]
    if((o.type & 2)===2){
      ctx.beginPath(); ctx.moveTo(o.x*sx+25,o.y*sy+25); ctx.lineTo(n.x*sx+25,n.y*sy+25); ctx.strokeStyle='rgba(245,158,11,0.6)'; ctx.lineWidth=3; ctx.stroke()
    }
  }
  if(selected.value!==null && result.value?.events?.[selected.value]){
    const e=result.value.events[selected.value]
    ctx.strokeStyle='#f59e0b'; ctx.lineWidth=2
    for(let i=e.startIndex;i<=e.endIndex;i++){ const o=objs[i]; ctx.beginPath(); ctx.arc(o.x*sx+25,o.y*sy+25,12,0,Math.PI*2); ctx.stroke() }
  }
}
onMounted(()=>{ raf=requestAnimationFrame(()=>draw()) })
onBeforeUnmount(()=>cancelAnimationFrame(raf))
</script>
<style scoped>
.analyze-page { max-width:900px; margin:0 auto; }
.dropzone { border:2px dashed #1e2a45; padding:1rem; text-align:center; }
.timeline { max-height:200px; overflow:auto; margin:1rem 0; }
.tl-item { padding:.25rem; cursor:pointer; border-bottom:1px solid #1e2a45; }
.tl-item.selected { background:#1e2a45; }
.controls { display:flex; gap:.5rem; align-items:center; margin-top:1rem; flex-wrap:wrap; }
canvas { width:100%; height:auto; border:1px solid #1e2a45; }
</style>
