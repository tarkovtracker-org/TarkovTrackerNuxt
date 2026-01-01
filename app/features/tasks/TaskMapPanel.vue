<template>
  <div v-if="show" class="my-1 w-full">
    <UAccordion :items="[{ label: 'Objective Locations', slot: 'content' }]" class="w-full">
      <template #default="{ item, open }">
        <UButton
          color="neutral"
          variant="ghost"
          class="flex w-full items-center justify-between rounded-none py-2 sm:p-3"
        >
          <span class="text-base font-medium text-gray-200">
            {{ item.label }}
            <span class="font-normal text-gray-400">&nbsp;-&nbsp;{{ displayTime }}</span>
          </span>
          <UIcon
            name="i-mdi-chevron-down"
            class="h-5 w-5 transition-transform duration-200"
            :class="[open && 'rotate-180 transform']"
          />
        </UButton>
      </template>
      <template #content>
        <div class="bg-gray-900/50 p-4">
          <LeafletMapComponent
            v-if="selectedMap"
            :map="selectedMap"
            :marks="visibleMarks"
            :show-extracts="showMapExtracts"
            :show-extract-toggle="true"
            :show-legend="true"
          />
          <UAlert
            v-else
            icon="i-mdi-alert-circle"
            color="error"
            variant="soft"
            title="No map data available for this selection."
          />
        </div>
      </template>
    </UAccordion>
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue';
  import { useTarkovTime } from '@/composables/useTarkovTime';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import type { TarkovMap } from '@/types/tarkov';
  const LeafletMapComponent = defineAsyncComponent(() => import('@/features/maps/LeafletMap.vue'));
  // Use structural types compatible with LeafletMap's expectations
  interface Props {
    show: boolean;
    selectedMap?: TarkovMap;
    visibleMarkers: Array<{
      id?: string;
      zones: Array<{ map: { id: string }; outline: { x: number; z: number }[] }>;
      possibleLocations?: Array<{ map: { id: string }; [key: string]: unknown }>;
      users?: string[];
    }>;
    activeMapView: string;
  }
  const props = defineProps<Props>();
  const preferencesStore = usePreferencesStore();
  const { tarkovTime } = useTarkovTime();
  // Maps with static/fixed raid times (don't follow normal day/night cycle)
  const STATIC_TIME_MAPS: Record<string, string> = {
    '55f2d3fd4bdc2d5f408b4567': '15:28 / 03:28', // Factory
    '5b0fc42d86f7744a585f9105': '15:28 / 03:28', // The Lab
  };
  // Display time - use static time for certain maps, dynamic for others
  const displayTime = computed(() => {
    const staticTime = STATIC_TIME_MAPS[props.activeMapView];
    return staticTime ?? tarkovTime.value;
  });
  // Get preference for showing extracts
  const showMapExtracts = computed(() => preferencesStore.showMapExtracts ?? true);
  // Alias for better readability in template
  const visibleMarks = computed(() => props.visibleMarkers);
</script>
