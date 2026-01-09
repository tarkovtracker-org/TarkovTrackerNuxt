import { type _GettersTree, defineStore, type StateTree } from 'pinia';
import { toRaw, watch } from 'vue';
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
type UserProgressRow = {
  user_id: string;
  current_game_mode: string | null;
  game_edition: number | null;
  pvp_data: UserProgressData | null;
  pve_data: UserProgressData | null;
  created_at: string | null;
  updated_at: string | null;
};
const coerceGameMode = (mode?: string | null): GameMode => {
  return mode === GAME_MODES.PVE ? GAME_MODES.PVE : GAME_MODES.PVP;
};
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
        lastLocalSyncTime = Date.now(); // Track for self-origin filtering
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
      const currentState = structuredClone(toRaw(this.$state));
      const migratedData = migrateToGameModeStructure(currentState);
      this.$patch(migratedData);
      const { $supabase } = useNuxtApp();
      if ($supabase.user.loggedIn && $supabase.user.id) {
        try {
          lastLocalSyncTime = Date.now(); // Track for self-origin filtering
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
      const freshDefaultState = structuredClone(defaultState);
      await $supabase.client.from('user_progress').upsert({
        user_id: $supabase.user.id,
        current_game_mode: freshDefaultState.currentGameMode,
        game_edition: freshDefaultState.gameEdition,
        pvp_data: freshDefaultState.pvp,
        pve_data: freshDefaultState.pve,
      });
      localStorage.clear();
      // Use $patch with a function to fully replace all nested objects (not deep merge)
      const freshState = structuredClone(defaultState);
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
      const freshPvPData = structuredClone(defaultState.pvp);
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
      const freshPvEData = structuredClone(defaultState.pve);
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
      const freshDefaultState = structuredClone(defaultState);
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
    return structuredClone(defaultState) as UserState;
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
        const serialized = JSON.stringify(wrappedState);
        // QUOTA MANAGEMENT: Check if localStorage has enough space
        if (typeof window !== 'undefined') {
          try {
            // Estimate current localStorage usage
            let currentUsage = 0;
            for (const key in localStorage) {
              if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                currentUsage += localStorage[key].length + key.length;
              }
            }
            const neededSpace = serialized.length;
            const estimatedQuota = 5 * 1024 * 1024; // 5MB typical limit
            const safetyBuffer = 512 * 1024; // 512KB buffer
            // If we're close to quota, clean up old backups
            if (currentUsage + neededSpace > estimatedQuota - safetyBuffer) {
              logger.warn('[TarkovStore] localStorage quota low, cleaning up old backups', {
                currentUsage: Math.round(currentUsage / 1024) + 'KB',
                needed: Math.round(neededSpace / 1024) + 'KB',
                quota: Math.round(estimatedQuota / 1024) + 'KB',
              });
              // Get all backup keys sorted by timestamp (oldest first)
              const backupKeys = Object.keys(localStorage)
                .filter((k) => k.startsWith(STORAGE_KEYS.progressBackupPrefix))
                .sort((a, b) => {
                  // Extract timestamp from key (format: prefix_userId_timestamp or prefix_isoString)
                  const extractTimestamp = (key: string): number => {
                    const suffix = key.substring(STORAGE_KEYS.progressBackupPrefix.length);
                    // Try parsing as ISO string first
                    const isoDate = Date.parse(suffix);
                    if (!isNaN(isoDate)) return isoDate;
                    // Try extracting numeric timestamp from userId_timestamp format
                    const parts = suffix.split('_');
                    const lastPart = parts[parts.length - 1] ?? '';
                    const numericTimestamp = parseInt(lastPart, 10);
                    return isNaN(numericTimestamp) ? 0 : numericTimestamp;
                  };
                  return extractTimestamp(a) - extractTimestamp(b);
                });
              // Remove old backups until we have enough space
              let removedCount = 0;
              for (const key of backupKeys) {
                if (currentUsage + neededSpace <= estimatedQuota - safetyBuffer) break;
                const keySize = localStorage[key].length + key.length;
                localStorage.removeItem(key);
                currentUsage -= keySize;
                removedCount++;
                logger.debug(`[TarkovStore] Removed old backup: ${key}`);
              }
              if (removedCount > 0) {
                logger.info(`[TarkovStore] Cleaned up ${removedCount} old backups to free space`);
              }
            }
          } catch (quotaError) {
            logger.error('[TarkovStore] Error managing localStorage quota:', quotaError);
            // If we can't manage quota, try to at least warn the user
            // The persist plugin will handle the actual save error
          }
        }
        return serialized;
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
            return structuredClone(defaultState) as UserState;
          }
          // UserId matches or user not logged in - safe to restore
          return parsed.data as UserState;
        } catch (e) {
          logger.error('[TarkovStore] Error deserializing localStorage:', e);
          return structuredClone(defaultState) as UserState;
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
  cleanupRealtimeListener();
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
      const freshDefaultState = structuredClone(defaultState);
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
      // Try to load from Supabase with retry logic to prevent race conditions
      let data: UserProgressRow | null = null;
      let error: { code?: string; message?: string } | null = null;
      const maxRetries = 3;
      const retryDelayMs = 500;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
          logger.debug(`[TarkovStore] Retry attempt ${attempt + 1}/${maxRetries}`);
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
        const result = await $supabase.client
          .from('user_progress')
          .select('*')
          .eq('user_id', $supabase.user.id)
          .single();
        data = result.data as UserProgressRow | null;
        error = result.error as { code?: string; message?: string } | null;
        // Break if we got data or a real error (not "no rows")
        if (data || (error && error.code !== 'PGRST116')) {
          break;
        }
      }
      logger.debug('[TarkovStore] Supabase query result:', {
        hasData: !!data,
        error: error?.code ?? null,
        errorMessage: error?.message ?? null,
      });
      const hadRemoteData = Boolean(data);
      // Handle query errors (but not "no rows" which is expected for new users)
      if (error && error.code !== 'PGRST116') {
        logger.error('[TarkovStore] Error loading data from Supabase:', error);
        return { ok: false, hadRemoteData };
      }
      let success = true; // Use simple variable to track success from within rAF
      // Wrap heavy data processing in rAF to avoid blocking the main thread
      await new Promise<void>((resolve) => {
        requestAnimationFrame(async () => {
          // Normalize Supabase data with defaults for safety
          const normalizedRemote = data
            ? ({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                currentGameMode: coerceGameMode((data as any).current_game_mode),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                gameEdition: (data as any).game_edition || defaultState.gameEdition,
                // Use structuredClone for deep copy of defaults
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pvp: { ...structuredClone(defaultState.pvp), ...((data as any).pvp_data || {}) },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pve: { ...structuredClone(defaultState.pve), ...((data as any).pve_data || {}) },
              } as UserState)
            : null;

          const remoteScore = normalizedRemote ? progressScore(normalizedRemote) : 0;
          const localScore = progressScore(localState);

          if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const remoteUpdatedAt = (data as any).updated_at
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Date.parse((data as any).updated_at)
              : null;

            const localOwnedByUser = storedUserId === currentUserId;

            if (hasLocalProgress && !localOwnedByUser && storedUserId === null) {
              notifyLocalIgnored(
                'Found local guest progress on this device; your cloud progress was kept.'
              );
            }

            let shouldPreferLocal = false;

            // Conflict resolution logic
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
              lastLocalSyncTime = Date.now(); // Track for self-origin filtering
              const { error: upsertError } = await $supabase.client.from('user_progress').upsert({
                user_id: $supabase.user.id,
                current_game_mode: localState.currentGameMode || GAME_MODES.PVP,
                game_edition: localState.gameEdition || defaultState.gameEdition,
                pvp_data: localState.pvp || defaultState.pvp,
                pve_data: localState.pve || defaultState.pve,
              });

              if (upsertError) {
                logger.error(
                  '[TarkovStore] Error syncing local progress to Supabase:',
                  upsertError
                );
                // Even if upsert fails, we keep local data as it's newer
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

            lastLocalSyncTime = Date.now(); // Track for self-origin filtering
            const { error: upsertError } = await $supabase.client
              .from('user_progress')
              .upsert(migrateData);

            if (upsertError) {
              logger.error('[TarkovStore] Error migrating local data to Supabase:', upsertError);
            } else {
              logger.debug('[TarkovStore] Migration complete');
            }
          } else {
            // SAFETY CHECKS: Before treating as "new user", verify this isn't Issue #71 scenario
            // Issue #71: User links a second OAuth provider → race condition → false "no data" → overwrites

            // Check 1: Account age
            const accountCreatedAt = $supabase.user.createdAt;
            const accountAgeMs = accountCreatedAt ? Date.now() - Date.parse(accountCreatedAt) : 0;
            const isRecentlyCreated = accountAgeMs < 5000; // 5 seconds threshold

            // Check 2: Multiple OAuth providers - strongest signal of Issue #71
            const linkedProviders = $supabase.user.providers || [];
            const hasMultipleProviders = linkedProviders.length > 1;

            // ONLY block if hasMultipleProviders (Issue #71 scenario)
            // OLD accounts with single provider are legitimate first-time users who waited to log in
            if (hasMultipleProviders) {
              // Multiple providers + no data = Issue #71 race condition
              logger.error(
                '[TarkovStore] SAFETY ABORT: Multi-provider account with no progress data (Issue #71)',
                {
                  accountAgeMs,
                  isRecentlyCreated,
                  linkedProviders,
                  hasMultipleProviders,
                  userId: $supabase.user.id,
                }
              );

              // Reset to default state but DO NOT sync to Supabase
              // This prevents overwriting potentially existing data
              resetStoreToDefault();

              // Notify user of the issue
              const toast = useToast();
              toast.add({
                title: 'Unable to load progress',
                description:
                  'We detected an issue loading your account data. Please refresh the page or contact support if this persists.',
                color: 'error',
                duration: 10000,
              });
              success = false;
            } else {
              // All safety checks passed - truly new user (or old account, first login)
              logger.debug('[TarkovStore] New user - no existing progress found', {
                accountAgeMs,
                linkedProviders,
              });
            }
          }
          resolve();
        });
      });
      if (!success) {
        return { ok: false, hadRemoteData: false };
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
        debounceMs: 5000, // Increased from 1s to reduce egress
        transform: (state: unknown) => {
          const userState = state as UserState;
          // SAFETY CHECK: Prevent syncing completely empty state for existing accounts
          // This protects against accidental data overwrites during edge cases
          const stateHasProgress = hasProgress(userState);
          if (!stateHasProgress && loadResult.hadRemoteData) {
            logger.warn(
              '[TarkovStore] Blocking sync of empty state - account had remote data on load'
            );
            return null; // Returning null prevents the sync
          }
          // Track sync time for self-origin filtering in realtime listener
          lastLocalSyncTime = Date.now();
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
    // MULTI-DEVICE CONFLICT RESOLUTION
    // Setup realtime listener for remote changes from other devices
    setupRealtimeListener();
  }
}
// Realtime channel for multi-device sync
let realtimeChannel: unknown = null;
let lastLocalSyncTime = 0; // Track when we last synced locally to filter self-origin updates
/**
 * Setup realtime listener for user_progress changes from other devices
 * This prevents silent data overwrites when using multiple devices simultaneously
 */
