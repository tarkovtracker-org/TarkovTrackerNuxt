<template>
  <div>
    <div class="px-4 py-6">
      <TaskLoadingState v-if="isLoading" />
      <div v-else>
        <!-- Task Filter Bar -->
        <TaskFilterBar
          v-model:search-query="searchQuery"
          :single-task-id="singleTaskId"
          @clear-single-task="clearSingleTaskFilter"
        />
        <!-- Map Display (shown when MAPS view is selected) -->
        <div v-if="showMapDisplay" class="mb-6">
          <div class="rounded-lg bg-surface-base dark:bg-surface-800/50">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-lg font-medium text-content-primary">
                {{ selectedMapData?.name || 'Map' }}
                <span class="ml-2 text-sm font-normal text-content-tertiary">
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
          <UCard class="bg-white/95 dark:bg-surface-900/95 w-full max-w-xl border border-gray-200/50 dark:border-white/10 shadow-2xl backdrop-blur-sm text-gray-900 dark:text-gray-100">
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
  import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute, useRouter } from 'vue-router';
  import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
  import { useTarkovTime } from '@/composables/useTarkovTime';
  import { useTaskFiltering } from '@/composables/useTaskFiltering';
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
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n({ useScope: 'global' });
  const preferencesStore = usePreferencesStore();
  const {
    getTaskPrimaryView,
    getTaskSecondaryView,
    getTaskUserView,
    getTaskMapView,
    getTaskTraderView,
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
  // Search state
  const searchQuery = ref('');
  // Single-task mode: when ?task=<taskId> is present, show only that task
  const singleTaskId = computed(() => {
    const taskId = route.query.task as string | undefined;
    if (!taskId) return null;
    // Validate that the task exists in metadata
    const taskExists = tasks.value.some((t) => t.id === taskId);
    return taskExists ? taskId : null;
  });

  // Timestamp from route to detect re-clicks on the same task
  const navigationTimestamp = computed(() => route.query._t as string | undefined);

  // Flag to track when we're programmatically changing filters (to avoid triggering single-task clear)
  const isProgrammaticFilterChange = ref(false);

  // Store previous view state to restore when exiting single-task mode
  const previousViewState = ref<{
    primaryView: string;
    secondaryView: string;
    mapView: string;
    traderView: string;
  } | null>(null);

  // When entering single-task mode (or re-clicking same task), configure view settings
  watch([singleTaskId, navigationTimestamp], ([taskId, _timestamp], [oldTaskId, _oldTimestamp]) => {
    if (!taskId) return;

    isProgrammaticFilterChange.value = true;

    // Scroll to top of page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Store current view state before changing (only if not already in single-task mode)
    if (!oldTaskId) {
      previousViewState.value = {
        primaryView: getTaskPrimaryView.value,
        secondaryView: getTaskSecondaryView.value,
        mapView: getTaskMapView.value,
        traderView: getTaskTraderView.value,
      };
    }

    // Always set secondary view to 'all' so the task is visible regardless of status
    if (getTaskSecondaryView.value !== 'all') {
      preferencesStore.setTaskSecondaryView('all');
    }

    // Find the task to check for related maps
    const task = tasks.value.find((t) => t.id === taskId);
    let targetMap: string | undefined;

    if (task && Array.isArray(task.objectives)) {
      // Build a map of mapId -> hasIncompleteObjective
      const mapIncompleteStatus = new Map<string, boolean>();
      const orderedMapIds: string[] = [];

      for (const obj of task.objectives) {
        if (!Array.isArray(obj.maps)) continue;

        const isComplete = tarkovStore.isTaskObjectiveComplete(obj.id);

        for (const objMap of obj.maps) {
          if (!objMap?.id) continue;

          // Track map order (first occurrence)
          if (!orderedMapIds.includes(objMap.id)) {
            orderedMapIds.push(objMap.id);
          }

          // Mark map as having incomplete objective if any objective is incomplete
          if (!isComplete) {
            mapIncompleteStatus.set(objMap.id, true);
          } else if (!mapIncompleteStatus.has(objMap.id)) {
            mapIncompleteStatus.set(objMap.id, false);
          }
        }
      }

      // Find first map with an incomplete objective, otherwise use first map
      const firstIncompleteMap = orderedMapIds.find((id) => mapIncompleteStatus.get(id) === true);
      targetMap = firstIncompleteMap ?? orderedMapIds[0];

      if (targetMap) {
        // Task has map objectives - switch to maps view
        preferencesStore.setTaskPrimaryView('maps');
        preferencesStore.setTaskMapView(targetMap);

        // Update URL with map parameter for persistence (without triggering navigation)
        const currentQuery = { ...route.query };
        if (currentQuery.map !== targetMap) {
          router.replace({ query: { ...currentQuery, map: targetMap } });
        }
      } else {
        // Task has no map objectives - use 'all' view
        preferencesStore.setTaskPrimaryView('all');
      }
    } else {
      // Task not found or has no objectives - use 'all' view
      preferencesStore.setTaskPrimaryView('all');
    }

    // Reset flag after the reactive update propagates
    nextTick(() => {
      isProgrammaticFilterChange.value = false;
    });
  });

  // Clear single-task filter when user interacts with any filter
  watch(
    [
      getTaskPrimaryView,
      getTaskSecondaryView,
      getTaskMapView,
      getTaskTraderView,
      getTaskUserView,
      searchQuery,
    ],
    () => {
      // Skip if we're programmatically changing filters upon entering single-task mode
      if (isProgrammaticFilterChange.value) {
        return;
      }
      // If we're in single-task mode and the user changed a filter, clear the query param
      if (route.query.task) {
        // Restore previous view state if available
        if (previousViewState.value) {
          isProgrammaticFilterChange.value = true;
          preferencesStore.setTaskPrimaryView(previousViewState.value.primaryView);
          preferencesStore.setTaskSecondaryView(previousViewState.value.secondaryView);
          preferencesStore.setTaskMapView(previousViewState.value.mapView);
          preferencesStore.setTaskTraderView(previousViewState.value.traderView);
          previousViewState.value = null;
          nextTick(() => {
            isProgrammaticFilterChange.value = false;
          });
        }
        // Use push for browser history support
        router.push({ path: '/tasks', query: {} });
      }
    }
  );
  // Clear single task filter and return to normal view
  const clearSingleTaskFilter = () => {
    router.push({ path: '/tasks', query: {} });
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
