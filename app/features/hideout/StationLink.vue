<template>
  <router-link
    :to="stationHref"
    class="hover-effect inline-flex items-center rounded pr-2 text-blue-400 no-underline"
    :aria-label="`Go to ${props.station.name} card`"
  >
    <div class="flex max-w-full min-w-0 items-center gap-2 overflow-hidden">
      <img
        :src="stationIcon"
        :alt="`${props.station.name} icon`"
        class="h-9 w-9 shrink-0 align-middle"
        loading="lazy"
      />
      <span class="truncate text-sm font-semibold">
        {{ props.station.name }}
      </span>
      <span v-if="level" class="shrink-0 text-sm font-bold">{{ level }}</span>
    </div>
  </router-link>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import type { HideoutStation } from '@/types/tarkov';
  const props = defineProps<{
    station: Pick<HideoutStation, 'id' | 'name' | 'imageLink'>;
    compact?: boolean;
    level?: number;
  }>();
  const stationIcon = computed(() => props.station.imageLink);
  const stationHref = computed(() => `/hideout?station=${props.station.id}`);
</script>
