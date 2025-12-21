<template>
  <div class="container mx-auto min-h-[calc(100vh-250px)] space-y-4 px-4 py-6">
    <div class="flex justify-center">
      <div class="w-full max-w-4xl rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3">
        <div class="flex flex-wrap justify-center gap-2">
          <UButton
            v-for="view in primaryViews"
            :key="view.view"
            :icon="`i-${view.icon}`"
            :variant="'ghost'"
            :color="'neutral'"
            size="md"
            class="shrink-0"
            :class="{
              'border-primary-500 rounded-none border-b-2': activePrimaryView === view.view,
            }"
            @click="activePrimaryView = view.view"
          >
            <span class="text-xs sm:text-sm">{{ view.title.toUpperCase() }}</span>
            <span
              :class="[
                'ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white sm:h-7 sm:min-w-7 sm:px-1.5 sm:text-sm',
                view.badgeColor,
              ]"
            >
              {{ view.count }}
            </span>
          </UButton>
        </div>
      </div>
    </div>
    <div>
      <div v-if="isStoreLoading" class="text-surface-200 flex flex-col items-center gap-3 py-10">
        <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-8 w-8 animate-spin" />
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
  import { computed, defineAsyncComponent, nextTick, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute, useRouter } from 'vue-router';
  import { useHideoutFiltering } from '@/composables/useHideoutFiltering';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { useProgressStore } from '@/stores/useProgress';
  // Page metadata
  useSeoMeta({
    title: 'Hideout',
    description:
      'Track your hideout module upgrades and requirements. See what items you need to complete each station upgrade.',
  });
  const HideoutCard = defineAsyncComponent(() => import('@/features/hideout/HideoutCard.vue'));
  const RefreshButton = defineAsyncComponent(() => import('@/components/ui/RefreshButton.vue'));
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n({ useScope: 'global' });
  const metadataStore = useMetadataStore();
  const { hideoutStations } = storeToRefs(metadataStore);
  const progressStore = useProgressStore();
  // Hideout filtering composable
  const { activePrimaryView, isStoreLoading, visibleStations, stationCounts } =
    useHideoutFiltering();
  const primaryViews = computed(() => [
    {
      title: t('page.hideout.primaryviews.available'),
      icon: 'mdi-tag-arrow-up-outline',
      view: 'available',
      count: stationCounts.value.available,
      badgeColor: 'bg-primary-500',
    },
    {
      title: t('page.hideout.primaryviews.maxed'),
      icon: 'mdi-arrow-collapse-up',
      view: 'maxed',
      count: stationCounts.value.maxed,
      badgeColor: 'bg-green-600',
    },
    {
      title: t('page.hideout.primaryviews.locked'),
      icon: 'mdi-lock',
      view: 'locked',
      count: stationCounts.value.locked,
      badgeColor: 'bg-gray-600',
    },
    {
      title: t('page.hideout.primaryviews.all'),
      icon: 'mdi-clipboard-check',
      view: 'all',
      count: stationCounts.value.all,
      badgeColor: 'bg-blue-600',
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
        stationElement.classList.add(
          'ring-2',
          'ring-primary-500',
          'ring-offset-2',
          'ring-offset-surface-900'
        );
        setTimeout(() => {
          stationElement.classList.remove(
            'ring-2',
            'ring-primary-500',
            'ring-offset-2',
            'ring-offset-surface-900'
          );
        }, 2000);
      }
    }, 100);
  };
  const handleStationQueryParam = () => {
    const stationId = route.query.station as string;
    if (!stationId || isStoreLoading.value) return;
    // Determine station status and set appropriate filter
    const status = getStationStatus(stationId);
    if (activePrimaryView.value !== status) {
      activePrimaryView.value = status;
    }
    // Scroll to the station after filters are applied
    scrollToStation(stationId);
    // Clear the query param to avoid re-triggering on filter changes
    router.replace({ path: '/hideout', query: {} });
  };
  // Watch for station query param and handle it when data is loaded
  watch(
    [() => route.query.station, isStoreLoading],
    ([stationQueryParam, loading]) => {
      if (stationQueryParam && !loading) {
        handleStationQueryParam();
      }
    },
    { immediate: true }
  );
</script>
