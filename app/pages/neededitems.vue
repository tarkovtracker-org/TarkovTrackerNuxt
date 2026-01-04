<template>
  <div class="p-4">
    <!-- Filter Bar -->
    <NeededItemsFilterBar
      v-model="activeFilter"
      v-model:search="search"
      v-model:view-mode="viewMode"
      v-model:fir-filter="firFilter"
      v-model:group-by-item="groupByItem"
      v-model:hide-non-fir-special-equipment="hideNonFirSpecialEquipment"
      v-model:hide-team-items="hideTeamItems"
      v-model:kappa-only="kappaOnly"
      :filter-tabs="filterTabsWithCounts"
      :total-count="displayItems.length"
      :ungrouped-count="filteredItems.length"
    />
    <!-- Items Container -->
    <UCard class="border border-base bg-surface-base">
      <!-- Loading State -->
      <div v-if="metadataStore.loading || !metadataStore.isDataLoaded" class="p-2">
        <div
          v-if="viewMode === 'list'"
          class="divide-base"
        >
          <div
            v-for="n in 10"
            :key="n"
            class="flex items-center gap-3 py-2 animate-pulse"
          >
            <div class="h-12 w-12 rounded bg-surface-elevated shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 w-1/4 rounded bg-surface-elevated"></div>
              <div class="h-3 w-1/3 rounded bg-surface-elevated"></div>
            </div>
            <div class="h-8 w-24 rounded bg-surface-elevated shrink-0"></div>
          </div>
        </div>
        <div
          v-else
          class="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
        >
          <div
            v-for="n in 12"
            :key="n"
            class="flex flex-col rounded-lg border border-base bg-surface-elevated h-64 animate-pulse relative overflow-hidden"
          >
           <div class="aspect-[4/3] w-full bg-surface-active/50"></div>
           <div class="p-2 space-y-3 flex-1">
             <div class="h-4 w-3/4 bg-surface-active/50 rounded mx-auto mt-2"></div>
             <div class="h-3 w-1/2 bg-surface-active/50 rounded mx-auto"></div>
             <div class="flex gap-2 justify-center mt-4">
               <div class="h-3 w-8 bg-surface-active/50 rounded"></div>
               <div class="h-3 w-8 bg-surface-active/50 rounded"></div>
             </div>
           </div>
          </div>
        </div>
      </div>
      <div v-else-if="displayItems.length === 0" class="p-8 text-center text-content-tertiary">
        {{ $t('page.neededitems.empty', 'No items match your search.') }}
      </div>
      <!-- Grouped View -->
      <div v-else-if="groupByItem" class="p-2">
        <div
          class="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          <NeededItemGroupedCard
            v-for="(group, index) in visibleGroupedItems"
            :key="group.itemId"
            :grouped-item="group"
            :active-filter="activeFilter"
            :data-index="index"
          />
        </div>
        <div v-if="visibleCount < displayItems.length" ref="gridSentinel" class="h-1 w-full"></div>
      </div>
      <!-- List View -->
      <div v-else-if="viewMode === 'list'">
        <NeededItem
          v-for="(item, index) in visibleIndividualItems"
          :key="`${item.needType}-${item.id}`"
          :need="item"
          item-style="row"
          :data-index="index"
        />
        <div v-if="visibleCount < displayItems.length" ref="listSentinel" class="h-1"></div>
      </div>
      <!-- Grid View -->
      <div v-else class="p-2">
        <div
          class="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
        >
          <NeededItem
            v-for="(item, index) in visibleIndividualItems"
            :key="`${item.needType}-${item.id}`"
            :need="item"
            item-style="card"
            :data-index="index"
          />
        </div>
        <div v-if="visibleCount < displayItems.length" ref="gridSentinel" class="h-1 w-full"></div>
      </div>
    </UCard>
  </div>
