import { ref, shallowRef } from 'vue';
import { useMetadataStore } from '@/stores/useMetadata';
import { usePreferencesStore } from '@/stores/usePreferences';
import { useProgressStore } from '@/stores/useProgress';
import { useTarkovStore } from '@/stores/useTarkov';
import type { Task } from '@/types/tarkov';
import { EXCLUDED_SCAV_KARMA_TASKS } from '@/utils/constants';
import { logger } from '@/utils/logger';
interface MergedMap {
  id: string;
  mergedIds?: string[];
}
export function useTaskFiltering() {
  const progressStore = useProgressStore();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  const tarkovStore = useTarkovStore();
  const reloadingTasks = ref(false);
  const visibleTasks = shallowRef<Task[]>([]);
  const mapObjectiveTypes = [
    'mark',
    'zone',
    'extract',
    'visit',
    'findItem',
    'findQuestItem',
    'plantItem',
    'plantQuestItem',
    'shoot',
  ];
  /**
   * Filter tasks by primary view (all, maps, traders)
   */
  const filterTasksByView = (
    taskList: Task[],
    primaryView: string,
    mapView: string,
    traderView: string,
    mergedMaps: MergedMap[]
  ) => {
    if (primaryView === 'maps') {
      return filterTasksByMap(taskList, mapView, mergedMaps);
    } else if (primaryView === 'traders') {
      return taskList.filter((task) => task.trader?.id === traderView);
    }
    return taskList;
  };
  /**
   * Filter tasks by map, handling merged maps (Ground Zero, Factory)
   */
  const filterTasksByMap = (taskList: Task[], mapView: string, mergedMaps: MergedMap[]) => {
    const mergedMap = mergedMaps.find((m) => m.mergedIds && m.mergedIds.includes(mapView));
    if (mergedMap && mergedMap.mergedIds) {
      const ids = mergedMap.mergedIds;
      return taskList.filter((task) => {
        // Check locations field
        const taskLocations = Array.isArray(task.locations) ? task.locations : [];
        let hasMap = ids.some((id: string) => taskLocations.includes(id));
        // Check objectives[].maps
        if (!hasMap && Array.isArray(task.objectives)) {
          hasMap = task.objectives.some(
            (obj) =>
              Array.isArray(obj.maps) &&
              obj.maps.some((map) => ids.includes(map.id)) &&
              mapObjectiveTypes.includes(obj.type || '')
          );
        }
        return hasMap;
      });
    } else {
      // Default: single map logic
      return taskList.filter((task) =>
        task.objectives?.some(
          (obj) =>
            obj.maps?.some((map) => map.id === mapView) &&
            mapObjectiveTypes.includes(obj.type || '')
        )
      );
    }
  };
  /**
   * Check if a task is invalid (permanently blocked) for a user
   */
  const isTaskInvalid = (taskId: string, userView: string): boolean => {
    if (userView === 'all') {
      // For "all" view, check if invalid for ALL team members
      const teamIds = Object.keys(progressStore.visibleTeamStores || {});
      return teamIds.every((teamId) => progressStore.invalidTasks?.[taskId]?.[teamId] === true);
    }
    return progressStore.invalidTasks?.[taskId]?.[userView] === true;
  };
  /**
   * Filter tasks by status (available, locked, completed) and user view
   */
  const filterTasksByStatus = (taskList: Task[], secondaryView: string, userView: string) => {
    if (userView === 'all') {
      return filterTasksForAllUsers(taskList, secondaryView);
    } else {
      return filterTasksForUser(taskList, secondaryView, userView);
    }
  };
  /**
   * Helper to get relevant team members for a task based on faction
   */
  const getRelevantTeamIds = (task: Task, teamIds: string[]): string[] => {
    return teamIds.filter((teamId) => {
      const userFaction = progressStore.playerFaction[teamId];
      const taskFaction = task.factionName;
      return taskFaction === 'Any' || taskFaction === userFaction;
    });
  };
  /**
   * Helper to get task status for a team member
   */
  const getTaskStatus = (taskId: string, teamId: string) => {
    const isUnlocked = progressStore.unlockedTasks?.[taskId]?.[teamId] === true;
    const isCompleted = progressStore.tasksCompletions?.[taskId]?.[teamId] === true;
    const isFailed = progressStore.tasksFailed?.[taskId]?.[teamId] === true;
    return { isUnlocked, isCompleted, isFailed };
  };
  /**
   * Filter tasks for all team members view
   */
  const filterTasksForAllUsers = (taskList: Task[], secondaryView: string) => {
    const tempVisibleTasks = [];
    const teamIds = Object.keys(progressStore.visibleTeamStores || {});
    logger.debug('[TaskFiltering] Filtering for all users. Visible team IDs:', teamIds);
    for (const task of taskList) {
      const relevantTeamIds = getRelevantTeamIds(task, teamIds);
      if (relevantTeamIds.length === 0) continue;
      const taskStatuses = relevantTeamIds.map((teamId) => ({
        teamId,
        ...getTaskStatus(task.id, teamId),
      }));
      if (secondaryView === 'all') {
        // Show all tasks regardless of status
        const usersWhoNeedTask = taskStatuses
          .filter(
            ({ isUnlocked, isCompleted, isFailed }) => isUnlocked && !isCompleted && !isFailed
          )
          .map(({ teamId }) => progressStore.getDisplayName(teamId));
        tempVisibleTasks.push({ ...task, neededBy: usersWhoNeedTask });
      } else if (secondaryView === 'available') {
        // Exclude permanently invalid/blocked tasks from available view
        if (isTaskInvalid(task.id, 'all')) continue;
        const usersWhoNeedTask = taskStatuses
          .filter(
            ({ isUnlocked, isCompleted, isFailed }) => isUnlocked && !isCompleted && !isFailed
          )
          .map(({ teamId }) => progressStore.getDisplayName(teamId));
        if (usersWhoNeedTask.length > 0) {
          if (usersWhoNeedTask.length > 1) {
            logger.debug(
              `[TaskFiltering] Task "${task.name}" needed by multiple users:`,
              usersWhoNeedTask
            );
          }
          tempVisibleTasks.push({ ...task, neededBy: usersWhoNeedTask });
        }
      } else if (secondaryView === 'failed') {
        const hasFailed = taskStatuses.some(({ isFailed }) => isFailed);
        if (hasFailed) {
          tempVisibleTasks.push({ ...task, neededBy: [] });
        }
      } else if (secondaryView === 'locked') {
        // Exclude permanently invalid/blocked tasks from locked view
        if (isTaskInvalid(task.id, 'all')) continue;
        const isAvailableForAny = taskStatuses.some(
          ({ isUnlocked, isCompleted, isFailed }) => isUnlocked && !isCompleted && !isFailed
        );
        const isCompletedByAll = taskStatuses.every(({ isCompleted }) => isCompleted);
        const isFailedForAny = taskStatuses.some(({ isFailed }) => isFailed);
        if (!isAvailableForAny && !isCompletedByAll && !isFailedForAny) {
          tempVisibleTasks.push({ ...task, neededBy: [] });
        }
      } else if (secondaryView === 'completed') {
        const isCompletedByAll = taskStatuses.every(
          ({ isCompleted, isFailed }) => isCompleted && !isFailed
        );
        if (isCompletedByAll) {
          tempVisibleTasks.push({ ...task, neededBy: [] });
        }
      }
    }
    return tempVisibleTasks;
  };
  /**
   * Filter tasks for specific user
   */
  const filterTasksForUser = (taskList: Task[], secondaryView: string, userView: string) => {
    logger.debug('[TaskFiltering] Filtering for specific user:', {
      userView,
      secondaryView,
      totalTasks: taskList.length,
    });
    let filtered = taskList;
    // 'all' shows all tasks regardless of status
    if (secondaryView === 'available') {
      filtered = filtered.filter((task) => {
        // Exclude permanently invalid/blocked tasks from available view
        if (isTaskInvalid(task.id, userView)) return false;
        const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[userView] === true;
        const isCompleted = progressStore.tasksCompletions?.[task.id]?.[userView] === true;
        const isFailed = progressStore.tasksFailed?.[task.id]?.[userView] === true;
        return isUnlocked && !isCompleted && !isFailed;
      });
    } else if (secondaryView === 'failed') {
      filtered = filtered.filter(
        (task) => progressStore.tasksFailed?.[task.id]?.[userView] === true
      );
    } else if (secondaryView === 'locked') {
      filtered = filtered.filter((task) => {
        // Exclude permanently invalid/blocked tasks from locked view
        if (isTaskInvalid(task.id, userView)) return false;
        const taskCompletions = progressStore.tasksCompletions?.[task.id];
        const unlockedTasks = progressStore.unlockedTasks?.[task.id];
        const failedTasks = progressStore.tasksFailed?.[task.id];
        return (
          taskCompletions?.[userView] !== true &&
          failedTasks?.[userView] !== true &&
          unlockedTasks?.[userView] !== true
        );
      });
    } else if (secondaryView === 'completed') {
      filtered = filtered.filter(
        (task) =>
          progressStore.tasksCompletions?.[task.id]?.[userView] === true &&
          progressStore.tasksFailed?.[task.id]?.[userView] !== true
      );
    }
    // 'all' case: no status filtering, just filter by faction below
    // Filter by faction
    const withFaction = filtered.filter(
      (task) =>
        task.factionName === 'Any' || task.factionName === progressStore.playerFaction[userView]
    );
    logger.debug('[TaskFiltering] Filtered results:', {
      userView,
      beforeFaction: filtered.length,
      afterFaction: withFaction.length,
      faction: progressStore.playerFaction[userView],
    });
    return withFaction;
  };
  /**
   * Filter tasks by type settings (Kappa, Lightkeeper, EOD, non-special)
   * Uses OR logic: show task if it matches ANY enabled category
   */
  const filterTasksByTypeSettings = (taskList: Task[]): Task[] => {
    const showKappa = !preferencesStore.getHideNonKappaTasks; // Show Kappa Required tasks
    const showLightkeeper = preferencesStore.getShowLightkeeperTasks;
    const showNonSpecial = preferencesStore.getShowNonSpecialTasks;
    // EOD filter stored for future use when EOD task data is available
    const _showEod = preferencesStore.getShowEodTasks;
    const lightkeeperTraderId = metadataStore.getTraderByName('lightkeeper')?.id;
    // Get prestige filtering data
    const userPrestigeLevel = tarkovStore.getPrestigeLevel();
    const prestigeTaskMap = metadataStore.prestigeTaskMap;
    const prestigeTaskIds = metadataStore.prestigeTaskIds;
    return taskList.filter((task) => {
      // Skip excluded tasks (Scav Karma)
      if (EXCLUDED_SCAV_KARMA_TASKS.includes(task.id)) return false;
      // Filter prestige-gated tasks ("New Beginning")
      // Only show the task that matches the user's current prestige level
      if (prestigeTaskIds.includes(task.id)) {
        const taskPrestigeLevel = prestigeTaskMap.get(task.id);
        if (taskPrestigeLevel !== userPrestigeLevel) {
          return false;
        }
      }
      const isKappaRequired = task.kappaRequired === true;
      const isLightkeeperRequired = task.lightkeeperRequired === true;
      const isLightkeeperTraderTask =
        lightkeeperTraderId !== undefined
          ? task.trader?.id === lightkeeperTraderId
          : task.trader?.name?.toLowerCase() === 'lightkeeper';
      const isNonSpecial = !isKappaRequired && !isLightkeeperRequired && !isLightkeeperTraderTask;
      // OR logic: show if task matches ANY enabled filter
      // A task can be both Kappa and Lightkeeper required - show if either filter is on
      if (isKappaRequired && showKappa) return true;
      if ((isLightkeeperRequired || isLightkeeperTraderTask) && showLightkeeper) return true;
      if (isNonSpecial && showNonSpecial) return true;
      // Task doesn't match any enabled filter
      return false;
    });
  };
  /**
   * Helper to extract all map locations from a task
   */
  const extractTaskLocations = (task: Task): string[] => {
    const locations = Array.isArray(task.locations) ? [...task.locations] : [];
    if (Array.isArray(task.objectives)) {
      for (const obj of task.objectives) {
        if (Array.isArray(obj.maps)) {
          for (const objMap of obj.maps) {
            if (objMap?.id && !locations.includes(objMap.id)) {
              locations.push(objMap.id);
            }
          }
        }
      }
    }
    return locations;
  };
  /**
   * Helper to check if task passes all filters
   */
  const taskPassesFilters = (
    task: Task,
    disabledTasks: string[],
    hideGlobalTasks: boolean,
    hideNonKappaTasks: boolean
  ): boolean => {
    if (disabledTasks.includes(task.id)) return false;
    if (hideGlobalTasks && !task.map) return false;
    if (hideNonKappaTasks && task.kappaRequired !== true) return false;
    return true;
  };
  /**
   * Helper to check if user has unlocked task
   */
  const isTaskUnlockedForUser = (taskId: string, activeUserView: string): boolean => {
    if (activeUserView === 'all') {
      return Object.values(progressStore.unlockedTasks[taskId] || {}).some(Boolean);
    }
    return progressStore.unlockedTasks[taskId]?.[activeUserView] === true;
  };
  /**
   * Helper to check if any objectives remain incomplete
   */
  const hasIncompleteObjectives = (
    task: Task,
    mapIds: string[],
    activeUserView: string
  ): boolean => {
    return (
      task.objectives?.some((objective) => {
        if (!Array.isArray(objective.maps)) return false;
        if (!objective.maps.some((m) => mapIds.includes(m.id))) return false;
        const completions = progressStore.objectiveCompletions[objective.id] || {};
        return activeUserView === 'all'
          ? !Object.values(completions).every(Boolean)
          : completions[activeUserView] !== true;
      }) ?? false
    );
  };
  /**
   * Calculate task totals per map for badge display
   */
  const calculateMapTaskTotals = (
    mergedMaps: MergedMap[],
    tasks: Task[],
    disabledTasks: string[],
    hideGlobalTasks: boolean,
    hideNonKappaTasks: boolean,
    activeUserView: string,
    secondaryView: string
  ) => {
    const mapTaskCounts: Record<string, number> = {};
    const typedTasks = filterTasksByTypeSettings(tasks);
    const statusFilteredTasks = filterTasksByStatus(typedTasks, secondaryView, activeUserView);
    for (const map of mergedMaps) {
      const ids = map.mergedIds || [map.id];
      const mapId = map.id;
      if (!mapId) continue;
      mapTaskCounts[mapId] = 0;
      for (const task of statusFilteredTasks) {
        if (!taskPassesFilters(task, disabledTasks, hideGlobalTasks, hideNonKappaTasks)) continue;
        const taskLocations = extractTaskLocations(task);
        if (!ids.some((id: string) => taskLocations.includes(id))) continue;
        if (secondaryView === 'available') {
          if (!isTaskUnlockedForUser(task.id, activeUserView)) continue;
          if (!hasIncompleteObjectives(task, ids, activeUserView)) continue;
        }
        mapTaskCounts[mapId]!++;
      }
    }
    return mapTaskCounts;
  };
  /**
   * Calculate impact score for a task (number of incomplete successor tasks)
   * Higher impact = more tasks are blocked by this one
   */
  const calculateTaskImpact = (task: Task, userView: string): number => {
    if (!task.successors?.length) return 0;
    const teamIds = Object.keys(progressStore.visibleTeamStores || {});
    return task.successors.filter((successorId) => {
      if (userView === 'all') {
        // For "all" view, count as incomplete if ANY team member hasn't completed it
        return teamIds.some(
          (teamId) =>
            progressStore.tasksCompletions?.[successorId]?.[teamId] !== true ||
            progressStore.tasksFailed?.[successorId]?.[teamId] === true
        );
      } else {
        // For single user view, check that user's completion status
        return (
          progressStore.tasksCompletions?.[successorId]?.[userView] !== true ||
          progressStore.tasksFailed?.[successorId]?.[userView] === true
        );
      }
    }).length;
  };
  /**
   * Sort tasks by impact (number of incomplete successor tasks) in descending order
   * Tasks with higher impact (more tasks blocked) appear first
   */
  const sortTasksByImpact = (taskList: Task[], userView: string): Task[] => {
    return [...taskList].sort((a, b) => {
      const impactA = calculateTaskImpact(a, userView);
      const impactB = calculateTaskImpact(b, userView);
      return impactB - impactA; // Descending order (highest impact first)
    });
  };
  /**
   * Main function to update visible tasks based on all filters
   */
  const updateVisibleTasks = async (
    activePrimaryView: string,
    activeSecondaryView: string,
    activeUserView: string,
    activeMapView: string,
    activeTraderView: string,
    mergedMaps: MergedMap[],
    tasksLoading: boolean
  ) => {
    // Simple guard clauses - data should be available due to global initialization
    if (tasksLoading || !metadataStore.tasks.length) {
      return;
    }
    reloadingTasks.value = true;
    try {
      let visibleTaskList = JSON.parse(JSON.stringify(metadataStore.tasks));
      // Apply task type filters (Kappa, Lightkeeper, Non-special)
      visibleTaskList = filterTasksByTypeSettings(visibleTaskList);
      // Apply primary view filter
      visibleTaskList = filterTasksByView(
        visibleTaskList,
        activePrimaryView,
        activeMapView,
        activeTraderView,
        mergedMaps
      );
      // Apply status and user filters
      visibleTaskList = filterTasksByStatus(visibleTaskList, activeSecondaryView, activeUserView);
      // Sort by impact (number of incomplete successor tasks) - highest impact first
      visibleTaskList = sortTasksByImpact(visibleTaskList, activeUserView);
      visibleTasks.value = visibleTaskList;
    } finally {
      reloadingTasks.value = false;
    }
  };
  /**
   * Calculate task counts by status (all, available, locked, completed)
   */
  const calculateStatusCounts = (
    userView: string
  ): { all: number; available: number; locked: number; completed: number; failed: number } => {
    const counts = { all: 0, available: 0, locked: 0, completed: 0, failed: 0 };
    const taskList = metadataStore.tasks;
    // Get prestige filtering data
    const userPrestigeLevel = tarkovStore.getPrestigeLevel();
    const prestigeTaskMap = metadataStore.prestigeTaskMap;
    const prestigeTaskIds = metadataStore.prestigeTaskIds;
    for (const task of taskList) {
      // Skip excluded tasks
      if (EXCLUDED_SCAV_KARMA_TASKS.includes(task.id)) continue;
      // Skip prestige tasks that don't match user's prestige level
      if (prestigeTaskIds.includes(task.id)) {
        const taskPrestigeLevel = prestigeTaskMap.get(task.id);
        if (taskPrestigeLevel !== userPrestigeLevel) continue;
      }
      if (userView === 'all') {
        // For "all" view
        const teamIds = Object.keys(progressStore.visibleTeamStores || {});
        const relevantTeamIds = teamIds.filter((teamId) => {
          const teamFaction = progressStore.playerFaction[teamId];
          const taskFaction = task.factionName;
          return taskFaction === 'Any' || taskFaction === teamFaction;
        });
        if (relevantTeamIds.length === 0) continue;
        counts.all++;
        const isFailedForAny = relevantTeamIds.some(
          (teamId) => progressStore.tasksFailed?.[task.id]?.[teamId] === true
        );
        const isAvailableForAny = relevantTeamIds.some((teamId) => {
          const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[teamId] === true;
          const isCompleted = progressStore.tasksCompletions?.[task.id]?.[teamId] === true;
          const isFailed = progressStore.tasksFailed?.[task.id]?.[teamId] === true;
          return isUnlocked && !isCompleted && !isFailed;
        });
        const isCompletedByAll = relevantTeamIds.every((teamId) => {
          return (
            progressStore.tasksCompletions?.[task.id]?.[teamId] === true &&
            progressStore.tasksFailed?.[task.id]?.[teamId] !== true
          );
        });
        if (isFailedForAny) {
          counts.failed++;
        } else if (isCompletedByAll) {
          counts.completed++;
        } else if (isAvailableForAny && !isTaskInvalid(task.id, 'all')) {
          // Only count as available if not permanently invalid/blocked
          counts.available++;
        } else if (!isTaskInvalid(task.id, 'all')) {
          // Only count as locked if not permanently invalid/blocked
          counts.locked++;
        }
      } else {
        // For single user view
        const taskFaction = task.factionName;
        const userFaction = progressStore.playerFaction[userView];
        if (taskFaction !== 'Any' && taskFaction !== userFaction) continue;
        counts.all++;
        const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[userView] === true;
        const isCompleted = progressStore.tasksCompletions?.[task.id]?.[userView] === true;
        const isFailed = progressStore.tasksFailed?.[task.id]?.[userView] === true;
        if (isFailed) {
          counts.failed++;
        } else if (isCompleted) {
          counts.completed++;
        } else if (isUnlocked && !isTaskInvalid(task.id, userView)) {
          // Only count as available if not permanently invalid/blocked
          counts.available++;
        } else if (!isTaskInvalid(task.id, userView)) {
          // Only count as locked if not permanently invalid/blocked
          counts.locked++;
        }
      }
    }
    return counts;
  };
  /**
   * Calculate task counts per trader based on current status filter
   */
  const calculateTraderCounts = (userView: string, secondaryView: string = 'available') => {
    const counts: Record<string, number> = {};
    const taskList = metadataStore.tasks;
    // Get prestige filtering data
    const userPrestigeLevel = tarkovStore.getPrestigeLevel();
    const prestigeTaskMap = metadataStore.prestigeTaskMap;
    const prestigeTaskIds = metadataStore.prestigeTaskIds;
    for (const task of taskList) {
      // Skip excluded tasks
      if (EXCLUDED_SCAV_KARMA_TASKS.includes(task.id)) continue;
      // Skip prestige tasks that don't match user's prestige level
      if (prestigeTaskIds.includes(task.id)) {
        const taskPrestigeLevel = prestigeTaskMap.get(task.id);
        if (taskPrestigeLevel !== userPrestigeLevel) continue;
      }
      const traderId = task.trader?.id;
      if (!traderId) continue;
      // Initialize count for this trader
      if (!counts[traderId]) counts[traderId] = 0;
      // Filter by faction
      const taskFaction = task.factionName;
      if (userView === 'all') {
        // For "all" view, check task status across team members
        const teamIds = Object.keys(progressStore.visibleTeamStores || {});
        const relevantTeamIds = teamIds.filter((teamId) => {
          const teamFaction = progressStore.playerFaction[teamId];
          return taskFaction === 'Any' || taskFaction === teamFaction;
        });
        if (relevantTeamIds.length === 0) continue;
        const taskStatuses = relevantTeamIds.map((teamId) => ({
          isUnlocked: progressStore.unlockedTasks?.[task.id]?.[teamId] === true,
          isCompleted: progressStore.tasksCompletions?.[task.id]?.[teamId] === true,
          isFailed: progressStore.tasksFailed?.[task.id]?.[teamId] === true,
        }));
        let shouldCount = false;
        if (secondaryView === 'all') {
          shouldCount = true;
        } else if (secondaryView === 'available') {
          shouldCount = taskStatuses.some(
            ({ isUnlocked, isCompleted, isFailed }) => isUnlocked && !isCompleted && !isFailed
          );
        } else if (secondaryView === 'locked') {
          // Exclude permanently invalid/blocked tasks from locked count
          if (isTaskInvalid(task.id, 'all')) continue;
          const isAvailableForAny = taskStatuses.some(
            ({ isUnlocked, isCompleted, isFailed }) => isUnlocked && !isCompleted && !isFailed
          );
          const isCompletedByAll = taskStatuses.every(({ isCompleted }) => isCompleted);
          const isFailedForAny = taskStatuses.some(({ isFailed }) => isFailed);
          shouldCount = !isAvailableForAny && !isCompletedByAll && !isFailedForAny;
        } else if (secondaryView === 'completed') {
          shouldCount = taskStatuses.every(({ isCompleted, isFailed }) => isCompleted && !isFailed);
        } else if (secondaryView === 'failed') {
          shouldCount = taskStatuses.some(({ isFailed }) => isFailed);
        }
        if (shouldCount) counts[traderId]++;
      } else {
        // For single user view
        const userFaction = progressStore.playerFaction[userView];
        const factionMatch = taskFaction === 'Any' || taskFaction === userFaction;
        if (!factionMatch) continue;
        const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[userView] === true;
        const isCompleted = progressStore.tasksCompletions?.[task.id]?.[userView] === true;
        const isFailed = progressStore.tasksFailed?.[task.id]?.[userView] === true;
        let shouldCount = false;
        if (secondaryView === 'all') {
          shouldCount = true;
        } else if (secondaryView === 'available') {
          shouldCount = isUnlocked && !isCompleted && !isFailed;
        } else if (secondaryView === 'locked') {
          // Exclude permanently invalid/blocked tasks from locked count
          if (isTaskInvalid(task.id, userView)) continue;
          shouldCount = !isCompleted && !isFailed && !isUnlocked;
        } else if (secondaryView === 'completed') {
          shouldCount = isCompleted && !isFailed;
        } else if (secondaryView === 'failed') {
          shouldCount = isFailed;
        }
        if (shouldCount) counts[traderId]++;
      }
    }
    return counts;
  };
  return {
    visibleTasks,
    reloadingTasks,
    filterTasksByView,
    filterTasksByStatus,
    filterTasksByMap,
    filterTasksForAllUsers,
    filterTasksForUser,
    calculateMapTaskTotals,
    calculateStatusCounts,
    calculateTraderCounts,
    updateVisibleTasks,
    mapObjectiveTypes,
    disabledTasks: EXCLUDED_SCAV_KARMA_TASKS,
  };
}
