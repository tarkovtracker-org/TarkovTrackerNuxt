import { type _GettersTree, defineStore, type StateTree } from 'pinia';
import { watch } from 'vue';
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
import { STORAGE_KEYS } from '@/utils/storageKeys';
import { useToast } from '#imports';
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
      localStorage.removeItem(STORAGE_KEYS.progress);
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
      localStorage.removeItem(STORAGE_KEYS.progress);
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
    const clearFailedTaskObjectives = (
      gameModeData: UserProgressData,
      tasksLookup: Map<string, Task>
    ) => {
      if (!gameModeData.taskObjectives) return 0;
      let clearedTasks = 0;
      const completions = gameModeData.taskCompletions ?? {};
      for (const [taskId, completion] of Object.entries(completions)) {
        if (!completion?.failed) continue;
        const task = tasksLookup.get(taskId);
        if (!task?.objectives?.length) continue;
        let cleared = false;
        for (const obj of task.objectives) {
          if (!obj?.id) continue;
          const existing = gameModeData.taskObjectives[obj.id];
          if (!existing) continue;
          if (existing.complete || (existing.count ?? 0) > 0) {
            existing.complete = false;
            if (existing.count !== undefined || (obj.count ?? 0) > 0) {
              existing.count = 0;
            }
            cleared = true;
          }
        }
        if (cleared) {
          clearedTasks += 1;
        }
      }
      return clearedTasks;
    };
    let pvpRepaired = 0;
    let pveRepaired = 0;
    let pvpCleared = 0;
    let pveCleared = 0;
    // Repair PvP data
    if (this.pvp?.taskCompletions) {
      pvpRepaired = this.repairGameModeFailedTasks(this.pvp, tasksMap);
      pvpCleared = clearFailedTaskObjectives(this.pvp, tasksMap);
    }
    // Repair PvE data
    if (this.pve?.taskCompletions) {
      pveRepaired = this.repairGameModeFailedTasks(this.pve, tasksMap);
      pveCleared = clearFailedTaskObjectives(this.pve, tasksMap);
    }
    if (pvpRepaired > 0 || pveRepaired > 0) {
      logger.debug(
        `[TarkovStore] Repaired failed task states - PvP: ${pvpRepaired}, PvE: ${pveRepaired}`
      );
    }
    if (pvpCleared > 0 || pveCleared > 0) {
      logger.debug(
        `[TarkovStore] Cleared objectives for failed tasks - PvP: ${pvpCleared}, PvE: ${pveCleared}`
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
      if (!completion?.complete || completion?.failed) continue;
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
    // Clear the task's objectives when failed
    const task = tasksMap.get(taskId);
    if (task?.objectives) {
      if (!gameModeData.taskObjectives) {
        gameModeData.taskObjectives = {};
      }
      for (const obj of task.objectives) {
        if (!obj?.id) continue;
        const existing = gameModeData.taskObjectives[obj.id] ?? {};
        existing.complete = false;
        if (existing.count !== undefined || (obj.count ?? 0) > 0) {
          existing.count = 0;
        }
        gameModeData.taskObjectives[obj.id] = existing;
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
    key: STORAGE_KEYS.progress, // LocalStorage key for user progress data
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
                const backupKey = `${STORAGE_KEYS.progressBackupPrefix}${storedUserId}_${Date.now()}`;
                localStorage.setItem(backupKey, value);
                if (import.meta.dev) logger.debug(`[TarkovStore] Data backed up to ${backupKey}`);
                localStorage.removeItem(STORAGE_KEYS.progress);
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
let syncUserId: string | null = null;
let pendingSyncWatchStop: (() => void) | null = null;
let hasShownLocalIgnoreToast = false;
export function getSyncController() {
  return syncController;
}
export function resetTarkovSync(reason?: string) {
  if (syncController) {
    logger.debug(`[TarkovStore] Clearing Supabase sync${reason ? ` (${reason})` : ''}`);
    syncController.cleanup();
    syncController = null;
  }
  if (pendingSyncWatchStop) {
    pendingSyncWatchStop();
    pendingSyncWatchStop = null;
  }
  syncUserId = null;
  hasShownLocalIgnoreToast = false;
}
export async function initializeTarkovSync() {
  const tarkovStore = useTarkovStore();
  const { $supabase } = useNuxtApp();
  if (import.meta.client && $supabase.user.loggedIn) {
    const currentUserId = $supabase.user.id;
    if (syncController) {
      if (syncUserId === currentUserId) {
        logger.debug('[TarkovStore] Supabase sync already initialized, skipping');
        return;
      }
      logger.warn('[TarkovStore] Supabase sync user changed; resetting');
      resetTarkovSync('user changed');
    }
    logger.debug('[TarkovStore] Setting up Supabase sync and listener');
    const getLocalStorageMeta = () => {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEYS.progress);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as
          | { _userId?: string | null; _timestamp?: number; data?: unknown }
          | Record<string, unknown>;
        if (parsed && typeof parsed === 'object' && 'data' in parsed) {
          return {
            storedUserId: (parsed as { _userId?: string | null })._userId ?? null,
            timestamp:
              typeof (parsed as { _timestamp?: number })._timestamp === 'number'
                ? (parsed as { _timestamp?: number })._timestamp
                : null,
          };
        }
        // Old format without wrapper (treat as guest/unknown)
        return { storedUserId: null, timestamp: null };
      } catch {
        return null;
      }
    };
    const notifyLocalIgnored = (description: string) => {
      if (!import.meta.client || hasShownLocalIgnoreToast) return;
      const toast = useToast();
      toast.add({
        title: 'Local progress ignored',
        description,
        color: 'warning',
      });
      hasShownLocalIgnoreToast = true;
    };
    const resetStoreToDefault = () => {
      const freshDefaultState = JSON.parse(JSON.stringify(defaultState));
      tarkovStore.$patch((state) => {
        state.currentGameMode = freshDefaultState.currentGameMode;
        state.gameEdition = freshDefaultState.gameEdition;
        state.pvp = freshDefaultState.pvp;
        state.pve = freshDefaultState.pve;
      });
    };
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
    const loadData = async (): Promise<{ ok: boolean; hadRemoteData: boolean }> => {
      const localMeta = getLocalStorageMeta();
      const storedUserId = localMeta?.storedUserId ?? null;
      const localTimestamp = localMeta?.timestamp ?? null;
      const hasLocalPersistence = Boolean(localMeta);
      if (storedUserId && storedUserId !== currentUserId) {
        logger.warn('[TarkovStore] Local progress belongs to a different user; clearing');
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.progress);
        }
        resetStoreToDefault();
        notifyLocalIgnored(
          'Local progress belongs to another account and was not applied to protect your cloud data.'
        );
      }
      // Get current localStorage state (loaded by persist plugin)
      let localState = tarkovStore.$state;
      let hasLocalProgress = hasProgress(localState);
      if (hasLocalProgress && !hasLocalPersistence) {
        logger.warn('[TarkovStore] Local progress exists in memory without persistence; resetting');
        resetStoreToDefault();
        localState = tarkovStore.$state;
        hasLocalProgress = hasProgress(localState);
        notifyLocalIgnored(
          'Found temporary local progress that was not saved to your device; cloud progress was kept.'
        );
      }
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
      const hadRemoteData = Boolean(data);
      // Handle query errors (but not "no rows" which is expected for new users)
      if (error && error.code !== 'PGRST116') {
        logger.error('[TarkovStore] Error loading data from Supabase:', error);
        return { ok: false, hadRemoteData };
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
        const remoteUpdatedAt = data.updated_at ? Date.parse(data.updated_at) : null;
        const localOwnedByUser = storedUserId === currentUserId;
        if (hasLocalProgress && !localOwnedByUser && storedUserId === null) {
          notifyLocalIgnored(
            'Found local guest progress on this device; your cloud progress was kept.'
          );
        }
        let shouldPreferLocal = false;
        if (localOwnedByUser && localTimestamp && remoteUpdatedAt) {
          shouldPreferLocal = localTimestamp > remoteUpdatedAt;
        } else if (localOwnedByUser && localTimestamp && !remoteUpdatedAt) {
          shouldPreferLocal = localScore > remoteScore;
        } else if (localOwnedByUser && !localTimestamp && !remoteUpdatedAt) {
          shouldPreferLocal = localScore > remoteScore;
        }
        // If local has more progress than remote, protect local and push it to Supabase.
        if (shouldPreferLocal) {
          logger.warn('[TarkovStore] Local progress ahead of Supabase; preserving local data', {
            localScore,
            remoteScore,
          });
          const { error: upsertError } = await $supabase.client.from('user_progress').upsert({
            user_id: $supabase.user.id,
            current_game_mode: localState.currentGameMode || GAME_MODES.PVP,
            game_edition: localState.gameEdition || defaultState.gameEdition,
            pvp_data: localState.pvp || defaultState.pvp,
            pve_data: localState.pve || defaultState.pve,
          });
          if (upsertError) {
            logger.error('[TarkovStore] Error syncing local progress to Supabase:', upsertError);
            return { ok: false, hadRemoteData };
          }
        } else {
          logger.debug('[TarkovStore] Loading data from Supabase (user exists in DB)');
          tarkovStore.$patch(normalizedRemote!);
        }
      } else if (hasLocalProgress && hasLocalPersistence) {
        // No Supabase record at all, but localStorage has progress - migrate it
        logger.debug('[TarkovStore] Migrating localStorage data to Supabase');
        const migrateData = {
          user_id: $supabase.user.id,
          current_game_mode: localState.currentGameMode || GAME_MODES.PVP,
          game_edition: localState.gameEdition || defaultState.gameEdition,
          pvp_data: localState.pvp || defaultState.pvp,
          pve_data: localState.pve || defaultState.pve,
        };
        const { error: upsertError } = await $supabase.client
          .from('user_progress')
          .upsert(migrateData);
        if (upsertError) {
          logger.error('[TarkovStore] Error migrating local data to Supabase:', upsertError);
          return { ok: false, hadRemoteData };
        }
        logger.debug('[TarkovStore] Migration complete');
      } else {
        // Truly new user - no data anywhere
        logger.debug('[TarkovStore] New user - no existing progress found');
      }
      logger.debug('[TarkovStore] Initial load complete');
      return { ok: true, hadRemoteData };
    };
    // Wait for data load to complete BEFORE enabling sync
    // This prevents race conditions and overwriting server data with empty local state
    const loadResult = await loadData();
    if (!loadResult.ok) {
      logger.error('[TarkovStore] Initial load failed; sync not started');
      throw new Error('Supabase initial load failed');
    }
    // Repair failed task states for existing users (runs once after data load)
    // This fixes data for users who completed tasks before the "failed alternatives" feature
    tarkovStore.repairFailedTaskStates();
    tarkovStore.repairCompletedTaskObjectives();
    const startSync = () => {
      if (syncController) return;
      if (pendingSyncWatchStop) {
        pendingSyncWatchStop();
        pendingSyncWatchStop = null;
      }
      syncUserId = currentUserId ?? null;
      syncController = useSupabaseSync({
        store: tarkovStore,
        table: 'user_progress',
        debounceMs: 1000,
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
    };
    const shouldStartSyncNow = loadResult.hadRemoteData || hasProgress(tarkovStore.$state);
    if (shouldStartSyncNow) {
      startSync();
    } else {
      logger.debug('[TarkovStore] Delaying sync until progress exists');
      const stopWatch = watch(
        () => tarkovStore.$state,
        (state) => {
          if (hasProgress(state)) {
            startSync();
          }
        },
        { deep: true }
      );
      pendingSyncWatchStop = stopWatch;
    }
  }
}
