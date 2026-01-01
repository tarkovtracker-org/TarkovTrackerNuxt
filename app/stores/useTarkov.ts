import { type _GettersTree, defineStore, type StateTree } from 'pinia';
import { useSupabaseSync } from '@/composables/supabase/useSupabaseSync';
import {
  actions,
  defaultState,
  getters,
  migrateToGameModeStructure,
  type UserActions,
  type UserProgressData,
  type UserState,
} from '@/stores/progressState';
import { useMetadataStore } from '@/stores/useMetadata';
import type { Task } from '@/types/tarkov';
import { GAME_MODES, type GameMode } from '@/utils/constants';
import { logger } from '@/utils/logger';
// Create a type that extends UserState with Pinia store methods
type TarkovStoreInstance = UserState & {
  $state: UserState;
  $patch(partialOrMutator: Partial<UserState> | ((state: UserState) => void)): void;
  repairGameModeFailedTasks(gameModeData: UserProgressData, tasksMap: Map<string, Task>): number;
  repairGameModeCompletedObjectives(
    gameModeData: UserProgressData,
    tasksMap: Map<string, Task>
  ): number;
  markTaskAsFailed(
    taskId: string,
    gameModeData: UserProgressData,
    tasksMap: Map<string, Task>
  ): number;
};
// Create typed getters object with the additional store-specific getters
const tarkovGetters = {
  ...getters,
  // Removed side-effect causing getters. Migration should be handled in actions or initialization.
} satisfies _GettersTree<UserState>;
// Create typed actions object with the additional store-specific actions
const tarkovActions = {
  ...(actions as UserActions),
  async switchGameMode(this: TarkovStoreInstance, mode: GameMode) {
    actions.switchGameMode.call(this, mode);
    const { $supabase } = useNuxtApp();
    if ($supabase.user.loggedIn && $supabase.user.id) {
      try {
        const completeState = {
          user_id: $supabase.user.id,
          current_game_mode: mode,
          game_edition: this.gameEdition,
          pvp_data: this.pvp,
          pve_data: this.pve,
        };
        await $supabase.client.from('user_progress').upsert(completeState);
      } catch (error) {
        logger.error('Error syncing gamemode to backend:', error);
      }
    }
  },
  migrateDataIfNeeded(this: TarkovStoreInstance) {
    const needsMigration =
      !this.currentGameMode ||
      !this.pvp ||
      !this.pve ||
      ((this as unknown as Record<string, unknown>).level !== undefined && !this.pvp?.level);
    if (needsMigration) {
      logger.debug('Migrating legacy data structure to gamemode-aware structure');
      const currentState = JSON.parse(JSON.stringify(this.$state));
      const migratedData = migrateToGameModeStructure(currentState);
      this.$patch(migratedData);
      const { $supabase } = useNuxtApp();
      if ($supabase.user.loggedIn && $supabase.user.id) {
        try {
          $supabase.client.from('user_progress').upsert({
            user_id: $supabase.user.id,
            current_game_mode: migratedData.currentGameMode,
            game_edition: migratedData.gameEdition,
            pvp_data: migratedData.pvp,
            pve_data: migratedData.pve,
          });
        } catch (error) {
          logger.error('Error saving migrated data to Supabase:', error);
        }
      }
    }
  },
  async resetOnlineProfile(this: TarkovStoreInstance) {
    const { $supabase } = useNuxtApp();
    if (!$supabase.user.loggedIn || !$supabase.user.id) {
      logger.error('User not logged in. Cannot reset online profile.');
      return;
    }
    try {
      const freshDefaultState = JSON.parse(JSON.stringify(defaultState));
      await $supabase.client.from('user_progress').upsert({
        user_id: $supabase.user.id,
        current_game_mode: freshDefaultState.currentGameMode,
        game_edition: freshDefaultState.gameEdition,
        pvp_data: freshDefaultState.pvp,
        pve_data: freshDefaultState.pve,
      });
      localStorage.clear();
      // Use $patch with a function to fully replace all nested objects (not deep merge)
      const freshState = JSON.parse(JSON.stringify(defaultState));
      this.$patch((state) => {
        state.currentGameMode = freshState.currentGameMode;
        state.gameEdition = freshState.gameEdition;
        state.pvp = freshState.pvp;
        state.pve = freshState.pve;
      });
    } catch (error) {
      logger.error('Error resetting online profile:', error);
    }
  },
  async resetCurrentGameModeData(this: TarkovStoreInstance) {
    const tarkovStore = useTarkovStore();
    const currentMode = tarkovStore.getCurrentGameMode();
    if (currentMode === GAME_MODES.PVP) {
      // Use the actions object directly to avoid type issues
      await tarkovActions.resetPvPData.call(this);
    } else {
      // Use the actions object directly to avoid type issues
      await tarkovActions.resetPvEData.call(this);
    }
  },
  async resetPvPData(this: TarkovStoreInstance) {
    const { $supabase } = useNuxtApp();
    logger.debug('[TarkovStore] Resetting PvP data...');
    try {
      // Pause sync to prevent re-sync loops
      const controller = getSyncController();
      if (controller) {
        controller.pause();
      }
      const freshPvPData = JSON.parse(JSON.stringify(defaultState.pvp));
      if ($supabase.user.loggedIn && $supabase.user.id) {
        // User is logged in - reset both Supabase and localStorage
        logger.debug('[TarkovStore] Resetting PvP data in Supabase');
        await $supabase.client.from('user_progress').upsert({
          user_id: $supabase.user.id,
          pvp_data: freshPvPData,
        });
      }
      // Clear localStorage and update store
      logger.debug('[TarkovStore] Clearing localStorage and updating store');
      localStorage.removeItem('progress');
      // Use $patch with a function to fully replace the pvp object (not deep merge)
      this.$patch((state) => {
        state.pvp = freshPvPData;
      });
      // Small delay to ensure all operations complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Resume sync
      if (controller) {
        controller.resume();
      }
      logger.debug('[TarkovStore] PvP data reset complete');
    } catch (error) {
      logger.error('[TarkovStore] Error resetting PvP data:', error);
      // Resume sync even on error
      const controller = getSyncController();
      if (controller) {
        controller.resume();
      }
      throw error;
    }
  },
  async resetPvEData(this: TarkovStoreInstance) {
    const { $supabase } = useNuxtApp();
    logger.debug('[TarkovStore] Resetting PvE data...');
    try {
      // Pause sync to prevent re-sync loops
      const controller = getSyncController();
      if (controller) {
        controller.pause();
      }
      const freshPvEData = JSON.parse(JSON.stringify(defaultState.pve));
      if ($supabase.user.loggedIn && $supabase.user.id) {
        // User is logged in - reset both Supabase and localStorage
        logger.debug('[TarkovStore] Resetting PvE data in Supabase');
        await $supabase.client.from('user_progress').upsert({
          user_id: $supabase.user.id,
          pve_data: freshPvEData,
        });
      }
      // Clear localStorage and update store
      logger.debug('[TarkovStore] Clearing localStorage and updating store');
      localStorage.removeItem('progress');
      // Use $patch with a function to fully replace the pve object (not deep merge)
      this.$patch((state) => {
        state.pve = freshPvEData;
      });
      // Small delay to ensure all operations complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Resume sync
      if (controller) {
        controller.resume();
      }
      logger.debug('[TarkovStore] PvE data reset complete');
    } catch (error) {
      logger.error('[TarkovStore] Error resetting PvE data:', error);
      // Resume sync even on error
      const controller = getSyncController();
      if (controller) {
        controller.resume();
      }
      throw error;
    }
  },
  async resetAllData(this: TarkovStoreInstance) {
    const { $supabase } = useNuxtApp();
    logger.debug('[TarkovStore] Resetting all data (both PvP and PvE)...');
    try {
      // Pause sync to prevent re-sync loops
      const controller = getSyncController();
      if (controller) {
        controller.pause();
      }
      const freshDefaultState = JSON.parse(JSON.stringify(defaultState));
      if ($supabase.user.loggedIn && $supabase.user.id) {
        // User is logged in - reset both Supabase and localStorage
        logger.debug('[TarkovStore] Resetting all data in Supabase');
        await $supabase.client.from('user_progress').upsert({
          user_id: $supabase.user.id,
          current_game_mode: freshDefaultState.currentGameMode,
          game_edition: freshDefaultState.gameEdition,
          pvp_data: freshDefaultState.pvp,
          pve_data: freshDefaultState.pve,
          // Ensure we don't lose the ID
        });
      }
      // Clear localStorage and reset entire store
      logger.debug('[TarkovStore] Clearing localStorage and resetting store');
      localStorage.clear();
      // Use $patch with a function to fully replace all nested objects (not deep merge)
      this.$patch((state) => {
        state.currentGameMode = freshDefaultState.currentGameMode;
        state.gameEdition = freshDefaultState.gameEdition;
        state.pvp = freshDefaultState.pvp;
        state.pve = freshDefaultState.pve;
      });
      // Small delay to ensure all operations complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Resume sync
      if (controller) {
        controller.resume();
      }
      logger.debug('[TarkovStore] All data reset complete');
    } catch (error) {
      logger.error('[TarkovStore] Error resetting all data:', error);
      // Resume sync even on error
      const controller = getSyncController();
      if (controller) {
        controller.resume();
      }
      throw error;
    }
  },
  /**
   * Repair failed task states for existing users.
   * This fixes data for users who completed tasks before the "failed alternatives" feature was implemented.
   * When a task is completed, its alternatives should be marked as failed.
   */
  repairFailedTaskStates(this: TarkovStoreInstance) {
    const metadataStore = useMetadataStore();
    const tasks = metadataStore.tasks;
    if (!tasks || tasks.length === 0) {
      logger.debug('[TarkovStore] No tasks available for repair, skipping');
      return { pvpRepaired: 0, pveRepaired: 0 };
    }
    // Create a map for O(1) task lookup
    const tasksMap = new Map<string, Task>();
    tasks.forEach((task) => tasksMap.set(task.id, task));
    let pvpRepaired = 0;
    let pveRepaired = 0;
    // Repair PvP data
    if (this.pvp?.taskCompletions) {
      pvpRepaired = this.repairGameModeFailedTasks(this.pvp, tasksMap);
    }
    // Repair PvE data
    if (this.pve?.taskCompletions) {
      pveRepaired = this.repairGameModeFailedTasks(this.pve, tasksMap);
    }
    if (pvpRepaired > 0 || pveRepaired > 0) {
      logger.debug(
        `[TarkovStore] Repaired failed task states - PvP: ${pvpRepaired}, PvE: ${pveRepaired}`
      );
    }
    return { pvpRepaired, pveRepaired };
  },
  /**
   * Repair objective states for completed tasks.
   * Ensures that any completed task has all its objectives marked complete.
   */
  repairCompletedTaskObjectives(this: TarkovStoreInstance) {
    const metadataStore = useMetadataStore();
    const tasks = metadataStore.tasks;
    if (!tasks || tasks.length === 0) {
      logger.debug('[TarkovStore] No tasks available for objective repair, skipping');
      return { pvpRepaired: 0, pveRepaired: 0 };
    }
    const tasksMap = new Map<string, Task>();
    tasks.forEach((task) => tasksMap.set(task.id, task));
    let pvpRepaired = 0;
    let pveRepaired = 0;
    if (this.pvp?.taskCompletions) {
      pvpRepaired = this.repairGameModeCompletedObjectives(this.pvp, tasksMap);
    }
    if (this.pve?.taskCompletions) {
      pveRepaired = this.repairGameModeCompletedObjectives(this.pve, tasksMap);
    }
    if (pvpRepaired > 0 || pveRepaired > 0) {
      logger.debug(
        `[TarkovStore] Repaired completed task objectives - PvP: ${pvpRepaired}, PvE: ${pveRepaired}`
      );
    }
    return { pvpRepaired, pveRepaired };
  },
  /**
   * Helper to repair objectives for completed tasks in a specific game mode.
   */
  repairGameModeCompletedObjectives(
    this: TarkovStoreInstance,
    gameModeData: UserProgressData,
    tasksMap: Map<string, Task>
  ): number {
    let repairedCount = 0;
    const completions = gameModeData.taskCompletions ?? {};
    if (!gameModeData.taskObjectives) {
      gameModeData.taskObjectives = {};
    }
    for (const [taskId, completion] of Object.entries(completions)) {
      if (!completion?.complete) continue;
      const task = tasksMap.get(taskId);
      if (!task?.objectives?.length) continue;
      for (const objective of task.objectives) {
        if (!objective?.id) continue;
        const existing = gameModeData.taskObjectives[objective.id] ?? {};
        let changed = false;
        if (existing.complete !== true) {
          existing.complete = true;
          changed = true;
        }
        if (objective.count !== undefined && objective.count > 0) {
          const requiredCount = objective.count;
          const existingCount = existing.count ?? 0;
          if (existingCount < requiredCount) {
            existing.count = requiredCount;
            changed = true;
          }
        }
        if (changed) {
          if (!existing.timestamp) {
            existing.timestamp = completion.timestamp ?? Date.now();
          }
          gameModeData.taskObjectives[objective.id] = existing;
          repairedCount += 1;
        }
      }
    }
    return repairedCount;
  },
  /**
   * Helper to repair failed tasks for a specific game mode's data.
   * Handles two cases:
   * 1. Task completed but alternative not marked as failed (simple case)
   * 2. Both task AND alternative marked as complete (use timestamps to determine which was first)
   */
  repairGameModeFailedTasks(
    this: TarkovStoreInstance,
    gameModeData: UserProgressData,
    tasksMap: Map<string, Task>
  ): number {
    let repairedCount = 0;
    const completions = gameModeData.taskCompletions ?? {};
    if (!gameModeData.taskCompletions) {
      gameModeData.taskCompletions = completions;
    }
    // Track which tasks we've already processed to avoid double-processing alternatives
    const processedPairs = new Set<string>();
    const normalizeStatuses = (statuses?: string[]) =>
      (statuses ?? []).map((status) => status.toLowerCase());
    const hasAnyStatus = (statuses: string[], values: string[]) =>
      values.some((value) => statuses.includes(value));
    const isFailedOnlyRequirement = (statuses?: string[]) => {
      const normalized = normalizeStatuses(statuses);
      if (normalized.length === 0) return false;
      return (
        normalized.includes('failed') &&
        !hasAnyStatus(normalized, ['active', 'accept', 'accepted', 'complete', 'completed'])
      );
    };
    const hasCompleteStatus = (statuses?: string[]) =>
      hasAnyStatus(normalizeStatuses(statuses), ['complete', 'completed']);
    const shouldFailWhenOtherCompleted = (task: Task | undefined, otherTaskId: string) => {
      if (!task) return false;
      const failedRequirement = task.taskRequirements?.some(
        (req) => req?.task?.id === otherTaskId && isFailedOnlyRequirement(req.status)
      );
      if (failedRequirement) return true;
      const failCondition = task.failConditions?.some(
        (objective) => objective?.task?.id === otherTaskId && hasCompleteStatus(objective.status)
      );
      return Boolean(failCondition);
    };
    // Find all successfully completed tasks
    for (const [taskId, completion] of Object.entries(completions)) {
      // Only process successfully completed tasks (complete=true, failed=false/undefined)
      if (!completion?.complete || completion?.failed) continue;
      const task = tasksMap.get(taskId);
      if (!task?.alternatives?.length) continue;
      for (const altTaskId of task.alternatives) {
        // Create a unique key for this pair to avoid double-processing
        const pairKey = [taskId, altTaskId].sort().join('|');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        const altCompletion = completions[altTaskId];
        // Skip if alternative is already marked as failed
        if (altCompletion?.failed) continue;
        // Case 1: Alternative not completed - mark it as failed
        if (!altCompletion?.complete) {
          repairedCount += this.markTaskAsFailed(altTaskId, gameModeData, tasksMap);
          continue;
        }
        // Case 2: BOTH are marked as complete (invalid state)
        // Use timestamps to determine which was completed first
        const taskTimestamp = completion.timestamp ?? 0;
        const altTimestamp = altCompletion.timestamp ?? 0;
        if (taskTimestamp === 0 && altTimestamp === 0) {
          const altTask = tasksMap.get(altTaskId);
          const shouldFailAlt = shouldFailWhenOtherCompleted(altTask, taskId);
          const shouldFailTask = shouldFailWhenOtherCompleted(task, altTaskId);
          if (shouldFailAlt && !shouldFailTask) {
            repairedCount += this.markTaskAsFailed(altTaskId, gameModeData, tasksMap);
            continue;
          }
          if (shouldFailTask && !shouldFailAlt) {
            repairedCount += this.markTaskAsFailed(taskId, gameModeData, tasksMap);
            continue;
          }
          const deterministicFail = taskId > altTaskId ? taskId : altTaskId;
          logger.warn(
            `[TarkovStore] Both "${taskId}" and alternative "${altTaskId}" are complete ` +
              `with no timestamps - applying deterministic fallback (failing "${deterministicFail}").`
          );
          repairedCount += this.markTaskAsFailed(deterministicFail, gameModeData, tasksMap);
          continue;
        }
        // Mark the one with the LATER timestamp as failed
        // (the earlier one is assumed to be the "real" completion)
        if (taskTimestamp >= altTimestamp && altTimestamp > 0) {
          // This task was completed later (or same time), mark IT as failed
          repairedCount += this.markTaskAsFailed(taskId, gameModeData, tasksMap);
        } else {
          // Alternative was completed later, mark IT as failed
          repairedCount += this.markTaskAsFailed(altTaskId, gameModeData, tasksMap);
        }
      }
    }
    return repairedCount;
  },
  /**
   * Helper to mark a single task as failed and complete its objectives
   */
  markTaskAsFailed(
    this: TarkovStoreInstance,
    taskId: string,
    gameModeData: UserProgressData,
    tasksMap: Map<string, Task>
  ): number {
    const completions = gameModeData.taskCompletions ?? {};
    if (!gameModeData.taskCompletions) {
      gameModeData.taskCompletions = completions;
    }
    if (!completions[taskId]) {
      completions[taskId] = {};
    }
    completions[taskId]!.complete = true;
    completions[taskId]!.failed = true;
    completions[taskId]!.timestamp = completions[taskId]!.timestamp ?? Date.now();
    // Also mark the task's objectives as complete
    const task = tasksMap.get(taskId);
    if (task?.objectives) {
      if (!gameModeData.taskObjectives) {
        gameModeData.taskObjectives = {};
      }
      for (const obj of task.objectives) {
        if (!obj?.id) continue;
        if (!gameModeData.taskObjectives[obj.id]) {
          gameModeData.taskObjectives[obj.id] = {};
        }
        gameModeData.taskObjectives[obj.id]!.complete = true;
      }
    }
    return 1;
  },
} satisfies UserActions & {
  switchGameMode(mode: GameMode): Promise<void>;
  migrateDataIfNeeded(): void;
  resetOnlineProfile(): Promise<void>;
  resetCurrentGameModeData(): Promise<void>;
  resetPvPData(): Promise<void>;
  resetPvEData(): Promise<void>;
  resetAllData(): Promise<void>;
  repairFailedTaskStates(): { pvpRepaired: number; pveRepaired: number };
  repairCompletedTaskObjectives(): { pvpRepaired: number; pveRepaired: number };
  repairGameModeFailedTasks(gameModeData: UserProgressData, tasksMap: Map<string, Task>): number;
  repairGameModeCompletedObjectives(
    gameModeData: UserProgressData,
    tasksMap: Map<string, Task>
  ): number;
  markTaskAsFailed(
    taskId: string,
    gameModeData: UserProgressData,
    tasksMap: Map<string, Task>
  ): number;
};
// Export type for external usage
export type TarkovStoreActions = typeof tarkovActions;
export const useTarkovStore = defineStore('swapTarkov', {
  state: () => {
    return JSON.parse(JSON.stringify(defaultState)) as UserState;
  },
  getters: tarkovGetters,
  actions: tarkovActions,
  // Enable automatic localStorage persistence with user scoping
  persist: {
    key: 'progress', // LocalStorage key for user progress data
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    // Add userId to serialized data to prevent cross-user contamination
    serializer: {
      serialize: (state: StateTree) => {
        // Get current user ID (may be null if not logged in)
        let currentUserId: string | null = null;
        try {
          const nuxtApp = useNuxtApp();
          currentUserId = nuxtApp.$supabase?.user?.id || null;
        } catch {
          // Nuxt app may not be available during SSR serialize
        }
        // Wrap state with userId for validation on restore
        const wrappedState = {
          _userId: currentUserId,
          _timestamp: Date.now(),
          data: state,
        };
        return JSON.stringify(wrappedState);
      },
      deserialize: (value: string) => {
        try {
          const parsed = JSON.parse(value);
          // Old format without wrapper (migrate)
          if (!parsed._userId && !parsed.data) {
            if (import.meta.dev) logger.debug('[TarkovStore] Migrating old localStorage format');
            return parsed as UserState;
          }
          // New format with wrapper - validate userId
          const storedUserId = parsed._userId;
          let currentUserId: string | null = null;
          try {
            const nuxtApp = useNuxtApp();
            currentUserId = nuxtApp.$supabase?.user?.id || null;
          } catch {
            // Nuxt app not available, allow restore for unauthenticated users
            if (!storedUserId) {
              return parsed.data as UserState;
            }
          }
          // If user is logged in and stored userId doesn't match, return default state
          if (currentUserId && storedUserId && storedUserId !== currentUserId) {
            logger.warn(
              `[TarkovStore] localStorage userId mismatch! ` +
                `Stored: ${storedUserId}, Current: ${currentUserId}. ` +
                `Backing up and clearing localStorage to prevent data corruption.`
            );
            // Backup the corrupted/mismatching localStorage
            if (typeof window !== 'undefined') {
              try {
                const backupKey = `progress_backup_${storedUserId}_${Date.now()}`;
                localStorage.setItem(backupKey, value);
                if (import.meta.dev) logger.debug(`[TarkovStore] Data backed up to ${backupKey}`);
                localStorage.removeItem('progress');
              } catch (e) {
                logger.error('[TarkovStore] Error backing up/clearing localStorage:', e);
              }
            }
            return JSON.parse(JSON.stringify(defaultState)) as UserState;
          }
          // UserId matches or user not logged in - safe to restore
          return parsed.data as UserState;
        } catch (e) {
          logger.error('[TarkovStore] Error deserializing localStorage:', e);
          return JSON.parse(JSON.stringify(defaultState)) as UserState;
        }
      },
    },
  },
});
// Export type for future typing
export type TarkovStore = ReturnType<typeof useTarkovStore>;
// Store reference to sync controller for pause/resume during resets
let syncController: ReturnType<typeof useSupabaseSync> | null = null;
export function getSyncController() {
  return syncController;
}
export async function initializeTarkovSync() {
  const tarkovStore = useTarkovStore();
  const { $supabase } = useNuxtApp();
  if (import.meta.client && $supabase.user.loggedIn) {
    logger.debug('[TarkovStore] Setting up Supabase sync and listener');
    // Helper to check if data has meaningful progress
    const hasProgress = (data: unknown) => {
      const state = data as UserState;
      if (!state) return false;
      const pvpHasData =
        state.pvp &&
        (state.pvp.level > 1 ||
          Object.keys(state.pvp.taskCompletions || {}).length > 0 ||
          Object.keys(state.pvp.hideoutModules || {}).length > 0);
      const pveHasData =
        state.pve &&
        (state.pve.level > 1 ||
          Object.keys(state.pve.taskCompletions || {}).length > 0 ||
          Object.keys(state.pve.hideoutModules || {}).length > 0);
      return pvpHasData || pveHasData;
    };
    const loadData = async () => {
      // Get current localStorage state (loaded by persist plugin)
      const localState = tarkovStore.$state;
      const hasLocalProgress = hasProgress(localState);
      const progressScore = (state: UserState): number => {
        const scoreMode = (mode: UserProgressData | undefined) => {
          if (!mode) return 0;
          return (
            Object.keys(mode.taskCompletions || {}).length +
            Object.keys(mode.taskObjectives || {}).length +
            Object.keys(mode.hideoutModules || {}).length +
            Object.keys(mode.hideoutParts || {}).length +
            (mode.level > 1 ? 1 : 0) +
            (mode.prestigeLevel || 0)
          );
        };
        return scoreMode(state.pvp) + scoreMode(state.pve);
      };
      logger.debug('[TarkovStore] Initial load starting...', {
        userId: $supabase.user.id,
        hasLocalProgress,
      });
      // Try to load from Supabase
      const { data, error } = await $supabase.client
        .from('user_progress')
        .select('*')
        .eq('user_id', $supabase.user.id)
        .single();
      logger.debug('[TarkovStore] Supabase query result:', {
        hasData: !!data,
        error: error?.code,
        errorMessage: error?.message,
      });
      // Handle query errors (but not "no rows" which is expected for new users)
      if (error && error.code !== 'PGRST116') {
        logger.error('[TarkovStore] Error loading data from Supabase:', error);
        return;
      }
      // Normalize Supabase data with defaults for safety
      const normalizedRemote = data
        ? ({
            currentGameMode: data.current_game_mode || GAME_MODES.PVP,
            gameEdition: data.game_edition || defaultState.gameEdition,
            pvp: { ...defaultState.pvp, ...(data.pvp_data || {}) },
            pve: { ...defaultState.pve, ...(data.pve_data || {}) },
          } as UserState)
        : null;
      const remoteScore = normalizedRemote ? progressScore(normalizedRemote) : 0;
      const localScore = progressScore(localState);
      if (data) {
        // If local has more progress than remote, protect local and push it to Supabase.
        if (localScore > remoteScore) {
          logger.warn('[TarkovStore] Local progress ahead of Supabase; preserving local data', {
            localScore,
            remoteScore,
          });
          await $supabase.client.from('user_progress').upsert({
            user_id: $supabase.user.id,
            current_game_mode: localState.currentGameMode || GAME_MODES.PVP,
            game_edition: localState.gameEdition || defaultState.gameEdition,
            pvp_data: localState.pvp || defaultState.pvp,
            pve_data: localState.pve || defaultState.pve,
          });
        } else {
          logger.debug('[TarkovStore] Loading data from Supabase (user exists in DB)');
          tarkovStore.$patch(normalizedRemote!);
        }
      } else if (hasLocalProgress) {
        // No Supabase record at all, but localStorage has progress - migrate it
        logger.debug('[TarkovStore] Migrating localStorage data to Supabase');
        const migrateData = {
          user_id: $supabase.user.id,
          current_game_mode: localState.currentGameMode || GAME_MODES.PVP,
          game_edition: localState.gameEdition || defaultState.gameEdition,
          pvp_data: localState.pvp || defaultState.pvp,
          pve_data: localState.pve || defaultState.pve,
        };
        await $supabase.client.from('user_progress').upsert(migrateData);
        logger.debug('[TarkovStore] Migration complete');
      } else {
        // Truly new user - no data anywhere
        logger.debug('[TarkovStore] New user - no existing progress found');
      }
      logger.debug('[TarkovStore] Initial load complete, sync enabled');
    };
    // Wait for data load to complete BEFORE enabling sync
    // This prevents race conditions and overwriting server data with empty local state
    await loadData();
    // Repair failed task states for existing users (runs once after data load)
    // This fixes data for users who completed tasks before the "failed alternatives" feature
    tarkovStore.repairFailedTaskStates();
    tarkovStore.repairCompletedTaskObjectives();
    syncController = useSupabaseSync({
      store: tarkovStore,
      table: 'user_progress',
      debounceMs: 250,
      transform: (state: unknown) => {
        const userState = state as UserState;
        return {
          user_id: $supabase.user.id,
          current_game_mode: userState.currentGameMode || GAME_MODES.PVP,
          game_edition:
            typeof userState.gameEdition === 'string'
              ? parseInt(userState.gameEdition)
              : userState.gameEdition,
          pvp_data: userState.pvp || {},
          pve_data: userState.pve || {},
        };
      },
    });
  }
}
