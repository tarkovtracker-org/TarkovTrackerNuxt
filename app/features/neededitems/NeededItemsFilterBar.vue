<template>
  <div class="mb-6 space-y-3">
    <!-- Primary Filter: ALL / TASKS / HIDEOUT (Centered) -->
    <div
      class="flex flex-wrap items-center justify-center gap-1 overflow-x-auto rounded-lg bg-[hsl(240,5%,5%)] px-2 py-2 sm:gap-2 sm:px-4 sm:py-3"
    >
      <UButton
        v-for="tab in filterTabs"
        :key="tab.value"
        :variant="'ghost'"
        :color="'neutral'"
        size="sm"
        class="shrink-0 px-2 sm:px-3"
        :class="{
          'border-primary-500 rounded-none border-b-2': modelValue === tab.value,
        }"
        @click="$emit('update:modelValue', tab.value)"
      >
        <UIcon :name="tab.icon" class="h-4 w-4 sm:mr-1 sm:h-5 sm:w-5" />
        <span class="hidden text-[clamp(0.625rem,2vw,0.875rem)] sm:inline">
          {{ tab.label.toUpperCase() }}
        </span>
        <span
          :class="[
            'ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white sm:ml-2 sm:h-7 sm:min-w-7 sm:px-1.5 sm:text-sm',
            modelValue === tab.value ? 'bg-primary-500' : 'bg-gray-600',
          ]"
        >
          {{ tab.count }}
        </span>
      </UButton>
    </div>

    <!-- Unified Filter Bar: Search + Filters + Views -->
    <div
      class="flex flex-col gap-3 rounded-lg bg-[hsl(240,5%,5%)] p-3 sm:flex-row sm:items-center sm:p-4"
    >
      <!-- Search (grows to fill space) -->
      <div class="flex-1">
        <UInput
          :model-value="search"
          :placeholder="
            $t('page.neededitems.searchplaceholder', 'Search items, tasks, or hideout stations...')
          "
          icon="i-mdi-magnify"
          size="md"
          :ui="{ trailing: 'pe-1' }"
          class="w-full"
          @update:model-value="$emit('update:search', $event)"
        >
          <template v-if="search?.length" #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="i-mdi-close-circle"
              aria-label="Clear search"
              @click="$emit('update:search', '')"
            />
          </template>
        </UInput>
      </div>

      <!-- Right side controls -->
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <!-- Item count badge -->
        <UBadge color="neutral" variant="soft" size="md" class="shrink-0 px-3 py-1.5 text-sm">
          <template v-if="groupByItem && ungroupedCount !== totalCount">
            {{ totalCount }} unique ({{ ungroupedCount }} total)
          </template>
          <template v-else>{{ totalCount }} {{ $t('page.neededitems.items', 'items') }}</template>
        </UBadge>

        <!-- Divider (hidden on mobile) -->
        <div class="hidden h-6 w-px bg-white/10 sm:block" />

        <!-- Filters Popover -->
        <UPopover>
          <UButton
            icon="i-mdi-filter-variant"
            color="neutral"
            variant="ghost"
            size="sm"
            class="shrink-0"
          >
            <span class="hidden sm:inline">{{ $t('page.neededitems.filters.label', 'Filters') }}</span>
            <UBadge
              v-if="activeFiltersCount > 0"
              color="primary"
              variant="soft"
              size="sm"
              class="ml-1 px-1.5 py-0.5 sm:ml-2"
            >
              {{ activeFiltersCount }}
            </UBadge>
          </UButton>
          <template #content>
            <div class="w-80 space-y-3 p-3">
              <div class="text-surface-400 text-xs font-medium">
                {{ $t('page.neededitems.filters.sections.items', 'ITEMS') }}
              </div>
              <div class="flex flex-wrap gap-2">
                <UButton
                  :variant="firFilter === 'fir' ? 'soft' : 'ghost'"
                  :color="firFilter === 'fir' ? 'success' : 'neutral'"
                  size="sm"
                  @click="$emit('update:firFilter', firFilter === 'fir' ? 'all' : 'fir')"
                >
                  <UIcon name="i-mdi-checkbox-marked-circle" class="mr-1 h-4 w-4" />
                  {{ $t('page.neededitems.filters.fir', 'FIR') }}
                </UButton>
                <UButton
                  :variant="firFilter === 'non-fir' ? 'soft' : 'ghost'"
                  :color="firFilter === 'non-fir' ? 'warning' : 'neutral'"
                  size="sm"
                  @click="$emit('update:firFilter', firFilter === 'non-fir' ? 'all' : 'non-fir')"
                >
                  <UIcon name="i-mdi-checkbox-blank-circle-outline" class="mr-1 h-4 w-4" />
                  {{ $t('page.neededitems.filters.non_fir', 'NON-FIR') }}
                </UButton>
                <AppTooltip
                  :text="
                    $t(
                      'page.neededitems.filters.hide_non_fir_special_equipment_title',
                      'Hide non-FIR special equipment (e.g., MS2000 Markers, Wi-Fi Cameras)'
                    )
                  "
                >
                  <UButton
                    :variant="hideNonFirSpecialEquipment ? 'soft' : 'ghost'"
                    :color="hideNonFirSpecialEquipment ? 'primary' : 'neutral'"
                    size="sm"
                    @click="$emit('update:hideNonFirSpecialEquipment', !hideNonFirSpecialEquipment)"
                  >
                    <UIcon name="i-mdi-briefcase-outline" class="mr-1 h-4 w-4" />
                    {{
                      hideNonFirSpecialEquipment
                        ? $t('page.neededitems.filters.no_special', 'NO-SPECIAL')
                        : $t('page.neededitems.filters.special', 'SPECIAL')
                    }}
                  </UButton>
                </AppTooltip>
                <AppTooltip
                  :text="
                    isKappaDisabled
                      ? $t(
                          'page.neededitems.filters.kappa_only_disabled_tooltip',
                          'Kappa filter applies to tasks only.'
                        )
                      : $t(
                          'page.neededitems.filters.kappa_only_tooltip',
                          'Show only items required for Kappa quests'
                        )
                  "
                >
                  <UButton
                    :variant="kappaOnly ? 'soft' : 'ghost'"
                    :color="kappaOnly ? 'warning' : 'neutral'"
                    size="sm"
                    :disabled="isKappaDisabled"
                    @click="$emit('update:kappaOnly', !kappaOnly)"
                  >
                    <UIcon name="i-mdi-trophy" class="mr-1 h-4 w-4" />
                    {{ $t('page.neededitems.filters.kappa_only', 'KAPPA') }}
                  </UButton>
                </AppTooltip>
              </div>
              <div class="border-t border-white/10 pt-3">
                <div class="text-surface-400 mb-2 text-xs font-medium">
                  {{ $t('page.neededitems.filters.sections.team', 'TEAM') }}
                </div>
                <UButton
                  :variant="hideTeamItems ? 'soft' : 'ghost'"
                  :color="hideTeamItems ? 'error' : 'neutral'"
                  size="sm"
                  class="w-full justify-start"
                  @click="$emit('update:hideTeamItems', !hideTeamItems)"
                >
                  <UIcon name="i-mdi-account-group-outline" class="mr-1 h-4 w-4" />
                  {{
                    hideTeamItems
                      ? $t('page.neededitems.filters.hide_team_needs', 'HIDE TEAM NEEDS')
                      : $t('page.neededitems.filters.show_team_needs', 'SHOW TEAM NEEDS')
                  }}
                </UButton>
              </div>
            </div>
          </template>
        </UPopover>

        <!-- Divider (hidden on mobile) -->
        <div class="hidden h-6 w-px bg-white/10 sm:block" />

        <!-- View Mode Buttons -->
        <div class="flex gap-1">
          <UButton
            icon="i-mdi-view-list"
            :color="!groupByItem && viewMode === 'list' ? 'primary' : 'neutral'"
            :variant="!groupByItem && viewMode === 'list' ? 'soft' : 'ghost'"
            size="sm"
            @click="setViewMode('list')"
          />
          <UButton
            icon="i-mdi-view-grid"
            :color="!groupByItem && viewMode === 'grid' ? 'primary' : 'neutral'"
            :variant="!groupByItem && viewMode === 'grid' ? 'soft' : 'ghost'"
            size="sm"
            @click="setViewMode('grid')"
          />
          <UButton
            icon="i-mdi-group"
            :color="groupByItem ? 'primary' : 'neutral'"
            :variant="groupByItem ? 'soft' : 'ghost'"
            size="sm"
            @click="setGroupedView"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  type FilterType = 'all' | 'tasks' | 'hideout' | 'completed';
  type ViewMode = 'list' | 'grid';
  type FirFilter = 'all' | 'fir' | 'non-fir';
  interface FilterTab {
    label: string;
    value: FilterType;
    icon: string;
    count: number;
  }
  const props = defineProps<{
    modelValue: FilterType;
    search: string;
    viewMode: ViewMode;
    filterTabs: FilterTab[];
    totalCount: number;
    ungroupedCount: number;
    firFilter: FirFilter;
    groupByItem: boolean;
    hideTeamItems: boolean;
    hideNonFirSpecialEquipment: boolean;
    kappaOnly: boolean;
  }>();
  const emit = defineEmits<{
    'update:modelValue': [value: FilterType];
    'update:search': [value: string];
    'update:viewMode': [value: ViewMode];
    'update:firFilter': [value: FirFilter];
    'update:groupByItem': [value: boolean];
    'update:hideTeamItems': [value: boolean];
    'update:hideNonFirSpecialEquipment': [value: boolean];
    'update:kappaOnly': [value: boolean];
  }>();
  const activeFiltersCount = computed(() => {
    let count = 0;
    if (props.firFilter !== 'all') {
      count += 1;
    }
    if (props.hideNonFirSpecialEquipment) {
      count += 1;
    }
    if (props.hideTeamItems) {
      count += 1;
    }
    if (props.kappaOnly) {
      count += 1;
    }
    return count;
  });
  const isKappaDisabled = computed(() => {
    return props.modelValue === 'hideout';
  });
  const setViewMode = (mode: ViewMode) => {
    emit('update:groupByItem', false);
    emit('update:viewMode', mode);
  };
  const setGroupedView = () => {
    emit('update:groupByItem', true);
  };
</script>