function setupRealtimeListener() {
  const { $supabase } = useNuxtApp();
  const tarkovStore = useTarkovStore();
  if (!$supabase.user.loggedIn || !$supabase.user.id) return;
  // Clean up existing channel if any
  if (realtimeChannel) {
    $supabase.client.removeChannel(
      realtimeChannel as Parameters<typeof $supabase.client.removeChannel>[0]
    );
    realtimeChannel = null;
  }
  logger.debug('[TarkovStore] Setting up realtime listener for multi-device sync');
  realtimeChannel = $supabase.client
    .channel(`user_progress_${$supabase.user.id}`)
    .on(
      'postgres_changes' as const,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_progress',
        filter: `user_id=eq.${$supabase.user.id}`,
      },
      (payload: { new: unknown; old: unknown }) => {
        const remoteData = payload.new as {
          current_game_mode?: string;
          game_edition?: number;
          pvp_data?: UserProgressData;
          pve_data?: UserProgressData;
          updated_at?: string;
        };
        // SELF-ORIGIN FILTERING: Ignore updates that are likely from this client
        // If update came within 3 seconds of our last local sync, it's probably ours
        const updateTime = remoteData.updated_at ? Date.parse(remoteData.updated_at) : Date.now();
        const timeSinceLastSync = updateTime - lastLocalSyncTime;
        const SELF_ORIGIN_THRESHOLD_MS = 3000; // 3 seconds
        if (timeSinceLastSync < SELF_ORIGIN_THRESHOLD_MS && timeSinceLastSync >= 0) {
          logger.debug('[TarkovStore] Ignoring realtime update - likely self-origin', {
            timeSinceLastSync,
            threshold: SELF_ORIGIN_THRESHOLD_MS,
          });
          return;
        }
        logger.warn('[TarkovStore] Remote update detected from another device, merging changes');
        // Pause local sync to prevent update loop
        const controller = getSyncController();
        if (controller) {
          controller.pause();
        }
        // Get current local state
        const localState = tarkovStore.$state;
        // Merge remote changes with local state
        const merged: Partial<UserState> = {
          currentGameMode: remoteData.current_game_mode
            ? coerceGameMode(remoteData.current_game_mode)
            : localState.currentGameMode,
          gameEdition: remoteData.game_edition || localState.gameEdition,
          pvp: mergeProgressData(localState.pvp, remoteData.pvp_data),
          pve: mergeProgressData(localState.pve, remoteData.pve_data),
        };
        // Apply merged state
        tarkovStore.$patch(merged);
        // Resume sync after a short delay
        setTimeout(() => {
          if (controller) {
            controller.resume();
          }
        }, 1000);
        // Notify user
        const toast = useToast();
        toast.add({
          title: 'Progress synced',
          description: 'Changes from another device were merged with your local progress.',
          color: 'info',
          duration: 5000,
        });
      }
    )
    .subscribe((status: string) => {
      logger.debug(`[TarkovStore] Realtime subscription status: ${status}`);
    });
}
/**
 * Merge two progress data objects, preserving maximum progress from both
 * Strategy: Union of completed items, max values for levels/counts
 */
