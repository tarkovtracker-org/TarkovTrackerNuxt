<template>
  <router-link
    v-tooltip="props.station.name"
    :to="stationHref"
    class="hover-effect inline-flex max-w-full min-w-0 items-center rounded pr-2 text-blue-400 no-underline"
    :aria-label="`Go to ${props.station.name} card`"
    :class="{
      'gap-2': !props.compact,
      'gap-1.5': props.compact,
    }"
  >
    <img
      :src="stationIcon"
      :alt="`${props.station.name} icon`"
      class="shrink-0 align-middle"
      :class="{
        'h-9 w-9': !props.compact,
        'h-5 w-5': props.compact,
      }"
      loading="lazy"
    />
    <span
      class="truncate font-semibold"
      :class="{
        'text-sm': !props.compact,
        'text-xs': props.compact,
      }"
    >
      {{ props.station.name }}
    </span>
    <span
      v-if="level"
      class="shrink-0 font-bold"
      :class="{
        'text-sm': !props.compact,
        'text-xs': props.compact,
      }"
    >
      {{ level }}
    </span>
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
