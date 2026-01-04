<template>
  <div>
    <div class="px-4 py-6">
      <TaskLoadingState v-if="isLoading" />
      <div v-else>
        <!-- Task Filter Bar -->
        <TaskFilterBar
          v-model:search-query="searchQuery"
          :single-task-id="singleTaskId"
          :primary-view="getTaskPrimaryView"
          :secondary-view="getTaskSecondaryView"
          :map-view="getTaskMapView"
          :trader-view="getTaskTraderView"
          @clear-single-task="clearSingleTaskFilter"
          @update:primary-view="handlePrimaryViewChange"
          @update:secondary-view="(v) => setFilters({ status: v, task: null })"
          @update:map-view="(v) => setFilters({ map: v, task: null })"
          @update:trader-view="(v) => setFilters({ trader: v, task: null })"
        />
        <!-- Map Display (shown when MAPS view is selected) -->
        <div v-if="showMapDisplay" class="mb-6">
          <div class="bg-surface-base dark:bg-surface-800/50 rounded-lg">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-content-primary text-lg font-medium">
                {{ selectedMapData?.name || 'Map' }}
                <span class="text-content-tertiary ml-2 text-sm font-normal">
                  {{ displayTime }}
                </span>
              </h3>
            </div>
            <LeafletMapComponent
              v-if="selectedMapData"
              :map="selectedMapData"
              :marks="mapObjectiveMarks"
              :show-extracts="true"
              :show-extract-toggle="true"
              :show-legend="true"
            />
            <UAlert
              v-else
              icon="i-mdi-alert-circle"
              color="warning"
              variant="soft"
              title="No map data available for this selection."
            />
          </div>
        </div>
        <div v-if="filteredTasks.length === 0" class="py-6">
          <TaskEmptyState />
        </div>
        <div v-else class="space-y-4" data-testid="task-list">
          <TaskCard
            v-for="task in paginatedTasks"
            :key="task.id"
            :task="task"
            @on-task-action="onTaskAction"
          />
          <!-- Sentinel for infinite scroll -->
          <div v-if="displayCount < filteredTasks.length" ref="tasksSentinel" class="h-1" />
        </div>
      </div>
    </div>
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-3"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-3"
      >
        <div
          v-if="taskStatusUpdated"
          class="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <UCard
            class="dark:bg-surface-900/95 w-full max-w-xl border border-gray-200/50 bg-white/95 text-gray-900 shadow-2xl backdrop-blur-sm dark:border-white/10 dark:text-gray-100"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span
                class="text-sm sm:text-base"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {{ taskStatus }}
              </span>
              <div class="flex flex-1 justify-end gap-2">
                <UButton
                  v-if="showUndoButton"
                  size="xs"
                  variant="soft"
                  color="primary"
                  @click="undoLastAction"
                >
                  {{ t('page.tasks.questcard.undo') }}
                </UButton>
                <UButton size="xs" variant="ghost" color="secondary" @click="closeNotification">
                  {{ t('page.tasks.filters.close') }}
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
<script setup lang="ts">
  import { storeToRefs } from 'pinia';
  import { computed, defineAsyncComponent, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
  import { usePageFilters } from '@/composables/usePageFilters';
  import { useTarkovTime } from '@/composables/useTarkovTime';
  import { useTaskFiltering } from '@/composables/useTaskFiltering';
  import { useTasksFilterConfig } from '@/features/tasks/composables/useTasksFilterConfig';
  import TaskCard from '@/features/tasks/TaskCard.vue';
  import TaskEmptyState from '@/features/tasks/TaskEmptyState.vue';
  import TaskLoadingState from '@/features/tasks/TaskLoadingState.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { Task, TaskObjective } from '@/types/tarkov';
  import { logger } from '@/utils/logger';
  // Lazy load LeafletMap for performance
  const LeafletMapComponent = defineAsyncComponent(() => import('@/features/maps/LeafletMap.vue'));
  // Page metadata
  useSeoMeta({
    title: 'Tasks',
    description:
      'Track your Escape from Tarkov quest progress. View quest objectives, rewards, and dependencies for both PVP and PVE game modes.',
  });
  const router = useRouter();
  const { t } = useI18n({ useScope: 'global' });
  const preferencesStore = usePreferencesStore();
  const {
    getTaskUserView,
    getHideNonKappaTasks,
    getShowNonSpecialTasks,
    getShowLightkeeperTasks,
    getShowEodTasks,
  } = storeToRefs(preferencesStore);
  const metadataStore = useMetadataStore();
  const { tasks, loading: tasksLoading } = storeToRefs(metadataStore);
  // Use mapsWithSvg getter to get maps with merged SVG config from maps.json
  const maps = computed(() => metadataStore.mapsWithSvg);
  const progressStore = useProgressStore();
  const { tasksCompletions, unlockedTasks, tasksFailed: _tasksFailed } = storeToRefs(progressStore);
  const { visibleTasks, reloadingTasks, updateVisibleTasks } = useTaskFiltering();
  const tarkovStore = useTarkovStore();
  const { tarkovTime } = useTarkovTime();

  // URL-based filter state (URL is single source of truth)
  // Filter config is extracted to useTasksFilterConfig for sharing with navigation
  const { filters, setFilter, setFilters, debouncedInputs } = usePageFilters(useTasksFilterConfig());

  // Computed aliases for cleaner template/code access
  const getTaskPrimaryView = filters.view;
  const getTaskSecondaryView = filters.status;
  const getTaskMapView = filters.map;
  const getTaskTraderView = filters.trader;
  const singleTaskId = computed(() => {
    const taskId = filters.task.value;
    if (!taskId) return null;
    // Validate that the task exists in metadata
    const taskExists = tasks.value.some((t) => t.id === taskId);
    return taskExists ? taskId : null;
  });
  const searchQuery = debouncedInputs.search!;

  // Handle primary view changes with scoped URL params + localStorage persistence
  // - URL only contains params relevant to current view
  // - Switching views saves outgoing state to localStorage and restores incoming state
  const VIEW_STORAGE_KEYS = {
    maps: 'tarkovTracker.tasks.lastMap',
    traders: 'tarkovTracker.tasks.lastTrader',
  } as const;

  const handlePrimaryViewChange = (view: string) => {
    const currentView = getTaskPrimaryView.value;

    // Save outgoing view's state to localStorage before switching
    if (currentView === 'maps' && getTaskMapView.value !== 'all') {
      localStorage.setItem(VIEW_STORAGE_KEYS.maps, getTaskMapView.value);
    } else if (currentView === 'traders' && getTaskTraderView.value !== 'all') {
      localStorage.setItem(VIEW_STORAGE_KEYS.traders, getTaskTraderView.value);
    }

    // Build updates with ONLY params scoped to the target view
    // Also clear task param to exit single-task mode
    const updates: Record<string, string | null> = {
      view,
      task: null, // Exit single-task mode
      // Clear params not relevant to target view
      map: null,
      trader: null,
    };

    // Restore target view's state from localStorage (or use first item as fallback)
    if (view === 'maps') {
      const lastMap = localStorage.getItem(VIEW_STORAGE_KEYS.maps);
      const validMap = lastMap && maps.value.some((m) => m.id === lastMap);
      updates.map = validMap ? lastMap : maps.value[0]?.id ?? 'all';
    } else if (view === 'traders') {
      const lastTrader = localStorage.getItem(VIEW_STORAGE_KEYS.traders);
      const validTrader = lastTrader && metadataStore.sortedTraders.some((t) => t.id === lastTrader);
      updates.trader = validTrader ? lastTrader : metadataStore.sortedTraders[0]?.id ?? 'all';
    }

    setFilters(updates);
  };

  // Ensure map/trader views always have a selection (default to first item if 'all')
  // This handles the case where a user lands directly on the page with view=maps or view=traders
  // but no specific map/trader selection in the URL
  watch(
    [getTaskPrimaryView, getTaskMapView, getTaskTraderView, maps, () => metadataStore.sortedTraders],
    ([view, mapView, traderView, mapsData, tradersData]) => {
      if (view === 'maps' && mapView === 'all' && mapsData.length > 0) {
        // Default to first map when maps view is active but no map selected
        setFilter('map', mapsData[0].id);
      } else if (view === 'traders' && traderView === 'all' && tradersData.length > 0) {
        // Default to first trader when traders view is active but no trader selected
        setFilter('trader', tradersData[0].id);
      }
    },
    { immediate: true }
  );

  // Maps with static/fixed raid times (don't follow normal day/night cycle)
  const STATIC_TIME_MAPS: Record<string, string> = {
    '55f2d3fd4bdc2d5f408b4567': '15:28 / 03:28', // Factory
    '5b0fc42d86f7744a585f9105': '15:28 / 03:28', // The Lab
  };
  type MapObjectiveZone = { map: { id: string }; outline: { x: number; z: number }[] };
  type MapObjectiveLocation = {
    map: { id: string };
    positions?: Array<{ x: number; y?: number; z: number }>;
  };
  type MapObjectiveMark = {
    id?: string;
    zones: MapObjectiveZone[];
    possibleLocations?: MapObjectiveLocation[];
    users?: string[];
  };
  // Map display state
  const showMapDisplay = computed(() => {
    return getTaskPrimaryView.value === 'maps' && getTaskMapView.value !== 'all';
  });
  // Determines if completed objectives should be rendered on the component map
  const shouldShowCompletedObjectives = computed(() => {
    return ['completed', 'all'].includes(getTaskSecondaryView.value);
  });
  const selectedMapData = computed(() => {
    const mapId = getTaskMapView.value;
    if (!mapId || mapId === 'all') return null;
    return maps.value.find((m) => m.id === mapId) || null;
  });
  // Display time - use static time for certain maps, dynamic for others
  const displayTime = computed(() => {
    const mapId = getTaskMapView.value;
    if (!mapId) return tarkovTime.value;
    const staticTime = STATIC_TIME_MAPS[mapId];
    return staticTime ?? tarkovTime.value;
  });
  // Compute objective markers from visible tasks for the selected map
  const mapObjectiveMarks = computed(() => {
    if (!selectedMapData.value) return [];
    const mapId = selectedMapData.value.id;
    const marks: MapObjectiveMark[] = [];

    // In single-task mode, only show objectives for the selected task
    // Otherwise, show objectives for all visible tasks
    const tasksToShow = singleTaskId.value
      ? tasks.value.filter((t) => t.id === singleTaskId.value)
      : visibleTasks.value;

    tasksToShow.forEach((task) => {
      if (!task.objectives) return;
      const objectiveMaps = metadataStore.objectiveMaps?.[task.id] ?? [];
      const objectiveGps = metadataStore.objectiveGPS?.[task.id] ?? [];
      task.objectives.forEach((obj) => {
        // Skip objectives that are already marked as complete, unless the current filter allows them
        if (tarkovStore.isTaskObjectiveComplete(obj.id) && !shouldShowCompletedObjectives.value)
          return;
        const zones: MapObjectiveZone[] = [];
        const possibleLocations: MapObjectiveLocation[] = [];
        const objectiveWithLocations = obj as TaskObjective & {
          zones?: Array<{
            map?: { id: string };
            outline?: Array<{ x: number; y?: number; z: number }>;
            position?: { x: number; y?: number; z: number };
          }>;
          possibleLocations?: Array<{
            map?: { id: string };
            positions?: Array<{ x: number; y?: number; z: number }>;
          }>;
        };
        // Zones (polygons)
        if (Array.isArray(objectiveWithLocations.zones)) {
          objectiveWithLocations.zones.forEach((zone) => {
            if (zone?.map?.id !== mapId) return;
            const outline = Array.isArray(zone.outline)
              ? zone.outline.map((point) => ({ x: point.x, z: point.z }))
              : [];
            if (outline.length >= 3) {
              zones.push({ map: { id: mapId }, outline });
            } else if (zone.position) {
              possibleLocations.push({
                map: { id: mapId },
                positions: [{ x: zone.position.x, y: zone.position.y, z: zone.position.z }],
              });
            }
          });
        }
        // Possible locations (point markers)
        if (Array.isArray(objectiveWithLocations.possibleLocations)) {
          objectiveWithLocations.possibleLocations.forEach((location) => {
            if (location?.map?.id !== mapId) return;
            const positions = Array.isArray(location.positions)
              ? location.positions.map((pos) => ({ x: pos.x, y: pos.y, z: pos.z }))
              : [];
            if (positions.length > 0) {
              possibleLocations.push({
                map: { id: mapId },
                positions,
              });
            }
          });
        }
        // GPS fallback from processed metadata (legacy/objective overlay data)
        const gpsInfo = objectiveGps.find((gps) => gps.objectiveID === obj.id);
        const isOnThisMap = objectiveMaps.some(
          (mapInfo) => mapInfo.objectiveID === obj.id && mapInfo.mapID === mapId
        );
        if (isOnThisMap && gpsInfo && (gpsInfo.x !== undefined || gpsInfo.y !== undefined)) {
          possibleLocations.push({
            map: { id: mapId },
            positions: [{ x: gpsInfo.x ?? 0, y: 0, z: gpsInfo.y ?? 0 }],
          });
        }
        if (zones.length > 0 || possibleLocations.length > 0) {
          marks.push({
            id: obj.id,
            zones,
            possibleLocations,
            users: ['self'],
          });
        }
      });
    });
    return marks;
  });
  // Toast / Undo State
  const taskStatusUpdated = ref(false);
  const taskStatus = ref('');
  const undoData = ref<{
    taskId: string;
    taskName: string;
    action: string;
  } | null>(null);
  const showUndoButton = ref(false);
  const notificationTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
  const mergedMaps = computed(() => {
    return (maps.value || []).map((map) => ({
      id: map.id,
      name: map.name,
      mergedIds: (map as unknown as { mergedIds?: string[] }).mergedIds || [map.id],
    }));
  });
  const _lightkeeperTraderId = computed(() => metadataStore.getTraderByName('lightkeeper')?.id);
  const refreshVisibleTasks = () => {
    updateVisibleTasks(
      getTaskPrimaryView.value,
      getTaskSecondaryView.value,
      getTaskUserView.value,
      getTaskMapView.value,
      getTaskTraderView.value,
      mergedMaps.value,
      tasksLoading.value
    ).catch((error) => {
      logger.error('[Tasks] Failed to refresh tasks:', error);
    });
  };
  watch(
    [
      getTaskPrimaryView,
      getTaskSecondaryView,
      getTaskUserView,
      getTaskMapView,
      getTaskTraderView,
      getHideNonKappaTasks,
      getShowNonSpecialTasks,
      getShowLightkeeperTasks,
      getShowEodTasks,
      tasksLoading,
      tasks,
      maps,
      tasksCompletions,
      unlockedTasks,
    ],
    () => {
      refreshVisibleTasks();
    },
    { immediate: true }
  );
  const isLoading = computed(
    () => !metadataStore.hasInitialized || tasksLoading.value || reloadingTasks.value
  );

  // When entering single-task mode, scroll to top and auto-set map view if task has map objectives
  // IMPORTANT: Use router.replace (not setFilters) to avoid creating duplicate history entries.
  // The user navigated to /tasks?task=xxx - any auto-adjustments should replace, not push.
  watch(singleTaskId, (taskId, oldTaskId) => {
    if (!taskId) return;

    // Scroll to top when entering single-task mode
    if (!oldTaskId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Find the task and determine best map to show
    const task = tasks.value.find((t) => t.id === taskId);
    
    // Build the replacement query - start with current query params
    const newQuery: Record<string, string> = {};
    for (const [key, value] of Object.entries(router.currentRoute.value.query)) {
      if (typeof value === 'string') {
        newQuery[key] = value;
      }
    }
    
    // Always set status to 'all' so task is visible regardless of completion state
    newQuery.status = 'all';
    
    if (task && Array.isArray(task.objectives)) {
      const mapIncompleteStatus = new Map<string, boolean>();
      const orderedMapIds: string[] = [];

      for (const obj of task.objectives) {
        if (!Array.isArray(obj.maps)) continue;
        const isComplete = tarkovStore.isTaskObjectiveComplete(obj.id);

        // Cast to access location properties
        const objectiveWithLocations = obj as typeof obj & {
          zones?: Array<{ map?: { id: string }; outline?: unknown[]; position?: unknown }>;
          possibleLocations?: Array<{ map?: { id: string }; positions?: unknown[] }>;
        };

        // Only consider objectives that have actual displayable location data
        const hasLocationData = 
          (Array.isArray(objectiveWithLocations.zones) && objectiveWithLocations.zones.length > 0) ||
          (Array.isArray(objectiveWithLocations.possibleLocations) && objectiveWithLocations.possibleLocations.length > 0);

        if (!hasLocationData) continue;

        for (const objMap of obj.maps) {
          if (!objMap?.id) continue;
          if (!orderedMapIds.includes(objMap.id)) {
            orderedMapIds.push(objMap.id);
          }
          if (!isComplete) {
            mapIncompleteStatus.set(objMap.id, true);
          } else if (!mapIncompleteStatus.has(objMap.id)) {
            mapIncompleteStatus.set(objMap.id, false);
          }
        }
      }

      const firstIncompleteMap = orderedMapIds.find((id) => mapIncompleteStatus.get(id) === true);
      const targetMap = firstIncompleteMap ?? orderedMapIds[0];

      if (targetMap) {
        // Task has map objectives - switch to maps view with that map
        newQuery.view = 'maps';
        newQuery.map = targetMap;
        // Clear trader param since we're switching to maps view
        delete newQuery.trader;
      } else {
        // Task has no displayable map objectives
        newQuery.view = 'all';
        delete newQuery.map;
        delete newQuery.trader;
      }
    } else {
      // Task not found or has no objectives
      newQuery.view = 'all';
      delete newQuery.map;
      delete newQuery.trader;
    }
    
    // Replace the current URL in place (no new history entry)
    router.replace({ query: newQuery });
  });

  // Clear single task filter
  const clearSingleTaskFilter = () => {
    setFilter('task', '');
  };
  // Filter tasks by search query OR single-task mode
  const filteredTasks = computed(() => {
    // Single-task mode takes priority
    if (singleTaskId.value) {
      const task = tasks.value.find((t) => t.id === singleTaskId.value);
      return task ? [task] : [];
    }
    // Normal filtering
    if (!searchQuery.value.trim()) {
      return visibleTasks.value;
    }
    const query = searchQuery.value.toLowerCase().trim();
    return visibleTasks.value.filter((task) => task.name?.toLowerCase().includes(query));
  });
  /*
   * Pagination state for infinite scroll
   * displayCount controls how many tasks are rendered.
   * We expand this count to reveal tasks deep in the list if needed.
   */
  const displayCount = ref(15);
  const tasksSentinel = ref<HTMLElement | null>(null);
  const paginatedTasks = computed(() => {
    return filteredTasks.value.slice(0, displayCount.value);
  });
  const loadMoreTasks = () => {
    if (displayCount.value < filteredTasks.value.length) {
      displayCount.value += 15;
    }
  };
  // Setup infinite scroll
  const infiniteScrollEnabled = computed(() => displayCount.value < filteredTasks.value.length);
  const { stop: _stopInfiniteScroll, start: _startInfiniteScroll } = useInfiniteScroll(
    tasksSentinel,
    loadMoreTasks,
    { rootMargin: '200px', threshold: 0.1, enabled: infiniteScrollEnabled }
  );
  watch(
    [searchQuery, getTaskSecondaryView, getTaskPrimaryView, getTaskMapView, getTaskTraderView],
    () => {
      displayCount.value = 15;
    }
  );
  // Note: Single-task mode via ?task=<id> is now handled reactively via singleTaskId computed.
  // No scroll logic needed - we simply filter to show only that task.
  // Helper Methods for Undo
  const handleTaskObjectives = (
    objectives: TaskObjective[],
    action: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    objectives.forEach((o) => {
      if (action === 'setTaskObjectiveComplete') {
        tarkovStore.setTaskObjectiveComplete(o.id);
        // When completing objectives, also set the count to the required amount
        if (o.count !== undefined && o.count > 0) {
          tarkovStore.setObjectiveCount(o.id, o.count);
        }
      } else {
        // When uncompleting, only uncomplete if count is below the required amount
        const currentCount = tarkovStore.getObjectiveCount(o.id);
        const requiredCount = o.count ?? 1;
        if (currentCount < requiredCount) {
          tarkovStore.setTaskObjectiveUncomplete(o.id);
        }
      }
    });
  };
  const clearTaskObjectives = (objectives: TaskObjective[]) => {
    objectives.forEach((objective) => {
      if (!objective?.id) return;
      tarkovStore.setTaskObjectiveUncomplete(objective.id);
      const currentCount = tarkovStore.getObjectiveCount(objective.id);
      if ((objective.count ?? 0) > 0 || currentCount > 0) {
        tarkovStore.setObjectiveCount(objective.id, 0);
      }
    });
  };
  const handleAlternatives = (
    alternatives: string[] | undefined,
    taskAction: 'setTaskComplete' | 'setTaskUncompleted' | 'setTaskFailed',
    objectiveAction: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    if (!Array.isArray(alternatives)) return;
    alternatives.forEach((a: string) => {
      if (taskAction === 'setTaskComplete') {
        tarkovStore.setTaskComplete(a);
      } else if (taskAction === 'setTaskUncompleted') {
        tarkovStore.setTaskUncompleted(a);
      } else if (taskAction === 'setTaskFailed') {
        tarkovStore.setTaskFailed(a);
      }
      const alternativeTask = tasks.value.find((task) => task.id === a);
      if (alternativeTask?.objectives) {
        if (taskAction === 'setTaskFailed') {
          clearTaskObjectives(alternativeTask.objectives);
        } else {
          handleTaskObjectives(alternativeTask.objectives, objectiveAction);
        }
      }
    });
  };
  const updateTaskStatus = (statusKey: string, taskName: string, showUndo = false) => {
    // Clear any existing timeout
    if (notificationTimeout.value !== null) {
      clearTimeout(notificationTimeout.value);
      notificationTimeout.value = null;
    }
    taskStatus.value = t(statusKey, { name: taskName });
    taskStatusUpdated.value = true;
    showUndoButton.value = showUndo;
    // Auto-close after 5 seconds (matching toast default timeout)
    notificationTimeout.value = setTimeout(() => {
      taskStatusUpdated.value = false;
      notificationTimeout.value = null;
    }, 5000);
  };
  const closeNotification = () => {
    if (notificationTimeout.value !== null) {
      clearTimeout(notificationTimeout.value);
      notificationTimeout.value = null;
    }
    taskStatusUpdated.value = false;
  };
  const onTaskAction = (event: {
    taskId: string;
    taskName: string;
    action: string;
    undoKey?: string;
    statusKey?: string;
  }) => {
    undoData.value = {
      taskId: event.taskId,
      taskName: event.taskName,
      action: event.action,
    };
    if (event.undoKey) {
      updateTaskStatus(event.undoKey, event.taskName, false);
    } else if (event.statusKey) {
      updateTaskStatus(event.statusKey, event.taskName, true);
    }
  };
  const undoLastAction = () => {
    if (!undoData.value) return;
    const { taskId, taskName, action } = undoData.value;
    if (action === 'complete') {
      // Undo completion by setting task as uncompleted
      tarkovStore.setTaskUncompleted(taskId);
      // Find the task to handle objectives and alternatives
      const taskToUndo = tasks.value.find((task) => task.id === taskId);
      if (taskToUndo?.objectives) {
        handleTaskObjectives(taskToUndo.objectives, 'setTaskObjectiveUncomplete');
        // Using taskToUndo with optional alternatives property
        handleAlternatives(
          (taskToUndo as Task & { alternatives?: string[] }).alternatives,
          'setTaskUncompleted',
          'setTaskObjectiveUncomplete'
        );
      }
      updateTaskStatus('page.tasks.questcard.undocomplete', taskName);
    } else if (action === 'uncomplete') {
      // Undo uncompleting by setting task as completed
      tarkovStore.setTaskComplete(taskId);
      // Find the task to handle objectives and alternatives
      const taskToUndo = tasks.value.find((task) => task.id === taskId);
      if (taskToUndo?.objectives) {
        handleTaskObjectives(taskToUndo.objectives, 'setTaskObjectiveComplete');
        // Using taskToUndo with optional alternatives property
        handleAlternatives(
          (taskToUndo as Task & { alternatives?: string[] }).alternatives,
          'setTaskFailed',
          'setTaskObjectiveComplete'
        );
        // Ensure min level for completion
        const minLevel = taskToUndo.minPlayerLevel;
        if (minLevel !== undefined && tarkovStore.playerLevel() < minLevel) {
          tarkovStore.setLevel(minLevel);
        }
      }
      updateTaskStatus('page.tasks.questcard.undouncomplete', taskName);
    } else if (action === 'resetfailed') {
      // Undo reset by restoring failed state (without altering alternatives)
      tarkovStore.setTaskFailed(taskId);
      const taskToUndo = tasks.value.find((task) => task.id === taskId);
      if (taskToUndo?.objectives) {
        clearTaskObjectives(taskToUndo.objectives);
      }
      updateTaskStatus('page.tasks.questcard.undoresetfailed', taskName);
    } else if (action === 'fail') {
      // Undo manual fail by clearing completion/failed flags
      tarkovStore.setTaskUncompleted(taskId);
      const taskToUndo = tasks.value.find((task) => task.id === taskId);
      if (taskToUndo?.objectives) {
        handleTaskObjectives(taskToUndo.objectives, 'setTaskObjectiveUncomplete');
      }
      updateTaskStatus('page.tasks.questcard.undofailed', taskName);
    }
    showUndoButton.value = false;
    undoData.value = null;
  };
</script>
