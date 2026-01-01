<template>
  <div>
    <div class="px-4 py-6">
      <TaskLoadingState v-if="isLoading" />
      <div v-else>
        <!-- Task Filter Bar -->
        <TaskFilterBar v-model:search-query="searchQuery" />
        <!-- Map Display (shown when MAPS view is selected) -->
        <div v-if="showMapDisplay" class="mb-6">
          <div class="bg-surface-800/50 rounded-lg p-4">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-200">
                {{ selectedMapData?.name || 'Map' }}
                <span class="ml-2 text-sm font-normal text-gray-400">
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
          <UCard class="bg-surface-900/95 w-full max-w-xl border border-white/10 shadow-2xl">
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
  const { tasksCompletions, unlockedTasks, tasksFailed } = storeToRefs(progressStore);
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
    return ['completed', 'all'].includes(getTaskSecondaryView.value as string);
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
    // Get objectives from visible tasks that have location data for this map
    visibleTasks.value.forEach((task) => {
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
  const lightkeeperTraderId = computed(() => metadataStore.getTraderByName('lightkeeper')?.id);
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
  // Filter tasks by search query
  const filteredTasks = computed(() => {
    if (!searchQuery.value.trim()) {
      return visibleTasks.value;
    }
    const query = searchQuery.value.toLowerCase().trim();
    return visibleTasks.value.filter((task) => task.name?.toLowerCase().includes(query));
  });
  // Pagination state for infinite scroll
  const displayCount = ref(15);
  const tasksSentinel = ref<HTMLElement | null>(null);
  const focusedTaskId = ref<string | null>(null);
  const paginatedTasks = computed(() => {
    const baseTasks = filteredTasks.value.slice(0, displayCount.value);
    // If there's a focused task not in the current page, prepend it
    if (focusedTaskId.value) {
      const focusedTask = filteredTasks.value.find((t) => t.id === focusedTaskId.value);
      if (focusedTask && !baseTasks.some((t) => t.id === focusedTaskId.value)) {
        return [focusedTask, ...baseTasks];
      }
    }
    return baseTasks;
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
  // Reset pagination and clear focused task when filters or search changes
  watch(
    [searchQuery, getTaskSecondaryView, getTaskPrimaryView, getTaskMapView, getTaskTraderView],
    () => {
      displayCount.value = 15;
      focusedTaskId.value = null;
    }
  );
  // Handle deep linking to a specific task via ?task=taskId query param
  const getTaskStatus = (taskId: string): 'available' | 'locked' | 'completed' | 'failed' => {
    const isFailed = tasksFailed.value?.[taskId]?.['self'] ?? false;
    if (isFailed) return 'failed';
    const isCompleted = tasksCompletions.value?.[taskId]?.['self'] ?? false;
    if (isCompleted) return 'completed';
    const isUnlocked = unlockedTasks.value?.[taskId]?.['self'] ?? false;
    if (isUnlocked) return 'available';
    return 'locked';
  };
  const scrollToTask = async (taskId: string) => {
    // Wait for the task to appear in filteredTasks (filters are async)
    const maxWaitTime = 2000;
    const checkInterval = 50;
    let elapsed = 0;
    while (elapsed < maxWaitTime) {
      const taskIndex = filteredTasks.value.findIndex((t) => t.id === taskId);
      if (taskIndex >= 0) {
        // Task found in filtered list - use focusedTaskId to prepend it if not in current page
        // This avoids loading hundreds of tasks just to scroll to one
        if (taskIndex >= displayCount.value) {
          focusedTaskId.value = taskId;
        }
        await nextTick();
        // Small delay to ensure DOM is fully rendered
        setTimeout(() => {
          const taskElement = document.getElementById(`task-${taskId}`);
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a brief highlight effect
            taskElement.classList.add(
              'ring-2',
              'ring-primary-500',
              'ring-offset-2',
              'ring-offset-surface-900'
            );
            setTimeout(() => {
              taskElement.classList.remove(
                'ring-2',
                'ring-primary-500',
                'ring-offset-2',
                'ring-offset-surface-900'
              );
            }, 2000);
          }
        }, 100);
        return;
      }
      // Wait and check again
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }
  };
  const handleTaskQueryParam = () => {
    const taskId = route.query.task as string;
    if (!taskId || tasksLoading.value) return;
    const taskInMetadata = tasks.value.find((t) => t.id === taskId);
    if (!taskInMetadata) return;
    // Enable the appropriate type filter based on task properties
    const isKappaRequired = taskInMetadata.kappaRequired === true;
    const isLightkeeperRequired = taskInMetadata.lightkeeperRequired === true;
    const isLightkeeperTraderTask =
      lightkeeperTraderId.value !== undefined
        ? taskInMetadata.trader?.id === lightkeeperTraderId.value
        : taskInMetadata.trader?.name?.toLowerCase() === 'lightkeeper';
    const isNonSpecial = !isKappaRequired && !isLightkeeperRequired && !isLightkeeperTraderTask;
    // Ensure the task's type filter is enabled so task will appear
    if (
      (isLightkeeperRequired || isLightkeeperTraderTask) &&
      !preferencesStore.getShowLightkeeperTasks
    ) {
      preferencesStore.setShowLightkeeperTasks(true);
    }
    if (isKappaRequired && preferencesStore.getHideNonKappaTasks) {
      preferencesStore.setHideNonKappaTasks(false);
    }
    if (isNonSpecial && !preferencesStore.getShowNonSpecialTasks) {
      preferencesStore.setShowNonSpecialTasks(true);
    }
    // Determine task status and set appropriate filter
    const status = getTaskStatus(taskId);
    if (preferencesStore.getTaskSecondaryView !== status) {
      preferencesStore.setTaskSecondaryView(status);
    }
    // Set primary view to 'all' to ensure the task is visible regardless of map/trader
    if (preferencesStore.getTaskPrimaryView !== 'all') {
      preferencesStore.setTaskPrimaryView('all');
    }
    // Scroll to the task after filters are applied, then clear query param
    scrollToTask(taskId).then(() => {
      // Clear the query param to avoid re-triggering on filter changes
      router.replace({ path: '/tasks', query: {} });
    });
  };
  // Watch for task query param and handle it when tasks are loaded
  watch(
    [() => route.query.task, tasksLoading, tasksCompletions],
    ([taskQueryParam, loading]) => {
      if (taskQueryParam && !loading) {
        handleTaskQueryParam();
      }
    },
    { immediate: true }
  );
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
