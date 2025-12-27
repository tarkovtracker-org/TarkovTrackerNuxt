<template>
  <div class="mb-6 space-y-3">
    <!-- Primary View Filter: ALL / MAPS / TRADERS (Centered) -->
    <div class="flex items-center justify-center gap-2 rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3">
      <UButton
        :variant="'ghost'"
        :color="'neutral'"
        size="md"
        :aria-pressed="primaryView === 'all'"
        :class="{
          'border-primary-500 rounded-none border-b-2': primaryView === 'all',
        }"
        @click="setPrimaryView('all')"
      >
        <UIcon name="i-mdi-checkbox-multiple-marked" class="mr-2 h-5 w-5" />
        {{ t('page.tasks.primaryviews.all').toUpperCase() }}
      </UButton>
      <UButton
        :variant="'ghost'"
        :color="'neutral'"
        size="md"
        :aria-pressed="primaryView === 'maps'"
        :class="{
          'border-primary-500 rounded-none border-b-2': primaryView === 'maps',
        }"
        @click="setPrimaryView('maps')"
      >
        <UIcon name="i-mdi-map" class="mr-2 h-5 w-5" />
        {{ t('page.tasks.primaryviews.maps').toUpperCase() }}
      </UButton>
      <UButton
        :variant="'ghost'"
        :color="'neutral'"
        size="md"
        :aria-pressed="primaryView === 'traders'"
        :class="{
          'border-primary-500 rounded-none border-b-2': primaryView === 'traders',
        }"
        @click="setPrimaryView('traders')"
      >
        <UIcon name="i-mdi-account-group" class="mr-2 h-5 w-5" />
        {{ t('page.tasks.primaryviews.traders').toUpperCase() }}
      </UButton>
    </div>
    <!-- Secondary filters container - responsive stacking -->
    <div class="flex w-full flex-wrap gap-3">
      <!-- Section 0: Search bar -->
      <div class="flex min-w-[200px] flex-1 items-center rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3">
        <UInput
          :model-value="searchQuery"
          :placeholder="t('page.tasks.search.placeholder', 'Search tasks...')"
          :aria-label="t('page.tasks.search.ariaLabel', 'Search tasks')"
          icon="i-mdi-magnify"
          :ui="{ trailing: 'pe-1' }"
          class="w-full"
          @update:model-value="$emit('update:searchQuery', $event)"
        >
          <template v-if="searchQuery?.length" #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="i-mdi-close-circle"
              aria-label="Clear search"
              @click="$emit('update:searchQuery', '')"
            />
          </template>
        </UInput>
      </div>
      <!-- Section 1: Status filters (ALL / AVAILABLE / LOCKED / COMPLETED) - scrollable on mobile -->
      <div
        class="flex w-auto items-center gap-1 overflow-x-auto rounded-lg bg-[hsl(240,5%,5%)] px-2 py-2 sm:gap-2 sm:px-4 sm:py-3"
      >
        <UButton
          :variant="'ghost'"
          :color="'neutral'"
          size="sm"
          class="shrink-0"
          :aria-pressed="secondaryView === 'all'"
          :class="{
            'border-primary-500 rounded-none border-b-2': secondaryView === 'all',
          }"
          @click="setSecondaryView('all')"
        >
          <UIcon name="i-mdi-format-list-bulleted" class="mr-1 hidden h-4 w-4 sm:block" />
          <span class="text-xs sm:text-sm">
            {{ t('page.tasks.secondaryviews.all', 'ALL').toUpperCase() }}
          </span>
          <span
            class="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-bold text-white sm:ml-2 sm:h-7 sm:min-w-7 sm:px-1.5 sm:text-sm"
          >
            {{ statusCounts.all }}
          </span>
        </UButton>
        <UButton
          :variant="'ghost'"
          :color="'neutral'"
          size="sm"
          class="shrink-0"
          :aria-pressed="secondaryView === 'available'"
          :class="{
            'border-primary-500 rounded-none border-b-2': secondaryView === 'available',
          }"
          @click="setSecondaryView('available')"
        >
          <UIcon name="i-mdi-clipboard-text" class="mr-1 hidden h-4 w-4 sm:block" />
          <span class="text-xs sm:text-sm">
            {{ t('page.tasks.secondaryviews.available').toUpperCase() }}
          </span>
          <span
            class="bg-primary-500 ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white sm:ml-2 sm:h-7 sm:min-w-7 sm:px-1.5 sm:text-sm"
          >
            {{ statusCounts.available }}
          </span>
        </UButton>
        <UButton
          :variant="'ghost'"
          :color="'neutral'"
          size="sm"
          class="shrink-0"
          :aria-pressed="secondaryView === 'locked'"
          :class="{
            'border-primary-500 rounded-none border-b-2': secondaryView === 'locked',
          }"
          @click="setSecondaryView('locked')"
        >
          <UIcon name="i-mdi-lock" class="mr-1 hidden h-4 w-4 sm:block" />
          <span class="text-xs sm:text-sm">
            {{ t('page.tasks.secondaryviews.locked').toUpperCase() }}
          </span>
          <span
            class="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-600 px-1 text-xs font-bold text-white sm:ml-2 sm:h-7 sm:min-w-7 sm:px-1.5 sm:text-sm"
          >
            {{ statusCounts.locked }}
          </span>
        </UButton>
        <UButton
          :variant="'ghost'"
          :color="'neutral'"
          size="sm"
          class="shrink-0"
          :aria-pressed="secondaryView === 'completed'"
          :class="{
            'border-primary-500 rounded-none border-b-2': secondaryView === 'completed',
          }"
          @click="setSecondaryView('completed')"
        >
          <UIcon name="i-mdi-check-circle" class="mr-1 hidden h-4 w-4 sm:block" />
          <span class="text-xs sm:text-sm">
            {{ t('page.tasks.secondaryviews.completed').toUpperCase() }}
          </span>
          <span
            class="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1 text-xs font-bold text-white sm:ml-2 sm:h-7 sm:min-w-7 sm:px-1.5 sm:text-sm"
          >
            {{ statusCounts.completed }}
          </span>
        </UButton>
      </div>
      <!-- Section 2: Player/Team view buttons - grows to fill space -->
      <div
        class="flex flex-1 items-center justify-center gap-2 overflow-x-auto rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3"
      >
        <!-- Self button with display name -->
        <UButton
          :variant="'ghost'"
          :color="'neutral'"
          size="sm"
          :aria-pressed="preferencesStore.getTaskUserView === 'self'"
          :class="{
            'border-primary-500 rounded-none border-b-2':
              preferencesStore.getTaskUserView === 'self',
          }"
          @click="
            onUserViewSelect({
              label: currentUserDisplayName,
              value: 'self',
            })
          "
        >
          <UIcon name="i-mdi-account-circle" class="mr-1 h-4 w-4" />
          {{ currentUserDisplayName.toUpperCase() }}
          <UBadge size="xs" color="primary" variant="solid" class="ml-2">YOU</UBadge>
        </UButton>
        <!-- Individual teammate buttons -->
        <UButton
          v-for="teamId in visibleTeammates"
          :key="teamId"
          :variant="'ghost'"
          :color="'neutral'"
          size="sm"
          :aria-pressed="preferencesStore.getTaskUserView === teamId"
          :class="{
            'border-primary-500 rounded-none border-b-2':
              preferencesStore.getTaskUserView === teamId,
          }"
          @click="
            onUserViewSelect({
              label: getTeammateDisplayName(teamId),
              value: teamId,
            })
          "
        >
          <UIcon name="i-mdi-account" class="mr-1 h-4 w-4" />
          {{ getTeammateDisplayName(teamId).toUpperCase() }}
        </UButton>
        <!-- All button (only show if there are teammates) -->
        <UButton
          v-if="visibleTeammates.length > 0"
          :variant="'ghost'"
          :color="'neutral'"
          size="sm"
          :aria-pressed="preferencesStore.getTaskUserView === 'all'"
          :class="{
            'border-primary-500 rounded-none border-b-2':
              preferencesStore.getTaskUserView === 'all',
          }"
          @click="
            onUserViewSelect({
              label: t('page.tasks.userviews.all'),
              value: 'all',
            })
          "
        >
          <UIcon name="i-mdi-account-multiple" class="mr-1 h-4 w-4" />
          {{ t('page.tasks.userviews.all').toUpperCase() }}
        </UButton>
      </div>
      <!-- Section 3: Settings button - fixed width -->
      <div class="flex w-auto items-center rounded-lg bg-[hsl(240,5%,5%)] px-4 py-3">
        <TaskSettingsModal />
      </div>
    </div>
    <!-- Map selector (shown when MAPS is selected) -->
    <div v-if="primaryView === 'maps' && maps.length > 0" class="flex justify-center gap-2">
      <USelectMenu
        :model-value="selectedMapObject"
        :items="mapOptions"
        class="min-w-[200px]"
        size="md"
        @update:model-value="onMapSelect"
      >
        <template #leading>
          <UIcon name="i-mdi-map-marker" class="h-5 w-5" />
        </template>
      </USelectMenu>

      <UButton @click="$emit('update:showMap', !showMap)">
        {{ showMap ? 'Hide Map' : 'Show Map' }}
      </UButton>
    </div>
    <!-- Trader selector (shown when TRADERS is selected) - Horizontal scrollable -->
    <div v-if="primaryView === 'traders' && traders.length > 0" class="w-full overflow-x-auto">
      <div class="flex w-max min-w-full gap-3 rounded-lg bg-[hsl(240,5%,5%)] px-2 py-2">
        <button
          v-for="trader in traders"
          :key="trader.id"
          type="button"
          :aria-pressed="preferencesStore.getTaskTraderView === trader.id"
          :class="[
            'flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-3 transition-all',
            'relative w-28',
            'hover:bg-white/5',
            'focus:ring-primary-500 focus:ring-offset-surface-900 focus:ring-2 focus:ring-offset-2 focus:outline-none',
            preferencesStore.getTaskTraderView === trader.id
              ? 'border-primary-500 border-b-2 bg-white/10'
              : 'border-b-2 border-transparent',
          ]"
          @click="onTraderSelect({ label: trader.name, value: trader.id })"
        >
          <div class="relative h-12 w-12">
            <div class="h-12 w-12 overflow-hidden rounded-full bg-gray-800">
              <img
                v-if="trader.imageLink"
                :src="trader.imageLink"
                :alt="trader.name"
                class="h-full w-full object-cover"
              />
              <UIcon v-else name="i-mdi-account-circle" class="h-full w-full text-gray-400" />
            </div>
            <span
              :class="[
                'absolute -top-1 -right-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[hsl(240,5%,5%)] px-1 text-sm font-bold text-white',
                (traderCounts[trader.id] ?? 0) > 0 ? 'bg-primary-500' : 'bg-gray-600',
              ]"
            >
              {{ traderCounts[trader.id] ?? 0 }}
            </span>
          </div>
          <span class="text-xs font-medium whitespace-nowrap text-gray-300">{{ trader.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useTaskFiltering } from '@/composables/useTaskFiltering';
  import TaskSettingsModal from '@/features/tasks/TaskSettingsModal.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTeamStore } from '@/stores/useTeamStore';
  defineProps<{
    searchQuery: string;
    showMap: boolean;
  }>();
  defineEmits<{
    'update:searchQuery': [value: string];
    'update:showMap': [value: boolean];
  }>();
  const { t } = useI18n({ useScope: 'global' });
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const progressStore = useProgressStore();
  const teamStore = useTeamStore();
  const { calculateStatusCounts, calculateTraderCounts } = useTaskFiltering();
  const maps = computed(() => metadataStore.maps);
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
    return maps.value.map((map) => ({
      label: map.name,
      value: map.id,
    }));
  });
  const selectedMapObject = computed(() => {
    const currentMapId = preferencesStore.getTaskMapView;
    return mapOptions.value.find((option) => option.value === currentMapId) || mapOptions.value[0];
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
