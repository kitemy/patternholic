<template>
  <div class="beatmap-cover" :class="{ 'beatmap-cover--fallback': failed || !src }">
    <img v-if="src && !failed" :src="src" alt="" :loading="eager ? 'eager' : 'lazy'" decoding="async"
         @error="failed = true"/>
    <AppIcon v-else name="music"/>
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ src: string | null; eager?: boolean }>()
const failed = ref(false)
watch(() => props.src, () => {
  failed.value = false
})
</script>
