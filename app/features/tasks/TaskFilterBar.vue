<template>
  <div class="mb-6 space-y-3">
    <!-- Top Bar: Search (left) | Primary View Tabs (center) | Settings (right) -->
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-surface-elevated px-4 py-2.5">
      <!-- Search - larger width -->
      <div class="w-56 shrink-0 justify-self-start sm:w-64 lg:w-72">
        <UInput
          :model-value="searchQuery"
          :placeholder="t('page.tasks.search.placeholder', 'Search...')"
          :aria-label="t('page.tasks.search.ariaLabel', 'Search tasks')"
          icon="i-mdi-magnify"
          size="sm"
          :ui="{ trailing: 'pe-1' }"
          class="w-full"
          @update:model-value="$emit('update:searchQuery', $event)"
        >
          <template v-if="searchQuery?.length" #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="xs"
              icon="i-mdi-close-circle"
              aria-label="Clear search"
              @click="$emit('update:searchQuery', '')"
            />
          </template>
        </UInput>
      </div>
      <!-- Primary View Tabs - centered -->
      <div class="flex items-center justify-center gap-1 justify-self-center">
        <FilterPill
          :active="primaryView === 'all'"
          icon="i-mdi-checkbox-multiple-marked"
          :label="t('page.tasks.primaryviews.all').toUpperCase()"
          label-class="hidden sm:inline"
          @click="setPrimaryView('all')"
        />
        <FilterPill
          :active="primaryView === 'traders'"
          icon="i-mdi-account-group"
          :label="t('page.tasks.primaryviews.traders').toUpperCase()"
          label-class="hidden sm:inline"
          @click="setPrimaryView('traders')"
        />
        <FilterPill
          :active="primaryView === 'maps'"
          icon="i-mdi-map"
          :label="t('page.tasks.primaryviews.maps').toUpperCase()"
          label-class="hidden sm:inline"
          @click="setPrimaryView('maps')"
        />
      </div>
      <!-- Settings button -->
      <div class="shrink-0 justify-self-end">
        <TaskSettingsModal />
      </div>
    </div>
    <!-- Secondary filters: Status Filters + User View (centered) -->
    <div class="flex items-center justify-center gap-3 rounded-lg bg-surface-elevated px-4 py-2.5">
      <!-- Status filters (ALL / AVAILABLE / LOCKED / COMPLETED) -->
      <div class="flex items-center gap-1">
        <FilterPill
          :active="secondaryView === 'all'"
          :count="statusCounts.all"
          count-color="bg-secondary-400"
          @click="setSecondaryView('all')"
        >
          <template #icon>
            <UIcon name="i-mdi-format-list-bulleted" class="hidden h-4 w-4 sm:mr-1 sm:block" />
          </template>
          <span class="text-xs sm:text-sm">ALL</span>
        </FilterPill>
        
        <FilterPill
          :active="secondaryView === 'available'"
          :label="t('page.tasks.secondaryviews.available').toUpperCase()"
          label-class="text-xs sm:text-sm"
          :count="statusCounts.available"
          count-color="bg-primary-500"
          @click="setSecondaryView('available')"
        >
            <template #icon>
              <UIcon name="i-mdi-clipboard-text" class="hidden h-4 w-4 sm:mr-1 sm:block" />
            </template>
        </FilterPill>

        <FilterPill
          :active="secondaryView === 'locked'"
          :label="t('page.tasks.secondaryviews.locked').toUpperCase()"
          label-class="text-xs sm:text-sm"
          :count="statusCounts.locked"
          count-color="bg-surface-600"
          @click="setSecondaryView('locked')"
        >
            <template #icon>
              <UIcon name="i-mdi-lock" class="hidden h-4 w-4 sm:mr-1 sm:block" />
            </template>
        </FilterPill>

        <FilterPill
          :active="secondaryView === 'completed'"
          :label="t('page.tasks.secondaryviews.completed').toUpperCase()"
          label-class="text-xs sm:text-sm"
          :count="statusCounts.completed"
          count-color="bg-success-600"
          @click="setSecondaryView('completed')"
        >
            <template #icon>
              <UIcon name="i-mdi-check-circle" class="hidden h-4 w-4 sm:mr-1 sm:block" />
            </template>
        </FilterPill>
      </div>
      <!-- Divider -->
      <div class="h-6 w-px shrink-0 bg-divider" />
      <!-- Player/Team view buttons -->
      <div class="flex items-center gap-1">
        <FilterPill
          :active="preferencesStore.getTaskUserView === 'self'"
          icon="i-mdi-account-circle"
          label-class="hidden sm:inline sm:text-sm"
          @click="onUserViewSelect({ label: currentUserDisplayName, value: 'self' })"
        >
          {{ currentUserDisplayName.toUpperCase() }}
          <template #badge>
             <UBadge size="xs" color="primary" variant="solid" class="ml-1">YOU</UBadge>
          </template>
        </FilterPill>

        <FilterPill
          v-for="teamId in visibleTeammates"
          :key="teamId"
          :active="preferencesStore.getTaskUserView === teamId"
          icon="i-mdi-account"
          :label="getTeammateDisplayName(teamId).toUpperCase()"
          label-class="text-xs sm:text-sm"
          @click="onUserViewSelect({ label: getTeammateDisplayName(teamId), value: teamId })"
        />

        <FilterPill
          v-if="visibleTeammates.length > 0"
          :active="preferencesStore.getTaskUserView === 'all'"
          icon="i-mdi-account-multiple"
          :label="t('page.tasks.userviews.all').toUpperCase()"
          label-class="text-xs sm:text-sm"
          @click="onUserViewSelect({ label: t('page.tasks.userviews.all'), value: 'all' })"
        />
      </div>
    </div>
    <!-- Map selector (shown when MAPS is selected) - Horizontal scrollable -->
    <div v-if="primaryView === 'maps' && maps.length > 0" class="w-full overflow-x-auto">
      <div
        class="flex w-max min-w-full justify-center gap-1 rounded-lg bg-surface-elevated px-4 py-2.5"
      >
        <FilterPill
          v-for="mapOption in mapOptions"
          :key="mapOption.value"
          :active="preferencesStore.getTaskMapView === mapOption.value"
          :label="mapOption.label"
          :count="mapOption.count ?? 0"
          label-class="whitespace-nowrap"
          @click="onMapSelect(mapOption)"
        />
      </div>
    </div>
    <!-- Trader selector (shown when TRADERS is selected) - Horizontal scrollable -->
    <div v-if="primaryView === 'traders' && traders.length > 0" class="w-full overflow-x-auto">
      <div
        class="flex w-max min-w-full justify-center gap-1 rounded-lg bg-surface-elevated px-4 py-2.5"
      >
        <button
          v-for="trader in traders"
          :key="trader.id"
          type="button"
          :aria-pressed="preferencesStore.getTaskTraderView === trader.id"
          :class="[
            'flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors',
            'hover:bg-white/60 dark:hover:bg-white/5',
            'focus:ring-primary-500 focus:ring-1 focus:outline-none',
            preferencesStore.getTaskTraderView === trader.id
              ? 'bg-primary-100 text-primary-900 shadow-sm dark:bg-primary-500/20 dark:text-primary-100 dark:shadow-none'
              : 'text-content-tertiary hover:text-content-primary',
          ]"
          @click="onTraderSelect({ label: trader.name, value: trader.id })"
        >
          <!-- Trader avatar with count badge -->
          <div class="relative">
            <div class="h-8 w-8 overflow-hidden rounded-full bg-surface-base">
              <img
                v-if="trader.imageLink"
                :src="trader.imageLink"
                :alt="trader.name"
                class="h-full w-full object-cover"
              />
              <UIcon v-else name="i-mdi-account-circle" class="h-full w-full text-content-tertiary" />
            </div>
            <span
              :class="[
                'absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-white',
                (traderCounts[trader.id] ?? 0) > 0 ? 'bg-primary-500' : 'bg-surface-600',
              ]"
            >
              {{ traderCounts[trader.id] ?? 0 }}
            </span>
          </div>
          <span class="text-xs font-medium whitespace-nowrap">{{ trader.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import FilterPill from '@/components/FilterPill.vue';
  import { useTaskFiltering } from '@/composables/useTaskFiltering';
  import TaskSettingsModal from '@/features/tasks/TaskSettingsModal.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTeamStore } from '@/stores/useTeamStore';
  defineProps<{
    searchQuery: string;
  }>();
  defineEmits<{
    'update:searchQuery': [value: string];
  }>();
  const { t } = useI18n({ useScope: 'global' });
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const progressStore = useProgressStore();
  const teamStore = useTeamStore();
  const { calculateMapTaskTotals, calculateStatusCounts, calculateTraderCounts, disabledTasks } =
    useTaskFiltering();
  const maps = computed(() => metadataStore.mapsWithSvg);
  const traders = computed(() => metadataStore.sortedTraders);
  // Get current user's display name
  const currentUserDisplayName = computed(() => {
    return progressStore.getDisplayName('self');
  });
  // Get visible teammates (excluding self)
  const visibleTeammates = computed(() => {
    return teamStore.teammates || [];
  });
  // Helper to get teammate display name
  const getTeammateDisplayName = (teamId: string): string => {
    return progressStore.getDisplayName(teamId);
  };
  // Calculate task counts for badges
  const statusCounts = computed(() => {
    const userView = preferencesStore.getTaskUserView;
    return calculateStatusCounts(userView);
  });
  const traderCounts = computed(() => {
    const userView = preferencesStore.getTaskUserView;
    return calculateTraderCounts(userView);
  });
  const mergedMaps = computed(() => {
    return maps.value.map((map) => {
      const mergedIds = (map as { mergedIds?: string[] }).mergedIds || [];
      const normalizedIds = mergedIds.includes(map.id) ? mergedIds : [map.id, ...mergedIds];
      return {
        id: map.id,
        mergedIds: normalizedIds.length ? normalizedIds : [map.id],
      };
    });
  });
  const mapTaskCounts = computed(() => {
    if (!metadataStore.tasks.length || !mergedMaps.value.length) return {};
    return calculateMapTaskTotals(
      mergedMaps.value,
      metadataStore.tasks,
      disabledTasks,
      preferencesStore.getHideGlobalTasks,
      preferencesStore.getHideNonKappaTasks,
      preferencesStore.getTaskUserView,
      preferencesStore.getTaskSecondaryView
    );
  });
  // Primary view (all / maps / traders)
  const primaryView = computed(() => preferencesStore.getTaskPrimaryView);
  const setPrimaryView = (view: string) => {
    preferencesStore.setTaskPrimaryView(view);
    // When switching to maps, ensure a map is selected
    if (view === 'maps' && maps.value.length > 0 && preferencesStore.getTaskMapView === 'all') {
      const firstMap = maps.value[0];
      if (firstMap?.id) {
        preferencesStore.setTaskMapView(firstMap.id);
      }
    }
    // When switching to traders, ensure a trader is selected
    if (
      view === 'traders' &&
      traders.value.length > 0 &&
      preferencesStore.getTaskTraderView === 'all'
    ) {
      const firstTrader = traders.value[0];
      if (firstTrader?.id) {
        preferencesStore.setTaskTraderView(firstTrader.id);
      }
    }
  };
  // Secondary view (available / locked / completed)
  const secondaryView = computed(() => preferencesStore.getTaskSecondaryView);
  const setSecondaryView = (view: string) => {
    preferencesStore.setTaskSecondaryView(view);
  };
  // Map selection
  const mapOptions = computed(() => {
    const counts = mapTaskCounts.value;
    return maps.value.map((map) => ({
      label: map.name,
      value: map.id,
      count: counts[map.id] ?? 0,
    }));
  });
  const onMapSelect = (selected: { label: string; value: string }) => {
    if (selected?.value) {
      preferencesStore.setTaskMapView(selected.value);
    }
  };
  // Trader selection
  const onTraderSelect = (selected: { label: string; value: string }) => {
    if (selected?.value) {
      preferencesStore.setTaskTraderView(selected.value);
    }
  };
  // User view selection (yourself / all team members)
  const onUserViewSelect = (selected: { label: string; value: string }) => {
    if (selected?.value) {
      preferencesStore.setTaskUserView(selected.value);
    }
  };
</script>
