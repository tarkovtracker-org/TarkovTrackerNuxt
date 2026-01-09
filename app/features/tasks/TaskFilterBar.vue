<template>
  <div class="mb-6 space-y-3">
    <!-- Single Task Mode Indicator -->
    <div
      v-if="singleTaskId"
      class="bg-accent-100 dark:bg-accent-500/20 flex items-center justify-between rounded-lg px-4 py-2.5"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-mdi-filter" class="text-accent-600 dark:text-accent-400 h-5 w-5" />
        <span class="text-accent-800 dark:text-accent-200 text-sm font-medium">
          {{ t('page.tasks.filters.singleTaskMode', 'Viewing a single task') }}
        </span>
      </div>
      <UButton
        size="xs"
        variant="soft"
        color="primary"
        icon="i-mdi-close"
        :label="t('page.tasks.filters.showAllTasks', 'Show all tasks')"
        @click="$emit('clearSingleTask')"
      />
    </div>
    <!-- Top Bar: Search (left) | Primary View Tabs (center) | Settings (right) -->
    <div
      class="bg-surface-elevated grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg px-4 py-2.5"
    >
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
    <div class="bg-surface-elevated flex items-center justify-center gap-3 rounded-lg px-4 py-2.5">
      <!-- Status filters (ALL / AVAILABLE / LOCKED / COMPLETED) -->
      <div class="flex items-center gap-1">
        <FilterPill
          :active="secondaryView === 'all'"
          :count="statusCounts.all"
          count-color="badge-soft-accent"
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
          count-color="plain"
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
          count-color="badge-soft-surface"
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
          count-color="badge-soft-success"
          @click="setSecondaryView('completed')"
        >
          <template #icon>
            <UIcon name="i-mdi-check-circle" class="hidden h-4 w-4 sm:mr-1 sm:block" />
          </template>
        </FilterPill>
        <FilterPill
          :active="secondaryView === 'failed'"
          :label="t('page.tasks.secondaryviews.failed', 'FAILED').toUpperCase()"
          label-class="text-xs sm:text-sm"
          :count="statusCounts.failed"
          count-color="badge-soft-error"
          @click="setSecondaryView('failed')"
        >
          <template #icon>
            <UIcon name="i-mdi-close-circle" class="hidden h-4 w-4 sm:mr-1 sm:block" />
          </template>
        </FilterPill>
      </div>
      <!-- Divider -->
      <div class="bg-divider h-6 w-px shrink-0" />
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
            <GameBadge
              size="xs"
              color="neutral"
              variant="solid"
              badge-class="badge-soft-accent ml-1"
              label="YOU"
            />
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
        class="bg-surface-elevated flex w-max min-w-full justify-center gap-1 rounded-lg px-4 py-2.5"
      >
        <FilterPill
          v-for="mapOption in mapOptions"
          :key="mapOption.value"
          :active="mapView === mapOption.value"
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
        class="bg-surface-elevated flex w-max min-w-full justify-center gap-1 rounded-lg px-4 py-2.5"
      >
        <FilterPill
          v-for="trader in traders"
          :key="trader.id"
          :active="traderView === trader.id"
          :label="trader.name"
          :count="traderCounts[trader.id] ?? 0"
          label-class="whitespace-nowrap"
          @click="onTraderSelect({ label: trader.name, value: trader.id })"
        >
          <template #icon>
            <div class="bg-surface-base h-6 w-6 overflow-hidden rounded-full">
              <img
                v-if="trader.imageLink"
                :src="trader.imageLink"
                :alt="trader.name"
                class="h-full w-full object-cover"
              />
              <UIcon
                v-else
                name="i-mdi-account-circle"
                class="text-content-tertiary h-full w-full"
              />
            </div>
          </template>
        </FilterPill>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import FilterPill from '@/components/FilterPill.vue';
  import GameBadge from '@/components/ui/GameBadge.vue';
  import { useTaskFiltering } from '@/composables/useTaskFiltering';
  import TaskSettingsModal from '@/features/tasks/TaskSettingsModal.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTeamStore } from '@/stores/useTeamStore';
  const props = defineProps<{
    searchQuery: string;
    singleTaskId: string | null;
    // Filter values (from URL)
    primaryView: string;
    secondaryView: string;
    mapView: string;
    traderView: string;
  }>();
  const emit = defineEmits<{
    'update:searchQuery': [value: string];
    clearSingleTask: [];
    // Filter change events
    'update:primaryView': [value: string];
    'update:secondaryView': [value: string];
    'update:mapView': [value: string];
    'update:traderView': [value: string];
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
    const secondaryView = preferencesStore.getTaskSecondaryView;
    return calculateTraderCounts(userView, secondaryView);
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
  // Primary view (all / maps / traders) - now from props, emit changes
  const setPrimaryView = (view: string) => {
    emit('update:primaryView', view);
  };

  // Secondary view (available / locked / completed) - now from props
  const setSecondaryView = (view: string) => {
    emit('update:secondaryView', view);
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
      emit('update:mapView', selected.value);
    }
  };
  // Trader selection
  const onTraderSelect = (selected: { label: string; value: string }) => {
    if (selected?.value) {
      emit('update:traderView', selected.value);
    }
  };
  // User view selection (yourself / all team members)
  const onUserViewSelect = (selected: { label: string; value: string }) => {
    if (selected?.value) {
      preferencesStore.setTaskUserView(selected.value);
    }
  };
</script>