</template>
<script setup lang="ts">
  import { storeToRefs } from 'pinia';
  import { computed, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
  import { usePageFilters } from '@/composables/usePageFilters';
  import NeededItem from '@/features/neededitems/NeededItem.vue';
  import { isNonFirSpecialEquipment } from '@/features/neededitems/neededItemFilters';
  import NeededItemGroupedCard from '@/features/neededitems/NeededItemGroupedCard.vue';
  import NeededItemsFilterBar from '@/features/neededitems/NeededItemsFilterBar.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { NeededItemHideoutModule, NeededItemTaskObjective } from '@/types/tarkov';
  import { logger } from '@/utils/logger';
  // Page metadata
  useSeoMeta({
    title: 'Needed Items',
    description:
      'View all items needed for your active quests and hideout upgrades. Filter by quest, craft, and find-in-raid requirements.',
  });
  const { t } = useI18n({ useScope: 'global' });
  const metadataStore = useMetadataStore();
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const tarkovStore = useTarkovStore();
  const { neededItemTaskObjectives, neededItemHideoutModules } = storeToRefs(metadataStore);

  // URL-based filter state
  type FilterType = 'all' | 'tasks' | 'hideout' | 'completed';
  type FirFilter = 'all' | 'fir' | 'non-fir';
  type ViewMode = 'list' | 'grid';

  const { filters, setFilter, debouncedInputs } = usePageFilters({
    filter: {
      default: 'all',
      validate: (v) => ['all', 'tasks', 'hideout', 'completed'].includes(v),
    },
    viewMode: {
      default: 'grid',
      validate: (v) => ['list', 'grid'].includes(v),
    },
    fir: {
      default: 'all',
      validate: (v) => ['all', 'fir', 'non-fir'].includes(v),
    },
    grouped: {
      default: false,
      parse: (v) => v === '1',
      serialize: (v) => v ? '1' : null,
    },
    kappa: {
      default: false,
      parse: (v) => v === '1',
      serialize: (v) => v ? '1' : null,
    },
    hideSpecial: {
      default: false,
      parse: (v) => v === '1',
      serialize: (v) => v ? '1' : null,
    },
    search: { default: '', debounceMs: 300 },
  });

  // Computed aliases for template bindings
  const activeFilter = computed({
    get: () => filters.filter.value as FilterType,
    set: (v: FilterType) => setFilter('filter', v),
  });
  const viewMode = computed({
    get: () => filters.viewMode.value as ViewMode,
    set: (v: ViewMode) => setFilter('viewMode', v),
  });
  const firFilter = computed({
    get: () => filters.fir.value as FirFilter,
    set: (v: FirFilter) => setFilter('fir', v),
  });
  const groupByItem = computed({
    get: () => filters.grouped.value as boolean,
    set: (v: boolean) => setFilter('grouped', v),
  });
  const kappaOnly = computed({
    get: () => filters.kappa.value as boolean,
    set: (v: boolean) => setFilter('kappa', v),
  });
  const hideNonFirSpecialEquipment = computed({
    get: () => filters.hideSpecial.value as boolean,
    set: (v: boolean) => setFilter('hideSpecial', v),
  });
  const search = debouncedInputs.search!;

  // Team filter preferences (two-way binding with preferences store - not in URL)
  const hideTeamItems = computed({
    get: () => preferencesStore.itemsTeamAllHidden,
    set: (value) => preferencesStore.setItemsTeamHideAll(value),
  });
  // Grouped item interface
  interface GroupedItem {
    itemId: string;
    item: {
      id: string;
      name: string;
      iconLink?: string;
      image512pxLink?: string;
      wikiLink?: string;
      link?: string;
      backgroundColor?: string;
    };
    taskFir: number;
    taskFirCurrent: number;
    taskNonFir: number;
    taskNonFirCurrent: number;
    hideoutFir: number;
    hideoutFirCurrent: number;
    hideoutNonFir: number;
    hideoutNonFirCurrent: number;
    total: number;
    currentCount: number;
  }
  // Get user's faction for filtering task objectives
  const userFaction = computed(() => progressStore.playerFaction['self'] ?? 'USEC');
  const allItems = computed(() => {
    const combined = [
      ...(neededItemTaskObjectives.value || []),
      ...(neededItemHideoutModules.value || []),
    ];
    // Aggregate items by (taskId/hideoutModule, itemId) to combine duplicate items
    // from different objectives in the same task
    const aggregated = new Map<string, NeededItemTaskObjective | NeededItemHideoutModule>();
    for (const need of combined) {
      let key: string;
      let itemId: string | undefined;
      if (need.needType === 'taskObjective') {
        // Filter by faction: skip task objectives for tasks that don't match user's faction
        const task = metadataStore.getTaskById(need.taskId);
        if (task && task.factionName !== 'Any' && task.factionName !== userFaction.value) {
          continue;
        }
        // For tasks: get itemId from either item or markerItem (for mark objectives)
        itemId = need.item?.id || need.markerItem?.id;
        if (!itemId) {
          logger.warn('[NeededItems] Skipping objective without item/markerItem:', need);
          continue;
        }
        // Aggregate by taskId + itemId
        // This combines multiple objectives for the same item in the same task
        key = `task:${need.taskId}:${itemId}`;
      } else {
        // For hideout: get itemId from item
        itemId = need.item?.id;
        if (!itemId) {
          logger.warn('[NeededItems] Skipping hideout requirement without item:', need);
          continue;
        }
        // This combines multiple requirements for the same item in the same module
        key = `hideout:${need.hideoutModule.id}:${itemId}`;
      }
      const existing = aggregated.get(key);
      if (existing) {
        // Item already exists for this task/module, sum the counts
        existing.count += need.count;
      } else {
        // First occurrence, clone the object to avoid mutating original
        aggregated.set(key, { ...need });
      }
    }
    // Return all items - filtering by completion status is done in filteredItems
    return Array.from(aggregated.values());
  });
  // Helper to check if the parent task/module is completed for self
  const isParentCompleted = (need: NeededItemTaskObjective | NeededItemHideoutModule): boolean => {
    if (need.needType === 'taskObjective') {
      // Check if the parent task is completed (turned in)
      return progressStore.tasksCompletions?.[need.taskId]?.['self'] ?? false;
    } else if (need.needType === 'hideoutModule') {
      // Check if the parent module is completed (built)
      return progressStore.moduleCompletions?.[need.hideoutModule.id]?.['self'] ?? false;
    }
    return false;
  };
  // Calculate item counts for each filter tab
  const filterTabsWithCounts = computed(() => {
    const items = allItems.value;
    const taskItems = items.filter(
      (item) => item.needType === 'taskObjective' && !isParentCompleted(item)
    );
    const hideoutItems = items.filter(
      (item) => item.needType === 'hideoutModule' && !isParentCompleted(item)
    );
    const completedItems = items.filter((item) => isParentCompleted(item));
    const allIncomplete = items.filter((item) => !isParentCompleted(item));
    return [
      {
        label: t('page.neededitems.filters.all', 'All'),
        value: 'all' as FilterType,
        icon: 'i-mdi-clipboard-list',
        count: allIncomplete.length,
        badgeColor: 'badge-soft-filter-all',
      },
      {
        label: t('page.neededitems.filters.tasks', 'Tasks'),
        value: 'tasks' as FilterType,
        icon: 'i-mdi-checkbox-marked-circle-outline',
        count: taskItems.length,
        badgeColor: 'badge-soft-accent',
      },
      {
        label: t('page.neededitems.filters.hideout', 'Hideout'),
        value: 'hideout' as FilterType,
        icon: 'i-mdi-home',
        count: hideoutItems.length,
        badgeColor: 'badge-soft-accent',
      },
      {
        label: t('page.neededitems.filters.completed', 'Completed'),
        value: 'completed' as FilterType,
        icon: 'i-mdi-check-all',
        count: completedItems.length,
        badgeColor: 'badge-soft-success',
      },
    ];
  });
  const filteredItems = computed(() => {
    let items = allItems.value;
    // Filter by completion status first
    if (activeFilter.value === 'completed') {
      // Show only items where the parent task/module is completed
      items = items.filter((item) => isParentCompleted(item));
    } else {
      // For All, Tasks, Hideout tabs - hide items where parent is completed
      items = items.filter((item) => !isParentCompleted(item));
      // Then filter by type (All, Tasks, Hideout)
      if (activeFilter.value === 'tasks') {
        items = items.filter((item) => item.needType === 'taskObjective');
      } else if (activeFilter.value === 'hideout') {
        items = items.filter((item) => item.needType === 'hideoutModule');
      }
    }
    // Filter by FIR status
    if (firFilter.value === 'fir') {
      items = items.filter((item) => item.foundInRaid === true);
    } else if (firFilter.value === 'non-fir') {
      items = items.filter((item) => !item.foundInRaid);
    }
    // Filter out noisy "special equipment" items that are non-FIR (e.g., MS2000 Markers, Wi-Fi Cameras)
    items = items.filter(
      (need) =>
        need.needType !== 'taskObjective' ||
        !hideNonFirSpecialEquipment.value ||
        !isNonFirSpecialEquipment(need as NeededItemTaskObjective)
    );
    // Filter task items to only show Kappa-required quests (hideout items remain visible)
    if (kappaOnly.value) {
      items = items.filter((need) => {
        if (need.needType !== 'taskObjective') {
          return true;
        }
        const task = metadataStore.getTaskById(need.taskId);
        return task?.kappaRequired === true;
      });
    }
    // Filter by search - searches item name, task name, and hideout station name
    if (search.value) {
      const searchLower = search.value.toLowerCase();
      items = items.filter((item) => {
        // Some task objectives use markerItem instead of item; guard against missing objects
        const itemObj = item.item || (item as NeededItemTaskObjective).markerItem;
        const itemName = itemObj?.name;
        const itemShortName = itemObj?.shortName;
        if (
          itemName?.toLowerCase()?.includes(searchLower) ||
          itemShortName?.toLowerCase()?.includes(searchLower)
        ) {
          return true;
        }
        // Search by task name for task objectives
        if (item.needType === 'taskObjective') {
          const task = metadataStore.getTaskById((item as NeededItemTaskObjective).taskId);
          if (task?.name?.toLowerCase().includes(searchLower)) {
            return true;
          }
        }
        // Search by hideout station name and level for hideout modules
        if (item.needType === 'hideoutModule') {
          const hideoutModule = (item as NeededItemHideoutModule).hideoutModule;
          const station = metadataStore.getStationById(hideoutModule.stationId);
          if (station?.name) {
            // Match station name alone (e.g., "Lavatory")
            if (station.name.toLowerCase().includes(searchLower)) {
              return true;
            }
            // Match station name with level (e.g., "Lavatory 1" or "Lavatory Level 1")
            const stationWithLevel = `${station.name} ${hideoutModule.level}`.toLowerCase();
            const stationWithLevelText =
              `${station.name} level ${hideoutModule.level}`.toLowerCase();
            if (
              stationWithLevel.includes(searchLower) ||
              stationWithLevelText.includes(searchLower)
            ) {
              return true;
            }
          }
        }
        return false;
      });
    }
    return items;
  });
  // Group items by itemId for aggregated view
  const groupedItems = computed((): GroupedItem[] => {
    const groups = new Map<string, GroupedItem>();
    for (const need of filteredItems.value) {
      const itemId = need.item?.id || (need as NeededItemTaskObjective).markerItem?.id;
      if (!itemId) continue;
      const itemData = need.item || (need as NeededItemTaskObjective).markerItem;
      if (!itemData || !itemData.name) continue;
      const existingGroup = groups.get(itemId);
      if (!existingGroup) {
        // Use defaultPreset for image display when available (e.g., weapons with attachments)
        const imageData = itemData.properties?.defaultPreset || itemData;
        groups.set(itemId, {
          itemId,
          item: {
            id: itemData.id,
            name: itemData.name,
            iconLink: imageData.iconLink || itemData.iconLink,
            image512pxLink: imageData.image512pxLink || itemData.image512pxLink,
            wikiLink: itemData.wikiLink,
            link: itemData.link,
            backgroundColor: imageData.backgroundColor || itemData.backgroundColor,
          },
          taskFir: 0,
          taskFirCurrent: 0,
          taskNonFir: 0,
          taskNonFirCurrent: 0,
          hideoutFir: 0,
          hideoutFirCurrent: 0,
          hideoutNonFir: 0,
          hideoutNonFirCurrent: 0,
          total: 0,
          currentCount: 0,
        });
      }
      const group = groups.get(itemId)!;
      const count = need.count || 1;
      // Get current count for this specific need (capped at needed)
      let needCurrentCount = 0;
      if (need.needType === 'taskObjective') {
        const objectiveCount = tarkovStore.getObjectiveCount(need.id);
        needCurrentCount = Math.min(objectiveCount ?? 0, count);
        if (need.foundInRaid) {
          group.taskFir += count;
          group.taskFirCurrent += needCurrentCount;
        } else {
          group.taskNonFir += count;
          group.taskNonFirCurrent += needCurrentCount;
        }
      } else {
        const hideoutPartCount = tarkovStore.getHideoutPartCount(need.id);
        needCurrentCount = Math.min(hideoutPartCount ?? 0, count);
        if (need.foundInRaid) {
          group.hideoutFir += count;
          group.hideoutFirCurrent += needCurrentCount;
        } else {
          group.hideoutNonFir += count;
          group.hideoutNonFirCurrent += needCurrentCount;
        }
      }
      group.currentCount += needCurrentCount;
      group.total += count;
    }
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  });
  // Display items - either grouped or individual
  const displayItems = computed(() => {
    if (groupByItem.value) {
      return groupedItems.value;
    }
    return filteredItems.value;
  });
  const initialVisibleCount = computed(() => {
    if (groupByItem.value) {
      return 20;
    }
    return viewMode.value === 'list' ? 50 : 20;
  });
  const visibleCount = ref(initialVisibleCount.value);
  // Separate computed for grouped items to ensure proper typing
  const visibleGroupedItems = computed(() => {
    return groupedItems.value.slice(0, visibleCount.value);
  });
  // Separate computed for individual items to ensure proper typing
  const visibleIndividualItems = computed(() => {
    return filteredItems.value.slice(0, visibleCount.value);
  });
  const loadMore = () => {
    if (visibleCount.value < displayItems.value.length) {
      visibleCount.value += viewMode.value === 'list' ? 50 : 20;
    }
  };
  // Sentinel refs for infinite scroll
  const listSentinel = ref<HTMLElement | null>(null);
  const gridSentinel = ref<HTMLElement | null>(null);
  // Determine which sentinel to use based on view mode and grouping
  const currentSentinel = computed(() => {
    if (groupByItem.value) return gridSentinel.value;
    return viewMode.value === 'list' ? listSentinel.value : gridSentinel.value;
  });
  // Enable infinite scroll (as computed ref for reactivity)
  const infiniteScrollEnabled = computed(() => {
    return visibleCount.value < displayItems.value.length;
  });
  // Set up infinite scroll - pass enabled as reactive ref
  useInfiniteScroll(currentSentinel, loadMore, {
    rootMargin: '200px',
    threshold: 0,
    enabled: infiniteScrollEnabled,
  });
  // Reset visible count when search or filter changes
  const resetVisibleCount = () => {
    visibleCount.value = initialVisibleCount.value;
  };
  watch(
    [search, activeFilter, firFilter, groupByItem, hideNonFirSpecialEquipment, kappaOnly, viewMode],
    () => {
      resetVisibleCount();
    }
  );
</script>
