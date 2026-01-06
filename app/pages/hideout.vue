<template>
  <div class="container mx-auto min-h-[calc(100vh-250px)] space-y-4 px-4 py-6">
    <div class="flex justify-center">
      <div class="bg-surface-elevated w-full max-w-4xl rounded-lg px-4 py-3 shadow-sm">
        <div class="flex flex-wrap justify-center gap-2">
          <FilterPill
            v-for="view in primaryViews"
            :key="view.view"
            :active="activePrimaryView === view.view"
            :icon="`i-${view.icon}`"
            :label="view.title.toUpperCase()"
            :count="view.count"
            :count-color="view.badgeColor"
            class="shrink-0"
            label-class="text-xs sm:text-sm"
            @click="activePrimaryView = view.view"
          />
        </div>
      </div>
    </div>
    <!-- Search Bar -->
    <div class="flex justify-center">
      <div class="bg-surface-elevated w-full max-w-lg rounded-lg px-4 py-2.5 shadow-sm">
        <UInput
          :model-value="searchQuery"
          :aria-label="$t('page.hideout.search.placeholder', 'Search stations...')"
          :placeholder="$t('page.hideout.search.placeholder', 'Search stations...')"
          icon="i-mdi-magnify"
          size="md"
          :ui="{ trailing: 'pe-1' }"
          class="w-full"
          @update:model-value="searchQuery = $event"
        >
          <template v-if="searchQuery?.length" #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="i-mdi-close-circle"
              aria-label="Clear search"
              @click="searchQuery = ''"
            />
          </template>
        </UInput>
      </div>
    </div>
    <div>
      <div v-if="isStoreLoading" class="text-surface-200 flex flex-col items-center gap-3 py-10">
        <UIcon name="i-heroicons-arrow-path" class="text-accent-500 h-8 w-8 animate-spin" />
        <div class="flex items-center gap-2 text-sm">
          {{ $t('page.hideout.loading') }}
          <RefreshButton />
        </div>
      </div>
      <div v-else-if="visibleStations.length === 0" class="flex justify-center">
        <UAlert
          icon="i-mdi-clipboard-search"
          color="neutral"
          variant="soft"
          class="max-w-xl"
          :title="$t('page.hideout.nostationsfound')"
        />
      </div>
      <div v-else class="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <HideoutCard
          v-for="(hStation, hIndex) in visibleStations"
          :key="hIndex"
          :station="hStation"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { storeToRefs } from 'pinia';
  import { computed, nextTick, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import FilterPill from '@/components/FilterPill.vue';
  import RefreshButton from '@/components/ui/RefreshButton.vue';
  import { useHideoutFiltering } from '@/composables/useHideoutFiltering';
  import { usePageFilters } from '@/composables/usePageFilters';
  import { useHideoutFilterConfig } from '@/features/hideout/composables/useHideoutFilterConfig';
  import HideoutCard from '@/features/hideout/HideoutCard.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { useProgressStore } from '@/stores/useProgress';
  // Page metadata
  useSeoMeta({
    title: 'Hideout',
    description:
      'Track your hideout module upgrades and requirements. See what items you need to complete each station upgrade.',
  });
  const router = useRouter();
  const { t } = useI18n({ useScope: 'global' });
  const metadataStore = useMetadataStore();
  const { hideoutStations } = storeToRefs(metadataStore);
  const progressStore = useProgressStore();
  // Hideout filtering composable
  const { activePrimaryView, isStoreLoading, visibleStations, stationCounts } =
    useHideoutFiltering();
  // URL-based filter state
  // Filter config is extracted to useHideoutFilterConfig for sharing with navigation
  const { filters, setFilter, debouncedInputs } = usePageFilters(useHideoutFilterConfig());
  // Computed alias for search input
  const searchQuery = computed({
    get: () => debouncedInputs.search?.value ?? '',
    set: (v) => {
      if (debouncedInputs.search) debouncedInputs.search.value = v;
    },
  });
  // Sync URL filter to activePrimaryView (from useHideoutFiltering)
  watch(
    filters.view,
    (newView) => {
      if (newView !== activePrimaryView.value) {
        activePrimaryView.value = newView;
      }
    },
    { immediate: true }
  );
  // Sync activePrimaryView changes back to URL
  watch(activePrimaryView, (newView) => {
    if (newView !== filters.view.value) {
      setFilter('view', newView);
    }
  });
  const primaryViews = computed(() => [
    {
      title: t('page.hideout.primaryviews.all'),
      icon: 'mdi-format-list-bulleted',
      view: 'all',
      count: stationCounts.value.all,
      badgeColor: 'badge-soft-accent',
    },
    {
      title: t('page.hideout.primaryviews.available'),
      icon: 'mdi-clipboard-text',
      view: 'available',
      count: stationCounts.value.available,
      badgeColor: 'plain',
    },
    {
      title: t('page.hideout.primaryviews.maxed'),
      icon: 'mdi-arrow-collapse-up',
      view: 'maxed',
      count: stationCounts.value.maxed,
      badgeColor: 'badge-soft-success',
    },
    {
      title: t('page.hideout.primaryviews.locked'),
      icon: 'mdi-lock',
      view: 'locked',
      count: stationCounts.value.locked,
      badgeColor: 'badge-soft-surface',
    },
  ]);
  // Handle deep linking to a specific station via ?station=stationId query param
  const getStationStatus = (stationId: string): 'available' | 'maxed' | 'locked' => {
    const station = hideoutStations.value?.find((s) => s.id === stationId);
    if (!station) return 'locked';
    const currentLevel = progressStore.hideoutLevels?.[stationId]?.self || 0;
    const maxLevel = station.levels?.length || 0;
    // Check if maxed
    if (currentLevel === maxLevel) return 'maxed';
    // Check if available (can upgrade)
    const nextLevelData = station.levels?.find((l) => l.level === currentLevel + 1);
    if (nextLevelData) {
      const prereqsMet = nextLevelData.stationLevelRequirements?.every(
        (req) => (progressStore.hideoutLevels?.[req.station.id]?.self || 0) >= req.level
      );
      if (prereqsMet) return 'available';
    }
    return 'locked';
  };
  const scrollToStation = async (stationId: string) => {
    await nextTick();
    setTimeout(() => {
      const stationElement = document.getElementById(`station-${stationId}`);
      if (stationElement) {
        stationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        stationElement.classList.add('ring-2', 'ring-inset', 'ring-accent-500');
        setTimeout(() => {
          stationElement.classList.remove('ring-2', 'ring-inset', 'ring-accent-500');
        }, 2000);
      }
    }, 100);
  };
  const handleStationQueryParam = (stationId: string) => {
    if (!stationId || isStoreLoading.value) return;
    // Determine station status and set appropriate filter
    const status = getStationStatus(stationId);
    if (activePrimaryView.value !== status) {
      activePrimaryView.value = status;
    }
    // Scroll to the station after filters are applied
    scrollToStation(stationId);
    // Clear the station param after handling - use replace to avoid extra history entry
    const { station: _, ...restQuery } = router.currentRoute.value.query;
    router.replace({ query: restQuery });
  };
  // Watch for station filter and handle it when data is loaded
  watch(
    [filters.station, () => isStoreLoading.value],
    ([stationId, loading]) => {
      if (stationId && !loading) {
        handleStationQueryParam(stationId);
      }
    },
    { immediate: true }
  );
</script>
