import { defineStore } from 'pinia';
import { computed } from 'vue';
import type { UserProgressData, UserState } from '@/stores/progressState';
import { useMetadataStore } from '@/stores/useMetadata';
import { usePreferencesStore } from '@/stores/usePreferences';
import { useTarkovStore } from '@/stores/useTarkov';
import { useTeammateStores, useTeamStore } from '@/stores/useTeamStore';
import type { GameEdition, Task, TaskRequirement } from '@/types/tarkov';
import { GAME_MODES, SPECIAL_STATIONS } from '@/utils/constants';
import { logger } from '@/utils/logger';
import { computeInvalidProgress } from '@/utils/progressInvalidation';
import type { Store } from 'pinia';
function getGameModeData(store: Store<string, UserState> | undefined): UserProgressData {
  if (!store) return {} as UserProgressData;
  const currentGameMode = store.$state.currentGameMode || GAME_MODES.PVP;
  const gameModeState = store.$state[currentGameMode as keyof UserState];
  return (gameModeState || store.$state) as UserProgressData;
}
type TeamStoresMap = Record<string, Store<string, UserState>>;
type CompletionsMap = Record<string, Record<string, boolean>>;
type FailedTasksMap = Record<string, Record<string, boolean>>;
type TraderLevelsMap = Record<string, Record<string, number>>;
type FactionMap = Record<string, string>;
type TaskAvailabilityMap = Record<string, Record<string, boolean>>;
type ObjectiveCompletionsMap = Record<string, Record<string, boolean>>;
type HideoutLevelMap = Record<string, Record<string, number>>;
type InvalidTasksMap = Record<string, Record<string, boolean>>;
type InvalidObjectivesMap = Record<string, Record<string, boolean>>;
/*
type ProgressGetters = {
  teamStores: TeamStoresMap;
  visibleTeamStores: TeamStoresMap;
  tasksCompletions: CompletionsMap;
  gameEditionData: GameEdition[];
  traderLevelsAchieved: TraderLevelsMap;
  playerFaction: FactionMap;
  unlockedTasks: TaskAvailabilityMap;
  objectiveCompletions: ObjectiveCompletionsMap;
  hideoutLevels: HideoutLevelMap;
  getTeamIndex: (teamId: string) => number;
  getDisplayName: (teamId: string) => string;
  getLevel: (teamId: string) => number;
  getFaction: (teamId: string) => string;
};
*/
export const useProgressStore = defineStore('progress', () => {
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const { teammateStores } = useTeammateStores();
  const teamStore = useTeamStore();
  // Get the tarkov store to source "self" data directly from it
  const tarkovStore = useTarkovStore();
  const teamStores = computed(() => {
    const stores: TeamStoresMap = {};
    // Source the "self" key directly from useTarkovStore() instead of maintaining local state
    stores['self'] = tarkovStore as Store<string, UserState>;
    for (const teammate of Object.keys(teammateStores.value)) {
      if (teammateStores.value[teammate]) {
        stores[teammate] = teammateStores.value[teammate];
      }
    }
    logger.debug('[ProgressStore] All team stores:', Object.keys(stores));
    return stores;
  });
  const visibleTeamStores = computed(() => {
    const visibleStores: TeamStoresMap = {};
    Object.entries(teamStores.value).forEach(([teamId, store]) => {
      const isHidden = preferencesStore.teamIsHidden(teamId);
      if (!isHidden) {
        visibleStores[teamId] = store;
      }
      logger.debug('[ProgressStore] Team visibility check:', {
        teamId,
        isHidden,
        taskTeamHideAll: preferencesStore.taskTeamAllHidden,
      });
    });
    logger.debug('[ProgressStore] Visible team stores:', Object.keys(visibleStores));
    return visibleStores;
  });
  const tasksCompletions = computed(() => {
    const completions: CompletionsMap = {};
    if (!metadataStore.tasks.length || !visibleTeamStores.value) return {};
    for (const task of metadataStore.tasks as Task[]) {
      completions[task.id] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        completions[task.id]![teamId] = currentData?.taskCompletions?.[task.id]?.complete ?? false;
      }
    }
    return completions;
  });
  const tasksFailed = computed(() => {
    const failures: FailedTasksMap = {};
    if (!metadataStore.tasks.length || !visibleTeamStores.value) return {};
    for (const task of metadataStore.tasks as Task[]) {
      failures[task.id] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        failures[task.id]![teamId] = currentData?.taskCompletions?.[task.id]?.failed ?? false;
      }
    }
    return failures;
  });
  const gameEditionData = computed<GameEdition[]>(() => metadataStore.editions);
  const traderLevelsAchieved = computed(() => {
    const levels: TraderLevelsMap = {};
    if (!metadataStore.traders.length || !visibleTeamStores.value) return {};
    for (const teamId of Object.keys(visibleTeamStores.value)) {
      levels[teamId] = {};
      const store = visibleTeamStores.value[teamId];
      for (const trader of metadataStore.traders) {
        const currentData = getGameModeData(store);
        levels[teamId]![trader.id] = currentData?.level ?? 0;
      }
    }
    return levels;
  });
  const playerFaction = computed(() => {
    const faction: FactionMap = {};
    if (!visibleTeamStores.value) return {};
    for (const teamId of Object.keys(visibleTeamStores.value)) {
      const store = visibleTeamStores.value[teamId];
      const currentData = getGameModeData(store);
      faction[teamId] = currentData?.pmcFaction ?? 'USEC';
    }
    return faction;
  });
  /**
   * Optimized unlockedTasks computation.
   * Pre-collects team data once, then iterates tasks with early exits.
   * This reduces redundant store lookups that were happening per-task-per-team.
   */
  const unlockedTasks = computed(() => {
    const available: TaskAvailabilityMap = {};
    const tasks = metadataStore.tasks as Task[];
    if (!tasks.length || !visibleTeamStores.value) return {};
    const teamIds = Object.keys(visibleTeamStores.value);
    if (!teamIds.length) return {};
    // Pre-collect all team data once (avoid repeated getGameModeData calls)
    const teamDataCache = new Map<
      string,
      {
        level: number;
        faction: string;
        completions: Record<string, { complete?: boolean; failed?: boolean }>;
        traderLevels: Record<string, number>;
      }
    >();
    for (const teamId of teamIds) {
      const store = visibleTeamStores.value[teamId];
      const currentData = getGameModeData(store);
      const traderLevels: Record<string, number> = {};
      for (const trader of metadataStore.traders) {
        traderLevels[trader.id] = currentData?.level ?? 0;
      }
      teamDataCache.set(teamId, {
        level: currentData?.level ?? 0,
        faction: currentData?.pmcFaction ?? 'USEC',
        completions: currentData?.taskCompletions ?? {},
        traderLevels,
      });
    }
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    const normalizeStatuses = (statuses?: string[]) =>
      (statuses ?? []).map((status) => status.toLowerCase());
    const hasAnyStatus = (statuses: string[], values: string[]) =>
      values.some((value) => statuses.includes(value));
    const isTaskComplete = (completion?: { complete?: boolean; failed?: boolean }) =>
      completion?.complete === true && completion?.failed !== true;
    const isTaskFailed = (completion?: { complete?: boolean; failed?: boolean }) =>
      completion?.failed === true;
    const isTaskActiveRecord = (completion?: { complete?: boolean; failed?: boolean }) => {
      if (!completion) return false;
      return !isTaskComplete(completion) && !isTaskFailed(completion);
    };
    // Initialize availability map
    for (const task of tasks) {
      available[task.id] = {};
    }
    // Compute availability per team with memoization to keep status-aware chains consistent
    for (const teamId of teamIds) {
      const teamData = teamDataCache.get(teamId)!;
      const availabilityMemo = new Map<string, boolean>();
      const unlockableMemo = new Map<string, boolean>();
      const visitingAvailable = new Set<string>();
      const visitingUnlockable = new Set<string>();
      const isRequirementSatisfied = (requirement: TaskRequirement): boolean => {
        const reqTaskId = requirement?.task?.id;
        if (!reqTaskId) return true;
        const requirementStatus = normalizeStatuses(requirement.status);
        const requiresComplete =
          requirementStatus.length === 0 ||
          hasAnyStatus(requirementStatus, ['complete', 'completed']);
        const requiresActive = hasAnyStatus(requirementStatus, ['active', 'accept', 'accepted']);
        const requiresFailed = hasAnyStatus(requirementStatus, ['failed']);
        const completion = teamData.completions[reqTaskId];
        const isComplete = isTaskComplete(completion);
        const isFailed = isTaskFailed(completion);
        const isActive = isTaskActiveRecord(completion);
        if (requiresComplete && isComplete) return true;
        if (requiresFailed && isFailed) return true;
        if (requiresActive) {
          if (isActive || isComplete) return true;
          // Treat "available" as "accepted" when no explicit active state is stored.
          if (isTaskUnlockable(reqTaskId)) return true;
        }
        return false;
      };
      const computeTaskAvailability = (
        taskId: string,
        allowCompleted: boolean,
        memo: Map<string, boolean>,
        visiting: Set<string>
      ): boolean => {
        if (memo.has(taskId)) return memo.get(taskId)!;
        if (visiting.has(taskId)) return false;
        const task = tasksById.get(taskId);
        if (!task) return false;
        visiting.add(taskId);
        // Early exit: already complete (unless we allow completed tasks)
        if (!allowCompleted && isTaskComplete(teamData.completions[taskId])) {
          memo.set(taskId, false);
          visiting.delete(taskId);
          return false;
        }
        // Check failed requirements
        if (task.failedRequirements) {
          for (const req of task.failedRequirements) {
            if (req?.task?.id && teamData.completions[req.task.id]?.failed) {
              memo.set(taskId, false);
              visiting.delete(taskId);
              return false;
            }
          }
        }
        // Level check
        if (task.minPlayerLevel && teamData.level < task.minPlayerLevel) {
          memo.set(taskId, false);
          visiting.delete(taskId);
          return false;
        }
        // Trader levels check
        if (task.traderLevelRequirements) {
          for (const req of task.traderLevelRequirements) {
            if ((teamData.traderLevels[req.trader.id] ?? 0) < req.level) {
              memo.set(taskId, false);
              visiting.delete(taskId);
              return false;
            }
          }
        }
        // Prerequisites check
        if (task.taskRequirements) {
          for (const req of task.taskRequirements) {
            if (!isRequirementSatisfied(req)) {
              memo.set(taskId, false);
              visiting.delete(taskId);
              return false;
            }
          }
        }
        // Faction check
        if (
          task.factionName &&
          task.factionName !== 'Any' &&
          task.factionName !== teamData.faction
        ) {
          memo.set(taskId, false);
          visiting.delete(taskId);
          return false;
        }
        memo.set(taskId, true);
        visiting.delete(taskId);
        return true;
      };
      const isTaskUnlockable = (taskId: string): boolean =>
        computeTaskAvailability(taskId, true, unlockableMemo, visitingUnlockable);
      const isTaskAvailable = (taskId: string): boolean =>
        computeTaskAvailability(taskId, false, availabilityMemo, visitingAvailable);
      for (const task of tasks) {
        available[task.id]![teamId] = isTaskAvailable(task.id);
      }
    }
    return available;
  });
  const objectiveCompletions = computed(() => {
    const completions: ObjectiveCompletionsMap = {};
    if (!metadataStore.objectives.length || !visibleTeamStores.value) return {};
    for (const objective of metadataStore.objectives) {
      completions[objective.id] = {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        const currentData = getGameModeData(store);
        completions[objective.id]![teamId] =
          currentData?.taskObjectives?.[objective.id]?.complete ?? false;
      }
    }
    return completions;
  });
  const invalidProgressByTeam = computed(() => {
    const invalidByTeam: Record<
      string,
      { invalidTasks: Record<string, boolean>; invalidObjectives: Record<string, boolean> }
    > = {};
    if (!metadataStore.tasks.length || !visibleTeamStores.value) return {};
    const tasks = metadataStore.tasks as Task[];
    for (const teamId of Object.keys(visibleTeamStores.value)) {
      const store = visibleTeamStores.value[teamId];
      const currentData = getGameModeData(store);
      invalidByTeam[teamId] = computeInvalidProgress({
        tasks,
        taskCompletions: currentData?.taskCompletions ?? {},
        pmcFaction: currentData?.pmcFaction ?? 'USEC',
      });
    }
    return invalidByTeam;
  });
  const invalidTasks = computed(() => {
    const invalids: InvalidTasksMap = {};
    if (!metadataStore.tasks.length || !visibleTeamStores.value) return {};
    const teamIds = Object.keys(visibleTeamStores.value);
    const invalidByTeam = invalidProgressByTeam.value;
    for (const task of metadataStore.tasks as Task[]) {
      invalids[task.id] = {};
      for (const teamId of teamIds) {
        invalids[task.id]![teamId] = invalidByTeam[teamId]?.invalidTasks?.[task.id] ?? false;
      }
    }
    return invalids;
  });
  const invalidObjectives = computed(() => {
    const invalids: InvalidObjectivesMap = {};
    if (!metadataStore.objectives.length || !visibleTeamStores.value) return {};
    const teamIds = Object.keys(visibleTeamStores.value);
    const invalidByTeam = invalidProgressByTeam.value;
    for (const objective of metadataStore.objectives) {
      invalids[objective.id] = {};
      for (const teamId of teamIds) {
        invalids[objective.id]![teamId] =
          invalidByTeam[teamId]?.invalidObjectives?.[objective.id] ?? false;
      }
    }
    return invalids;
  });
  const hideoutLevels = computed(() => {
    const levels: HideoutLevelMap = {};
    if (!metadataStore.hideoutStations.length || !visibleTeamStores.value) return {};
    const teamIds = Object.keys(visibleTeamStores.value);
    // Performance optimization: Pre-cache team data and edition info once
    const teamDataCache = new Map<
      string,
      {
        data: UserProgressData;
        edition: GameEdition | undefined;
        gameEditionVersion: number;
      }
    >();
    for (const teamId of teamIds) {
      const store = visibleTeamStores.value[teamId];
      const currentData = getGameModeData(store);
      const gameEditionVersion = store?.$state.gameEdition ?? 0;
      const edition = gameEditionData.value.find((e) => e.value === gameEditionVersion);
      teamDataCache.set(teamId, {
        data: currentData,
        edition,
        gameEditionVersion,
      });
    }
    // Iterate with cached data
    for (const station of metadataStore.hideoutStations) {
      if (!station || !station.id) continue;
      levels[station.id] = {};
      const isStash = station.normalizedName === SPECIAL_STATIONS.STASH;
      const isCultist = station.normalizedName === SPECIAL_STATIONS.CULTIST_CIRCLE;
      const maxLevel = station.levels?.length || 0;
      for (const teamId of teamIds) {
        const cached = teamDataCache.get(teamId)!;
        const modulesState = cached.data?.hideoutModules ?? {};
        let maxManuallyCompletedLevel = 0;
        if (station.levels && Array.isArray(station.levels)) {
          for (const lvl of station.levels) {
            if (lvl && lvl.id && modulesState[lvl.id]?.complete && typeof lvl.level === 'number') {
              maxManuallyCompletedLevel = Math.max(maxManuallyCompletedLevel, lvl.level);
            }
          }
        }
        let currentStationDisplayLevel;
        if (isStash) {
          const defaultStashFromEdition = cached.edition?.defaultStashLevel ?? 0;
          const effectiveStashLevel = Math.min(defaultStashFromEdition, maxLevel);
          if (effectiveStashLevel === maxLevel) {
            currentStationDisplayLevel = maxLevel;
          } else {
            currentStationDisplayLevel = Math.max(effectiveStashLevel, maxManuallyCompletedLevel);
          }
        } else if (isCultist) {
          const defaultCultistCircleFromEdition = cached.edition?.defaultCultistCircleLevel ?? 0;
          const effectiveCultistCircleLevel = Math.min(defaultCultistCircleFromEdition, maxLevel);
          if (effectiveCultistCircleLevel === maxLevel) {
            currentStationDisplayLevel = maxLevel;
          } else {
            currentStationDisplayLevel = Math.max(
              effectiveCultistCircleLevel,
              maxManuallyCompletedLevel
            );
          }
        } else {
          currentStationDisplayLevel = maxManuallyCompletedLevel;
        }
        levels[station.id]![teamId] = currentStationDisplayLevel;
      }
    }
    return levels;
  });
  const moduleCompletions = computed(() => {
    const completions: CompletionsMap = {};
    if (!metadataStore.hideoutStations.length || !visibleTeamStores.value) return {};
    const teamIds = Object.keys(visibleTeamStores.value);
    // Performance optimization: Pre-cache team edition data
    const teamEditionCache = new Map<
      string,
      {
        data: UserProgressData;
        edition: GameEdition | undefined;
      }
    >();
    for (const teamId of teamIds) {
      const store = visibleTeamStores.value[teamId];
      const currentData = getGameModeData(store);
      const gameEditionVersion = store?.$state.gameEdition ?? 0;
      const edition = gameEditionData.value.find((e) => e.value === gameEditionVersion);
      teamEditionCache.set(teamId, { data: currentData, edition });
    }
    for (const station of metadataStore.hideoutStations) {
      if (!station || !station.id || !station.levels) continue;
      const isStash = station.normalizedName === SPECIAL_STATIONS.STASH;
      const isCultist = station.normalizedName === SPECIAL_STATIONS.CULTIST_CIRCLE;
      for (const level of station.levels) {
        if (!level || !level.id) continue;
        completions[level.id] = {};
        for (const teamId of teamIds) {
          const cached = teamEditionCache.get(teamId)!;
          // Check if manually completed
          const isManuallyComplete = cached.data?.hideoutModules?.[level.id]?.complete ?? false;
          if (isManuallyComplete) {
            completions[level.id]![teamId] = true;
            continue;
          }
          // Check if auto-completed by game edition for special stations
          if (isStash) {
            const defaultStashLevel = cached.edition?.defaultStashLevel ?? 0;
            // Module is complete if its level is <= default stash level from edition
            if (level.level <= defaultStashLevel) {
              completions[level.id]![teamId] = true;
              continue;
            }
          } else if (isCultist) {
            const defaultCultistCircleLevel = cached.edition?.defaultCultistCircleLevel ?? 0;
            // Module is complete if its level is <= default cultist circle level from edition
            if (level.level <= defaultCultistCircleLevel) {
              completions[level.id]![teamId] = true;
              continue;
            }
          }
          completions[level.id]![teamId] = false;
        }
      }
    }
    return completions;
  });
  const modulePartCompletions = computed(() => {
    const completions: CompletionsMap = {};
    if (!metadataStore.hideoutStations.length || !visibleTeamStores.value) return {};
    const teamIds = Object.keys(visibleTeamStores.value);
    // Performance optimization: Pre-cache team data once
    const teamDataCache = new Map<string, UserProgressData>();
    for (const teamId of teamIds) {
      const store = visibleTeamStores.value[teamId];
      teamDataCache.set(teamId, getGameModeData(store));
    }
    // Performance optimization: Use Set for deduplication instead of flatMap
    const allPartIds = new Set<string>();
    for (const station of metadataStore.hideoutStations) {
      if (!station.levels) continue;
      for (const level of station.levels) {
        if (!level.itemRequirements) continue;
        for (const req of level.itemRequirements) {
          if (req.id) allPartIds.add(req.id);
        }
      }
    }
    for (const partId of allPartIds) {
      completions[partId] = {};
      for (const teamId of teamIds) {
        const currentData = teamDataCache.get(teamId)!;
        completions[partId]![teamId] = currentData?.hideoutParts?.[partId]?.complete ?? false;
      }
    }
    return completions;
  });
  const getTeamIndex = (teamId: string): string => {
    const { $supabase } = useNuxtApp();
    return teamId === $supabase.user?.id ? 'self' : teamId;
  };
  const getDisplayName = (teamId: string): string => {
    const storeKey = getTeamIndex(teamId);
    // If it's the current user, get from tarkov store
    if (storeKey === 'self') {
      const store = teamStores.value[storeKey];
      const currentData = getGameModeData(store);
      return currentData?.displayName || 'You';
    }
    // For teammates, try to get from memberProfiles first (server-side source of truth)
    const profile = teamStore.memberProfiles?.[teamId];
    if (profile?.displayName) {
      return profile.displayName;
    }
    // Fallback to store data if available
    const store = teamStores.value[storeKey];
    if (store) {
      const currentData = getGameModeData(store);
      if (currentData?.displayName) {
        return currentData.displayName;
      }
    }
    // Final fallback
    return teamId.substring(0, 6);
  };
  const getLevel = (teamId: string): number => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    return currentData?.level ?? 1;
  };
  const getFaction = (teamId: string): string => {
    const store = visibleTeamStores.value[teamId];
    const currentData = getGameModeData(store);
    return currentData?.pmcFaction ?? 'USEC';
  };
  const getTeammateStore = (teamId: string): Store<string, UserState> | null => {
    return teammateStores.value[teamId] || null;
  };
  const hasCompletedTask = (teamId: string, taskId: string): boolean => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    const taskCompletion = currentData?.taskCompletions?.[taskId];
    return taskCompletion?.complete === true && taskCompletion?.failed !== true;
  };
  const getTaskStatus = (teamId: string, taskId: string): 'completed' | 'failed' | 'incomplete' => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    const taskCompletion = currentData?.taskCompletions?.[taskId];
    if (taskCompletion?.failed) return 'failed';
    if (taskCompletion?.complete) return 'completed';
    return 'incomplete';
  };
  const getProgressPercentage = (teamId: string, category: string): number => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    if (!store?.$state) return 0;
    // Get current gamemode data, with fallback to legacy structure
    const currentGameMode = store.$state.currentGameMode || GAME_MODES.PVP;
    const currentData = store.$state[currentGameMode] || store.$state;
    switch (category) {
      case 'tasks': {
        const totalTasks = Object.keys(currentData.taskCompletions || {}).length;
        const completedTasks = Object.values(currentData.taskCompletions || {}).filter(
          (completion) => completion?.complete === true
        ).length;
        return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      }
      case 'hideout': {
        const totalModules = Object.keys(currentData.hideoutModules || {}).length;
        const completedModules = Object.values(currentData.hideoutModules || {}).filter(
          (module) => module?.complete === true
        ).length;
        return totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
      }
      default:
        return 0;
    }
  };
  const migrateDuplicateObjectiveProgress = (duplicateObjectiveIds: Map<string, string[]>) => {
    if (!duplicateObjectiveIds.size) return;
    const migrateObjectiveMap = (
      objectiveMap?: Record<string, { complete?: boolean; count?: number; timestamp?: number }>
    ) => {
      if (!objectiveMap) return objectiveMap;
      let updated = objectiveMap;
      duplicateObjectiveIds.forEach((newIds, originalId) => {
        const existing = updated[originalId];
        if (!existing) return;
        const merged = { ...updated };
        newIds.forEach((newId) => {
          if (!merged[newId]) {
            merged[newId] = { ...existing };
          }
        });
        const { [originalId]: _removed, ...rest } = merged;
        updated = rest;
      });
      return updated;
    };
    Object.values(teamStores.value).forEach((store) => {
      const pvpObjectives = store?.$state?.pvp?.taskObjectives;
      const pveObjectives = store?.$state?.pve?.taskObjectives;
      const nextPvpObjectives = migrateObjectiveMap(pvpObjectives);
      const nextPveObjectives = migrateObjectiveMap(pveObjectives);
      if (pvpObjectives && nextPvpObjectives && nextPvpObjectives !== pvpObjectives) {
        store.$state.pvp.taskObjectives = nextPvpObjectives;
      }
      if (pveObjectives && nextPveObjectives && nextPveObjectives !== pveObjectives) {
        store.$state.pve.taskObjectives = nextPveObjectives;
      }
    });
  };
  return {
    teamStores,
    visibleTeamStores,
    tasksCompletions,
    tasksFailed,
    gameEditionData,
    traderLevelsAchieved,
    playerFaction,
    unlockedTasks,
    objectiveCompletions,
    invalidTasks,
    invalidObjectives,
    hideoutLevels,
    moduleCompletions,
    modulePartCompletions,
    getTeamIndex,
    getDisplayName,
    getLevel,
    getFaction,
    getTeammateStore,
    hasCompletedTask,
    getTaskStatus,
    getProgressPercentage,
    migrateDuplicateObjectiveProgress,
  };
});
