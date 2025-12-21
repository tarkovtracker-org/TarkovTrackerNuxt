import { defineStore } from 'pinia';
import { computed } from 'vue';
import type { UserProgressData, UserState } from '@/stores/progressState';
import { useMetadataStore } from '@/stores/useMetadata';
import { usePreferencesStore } from '@/stores/usePreferences';
import { useTarkovStore } from '@/stores/useTarkov';
import { useTeammateStores, useTeamStore } from '@/stores/useTeamStore';
import type { GameEdition, Task } from '@/types/tarkov';
import { GAME_MODES, SPECIAL_STATIONS } from '@/utils/constants';
import { logger } from '@/utils/logger';
import type { Store } from 'pinia';
function getGameModeData(store: Store<string, UserState> | undefined): UserProgressData {
  if (!store) return {} as UserProgressData;
  const currentGameMode = store.$state.currentGameMode || GAME_MODES.PVP;
  const gameModeState = store.$state[currentGameMode as keyof UserState];
  return (gameModeState || store.$state) as UserProgressData;
}
type TeamStoresMap = Record<string, Store<string, UserState>>;
type CompletionsMap = Record<string, Record<string, boolean>>;
type TraderLevelsMap = Record<string, Record<string, number>>;
type FactionMap = Record<string, string>;
type TaskAvailabilityMap = Record<string, Record<string, boolean>>;
type ObjectiveCompletionsMap = Record<string, Record<string, boolean>>;
type HideoutLevelMap = Record<string, Record<string, number>>;
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
      faction[teamId] = currentData?.pmcFaction ?? 'Unknown';
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
        faction: currentData?.pmcFaction ?? 'Unknown',
        completions: currentData?.taskCompletions ?? {},
        traderLevels,
      });
    }
    // Now iterate tasks once with all data pre-cached
    for (const task of tasks) {
      available[task.id] = {};
      for (const teamId of teamIds) {
        const teamData = teamDataCache.get(teamId)!;
        // Early exit: already complete
        if (teamData.completions[task.id]?.complete) {
          available[task.id]![teamId] = false;
          continue;
        }
        // Check failed requirements
        let failedReqsMet = true;
        if (task.failedRequirements) {
          for (const req of task.failedRequirements) {
            if (teamData.completions[req.task.id]?.failed) {
              failedReqsMet = false;
              break;
            }
          }
        }
        if (!failedReqsMet) {
          available[task.id]![teamId] = false;
          continue;
        }
        // Level check
        if (task.minPlayerLevel && teamData.level < task.minPlayerLevel) {
          available[task.id]![teamId] = false;
          continue;
        }
        // Trader levels check
        let traderLevelsMet = true;
        if (task.traderLevelRequirements) {
          for (const req of task.traderLevelRequirements) {
            if ((teamData.traderLevels[req.trader.id] ?? 0) < req.level) {
              traderLevelsMet = false;
              break;
            }
          }
        }
        if (!traderLevelsMet) {
          available[task.id]![teamId] = false;
          continue;
        }
        // Prerequisites check
        let prereqsMet = true;
        if (task.taskRequirements) {
          for (const req of task.taskRequirements) {
            if (!teamData.completions[req.task.id]?.complete) {
              prereqsMet = false;
              break;
            }
          }
        }
        if (!prereqsMet) {
          available[task.id]![teamId] = false;
          continue;
        }
        // Faction check
        if (
          task.factionName &&
          task.factionName !== 'Any' &&
          task.factionName !== teamData.faction
        ) {
          available[task.id]![teamId] = false;
          continue;
        }
        available[task.id]![teamId] = true;
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
    return currentData?.pmcFaction ?? 'Unknown';
  };
  const getTeammateStore = (teamId: string): Store<string, UserState> | null => {
    return teammateStores.value[teamId] || null;
  };
  const hasCompletedTask = (teamId: string, taskId: string): boolean => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    const taskCompletion = currentData?.taskCompletions?.[taskId];
    return taskCompletion?.complete === true;
  };
  const getTaskStatus = (teamId: string, taskId: string): 'completed' | 'failed' | 'incomplete' => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const currentData = getGameModeData(store);
    const taskCompletion = currentData?.taskCompletions?.[taskId];
    if (taskCompletion?.complete) return 'completed';
    if (taskCompletion?.failed) return 'failed';
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
  return {
    teamStores,
    visibleTeamStores,
    tasksCompletions,
    gameEditionData,
    traderLevelsAchieved,
    playerFaction,
    unlockedTasks,
    objectiveCompletions,
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
  };
});
