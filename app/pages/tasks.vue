<template>
  <div>
    <div class="px-4 py-6">
      <TaskLoadingState v-if="isLoading" />
      <div v-else>
        <!-- Task Filter Bar -->
          <TaskFilterBar 
            v-model:search-query="searchQuery" 
            v-model:show-map="showMap"
          />
        <!-- Task Map Panel -->
        <div v-if="showMap" class="mt-4">
          <ClientOnly>
            <TaskMapPanel ref="taskMapPanel" :tasks="filteredTasks" />
          </ClientOnly>
        </div>
        <div v-if="filteredTasks.length === 0" class="py-6">
          <TaskEmptyState />
        </div>
        <div v-else class="space-y-4 pt-4" data-testid="task-list">
          <TaskCard
            v-for="task in paginatedTasks"
            :key="task.id"
            :task="task"
            @on-task-action="onTaskAction"
            @objective-clicked="onObjectiveClicked"
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
  import { computed, nextTick, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute, useRouter } from 'vue-router';
  import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
  import { useTaskFiltering } from '@/composables/useTaskFiltering';
  import TaskCard from '@/features/tasks/TaskCard.vue';
  import TaskEmptyState from '@/features/tasks/TaskEmptyState.vue';
  import TaskLoadingState from '@/features/tasks/TaskLoadingState.vue';
  import TaskMapPanel from '@/features/tasks/TaskMapPanel.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { Task, TaskObjective } from '@/types/tarkov';
  import { logger } from '@/utils/logger';
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
  const { tasks, maps, loading: tasksLoading } = storeToRefs(metadataStore);
  const progressStore = useProgressStore();
  const { tasksCompletions, unlockedTasks, objectiveCompletions } = storeToRefs(progressStore);
  const { visibleTasks, reloadingTasks, updateVisibleTasks } = useTaskFiltering();
  const tarkovStore = useTarkovStore();
  const showMap = ref(false);
  const taskMapPanel = ref<InstanceType<typeof TaskMapPanel> | null>(null);
  const onObjectiveClicked = (objective: TaskObjective) => {
      // Force view to maps if not already
      if (preferencesStore.getTaskPrimaryView !== 'maps') {
        preferencesStore.setTaskPrimaryView('maps');
      }
      showMap.value = true;
      nextTick(() => {
        taskMapPanel.value?.centerOnObjective(objective);
      });
    };
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
      objectiveCompletions,
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
  const getTaskStatus = (taskId: string): 'available' | 'locked' | 'completed' => {
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
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
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
    }
    showUndoButton.value = false;
    undoData.value = null;
  };
</script>