function mergeProgressData(
  local: UserProgressData | undefined,
  remote: UserProgressData | undefined
): UserProgressData {
  if (!local && !remote) return {} as UserProgressData;
  if (!local) return remote!;
  if (!remote) return local;
  return {
    level: Math.max(local.level || 1, remote.level || 1),
    prestigeLevel: Math.max(local.prestigeLevel || 0, remote.prestigeLevel || 0),
    displayName: remote.displayName || local.displayName,
    pmcFaction: remote.pmcFaction || local.pmcFaction,
    xpOffset: remote.xpOffset !== undefined ? remote.xpOffset : local.xpOffset,
    // Merge task completions - union of both (keep all completed tasks)
    taskCompletions: {
      ...local.taskCompletions,
      ...remote.taskCompletions,
      // For conflicts, prefer the one marked complete
      ...Object.fromEntries(
        Object.entries({ ...local.taskCompletions, ...remote.taskCompletions }).map(
          ([id, completion]) => {
            const localComp = local.taskCompletions?.[id];
            const remoteComp = remote.taskCompletions?.[id];
            if (localComp && remoteComp) {
              // Both exist - prefer complete over incomplete
              return [
                id,
                {
                  complete: localComp.complete || remoteComp.complete,
                  failed: localComp.failed || remoteComp.failed,
                  timestamp: Math.max(localComp.timestamp || 0, remoteComp.timestamp || 0),
                },
              ];
            }
            return [id, completion];
          }
        )
      ),
    },
    // Merge objectives - max counts
    taskObjectives: {
      ...local.taskObjectives,
      ...remote.taskObjectives,
      ...Object.fromEntries(
        Object.entries({ ...local.taskObjectives, ...remote.taskObjectives }).map(
          ([id, objective]) => {
            const localObj = local.taskObjectives?.[id];
            const remoteObj = remote.taskObjectives?.[id];
            if (localObj && remoteObj) {
              return [
                id,
                {
                  complete: localObj.complete || remoteObj.complete,
                  count: Math.max(localObj.count || 0, remoteObj.count || 0),
                  timestamp:
                    localObj.timestamp && remoteObj.timestamp
                      ? Math.max(localObj.timestamp, remoteObj.timestamp)
                      : localObj.timestamp || remoteObj.timestamp,
                },
              ];
            }
            return [id, objective];
          }
        )
      ),
    },
    // Merge hideout modules - union
    hideoutModules: {
      ...local.hideoutModules,
      ...remote.hideoutModules,
      ...remote.hideoutModules,
    },
    // Merge hideout parts - max counts
    hideoutParts: {
      ...local.hideoutParts,
      ...remote.hideoutParts,
      ...Object.fromEntries(
        Object.entries({ ...local.hideoutParts, ...remote.hideoutParts }).map(([id, part]) => {
          const localPart = local.hideoutParts?.[id];
          const remotePart = remote.hideoutParts?.[id];
          if (localPart && remotePart) {
            return [
              id,
              {
                complete: localPart.complete || remotePart.complete,
                count: Math.max(localPart.count || 0, remotePart.count || 0),
                timestamp:
                  localPart.timestamp && remotePart.timestamp
                    ? Math.max(localPart.timestamp, remotePart.timestamp)
                    : localPart.timestamp || remotePart.timestamp,
              },
            ];
          }
          return [id, part];
        })
      ),
    },
    // Merge traders - max level and reputation
    traders: {
      ...local.traders,
      ...remote.traders,
      ...Object.fromEntries(
        Object.entries({ ...local.traders, ...remote.traders }).map(([traderId, trader]) => {
          const localTrader = local.traders?.[traderId];
          const remoteTrader = remote.traders?.[traderId];
          if (localTrader && remoteTrader) {
            return [
              traderId,
              {
                level: Math.max(localTrader.level || 1, remoteTrader.level || 1),
                reputation: Math.max(localTrader.reputation || 0, remoteTrader.reputation || 0),
              },
            ];
          }
          return [traderId, trader];
        })
      ),
    },
    // Merge skills - max values
    skills: {
      ...local.skills,
      ...remote.skills,
      ...Object.fromEntries(
        Object.entries({ ...local.skills, ...remote.skills }).map(([skillName, skillLevel]) => {
          const localSkill = local.skills?.[skillName];
          const remoteSkill = remote.skills?.[skillName];
          if (localSkill !== undefined && remoteSkill !== undefined) {
            return [skillName, Math.max(localSkill, remoteSkill)];
          }
          return [skillName, skillLevel];
        })
      ),
    },
    // Merge skillOffsets - prefer remote (latest manual adjustment)
    skillOffsets: {
      ...local.skillOffsets,
      ...remote.skillOffsets,
    },
  };
}
/**
 * Cleanup realtime listener on disconnect
 */
function cleanupRealtimeListener() {
  if (realtimeChannel) {
    const { $supabase } = useNuxtApp();
    $supabase.client.removeChannel(
      realtimeChannel as Parameters<typeof $supabase.client.removeChannel>[0]
    );
    realtimeChannel = null;
    logger.debug('[TarkovStore] Cleaned up realtime listener');
  }
}
