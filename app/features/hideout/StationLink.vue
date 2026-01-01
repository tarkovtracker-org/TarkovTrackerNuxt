<template>
  <router-link
    :to="stationHref"
    class="text-blue-400 no-underline hover:text-blue-300"
    :aria-label="`Go to ${props.station.name} card`"
  >
    <div class="flex max-w-full min-w-0 items-center overflow-hidden">
      <img
        :src="stationIcon"
        :alt="`${props.station.name} icon`"
        class="shrink-0 align-middle"
        :class="compact ? 'h-4 w-4 sm:h-5 sm:w-5 lg:h-8 lg:w-8' : 'h-8 w-8'"
        loading="lazy"
      />
      <span
        class="ml-1 truncate font-bold"
        :class="compact ? 'hidden text-xs lg:inline lg:text-sm' : 'text-sm'"
      >
        {{ props.station.name }}
      </span>
    </div>
  </router-link>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import type { HideoutStation } from '@/types/tarkov';
  const props = defineProps<{
    station: Pick<HideoutStation, 'id' | 'name' | 'imageLink'>;
    compact?: boolean;
  }>();
  const stationIcon = computed(() => props.station.imageLink);
  const stationHref = computed(() => `/hideout?station=${props.station.id}`);
</script>
