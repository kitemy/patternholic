<template>
  <div class="community-tags">
    <p class="community-tags-label">
      <AppIcon name="tag"/>
      Community tags
    </p>
    <div v-if="status === 'loaded' && tags.length" class="tag-list">
      <RouterLink v-for="tag in visibleTags" :key="tag.id" class="community-tag"
                  :to="{ path: '/search', query: { q: tagQuery(tag.name) } }"
                  :title="`${tag.name}${tag.description ? ` — ${tag.description}` : ''}`">
        {{ shortTag(tag.name) }}<span v-if="showVotes" class="tag-votes" :aria-label="`${tag.votes} votes`">{{
          tag.votes
        }}</span>
      </RouterLink>
      <span v-if="tags.length > limit" class="tag-overflow" :title="tags.slice(limit).map(tag => tag.name).join(', ')">+{{
          tags.length - limit
        }}</span>
    </div>
    <p v-else class="tag-empty" :aria-live="status === 'pending' ? 'off' : 'polite'">
      {{
        status === 'pending' ? 'Loading community tags…' : status === 'unavailable' ? 'Community tags unavailable' : 'No community tags yet'
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {CommunityTag, TagStatus} from '@/types/beatmaps'
import {shortTag} from '@/lib/beatmaps'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{
  tags: CommunityTag[];
  status: TagStatus;
  limit?: number;
  showVotes?: boolean
}>(), {limit: 4})
const visibleTags = computed(() => props.tags.slice(0, props.limit))
const tagQuery = (name: string) => `tag="${name}"`
</script>
