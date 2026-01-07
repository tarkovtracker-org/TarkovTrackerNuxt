import { getCurrentInstance, onUnmounted, ref, toRaw, watch } from 'vue';
import { debounce } from '@/utils/helpers';
import { logger } from '@/utils/logger';
import type { Store } from 'pinia';
import type { UserProgressData } from '~/stores/progressState';
export interface SupabaseSyncConfig {
  store: Store;
  table: string;
  transform?: (state: Record<string, unknown>) => Record<string, unknown> | null;
  debounceMs?: number;
}
// Type for the transformed data that gets sent to Supabase
interface SupabaseUserData {
  user_id?: string;
  current_game_mode?: string;
  game_edition?: number;
  pvp_data?: UserProgressData;
  pve_data?: UserProgressData;
  [key: string]: unknown;
}
// Fast hash for change detection - avoids full JSON comparison
function hashState(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
export function useSupabaseSync({
  store,
  table,
  transform,
  debounceMs = 1000,
}: SupabaseSyncConfig) {
  logger.debug(`[Sync] useSupabaseSync initialized for table: ${table}, debounce: ${debounceMs}ms`);
  const { $supabase } = useNuxtApp();
  const isSyncing = ref(false);
  const isPaused = ref(false);
  let lastSyncedHash: string | null = null;
  // Retry state
  const MAX_SYNC_RETRIES = 3;
  let syncRetries = 0;
  let pendingRetryTimeouts: NodeJS.Timeout[] = [];
  let syncVersion = 0; // Increments with each sync to track freshness
  const syncToSupabase = async (inputState: unknown, retryVersion?: number) => {
    const state = inputState as Record<string, unknown>;
    // If this is a retry, check if it's stale
    if (retryVersion !== undefined && retryVersion < syncVersion) {
      logger.debug('[Sync] Ignoring stale retry - newer sync has occurred', {
        retryVersion,
        currentVersion: syncVersion,
      });
      return;
    }
    // Cancel any pending retries when starting a new sync (not a retry itself)
    if (retryVersion === undefined) {
      if (pendingRetryTimeouts.length > 0) {
        logger.debug(`[Sync] Canceling ${pendingRetryTimeouts.length} pending retry timeouts`);
        pendingRetryTimeouts.forEach(clearTimeout);
        pendingRetryTimeouts = [];
      }
      // Increment version for this new sync
      syncVersion++;
      syncRetries = 0; // Reset retry counter for new sync
    }
    const currentSyncVersion = retryVersion !== undefined ? retryVersion : syncVersion;
    logger.debug('[Sync] syncToSupabase called', {
      loggedIn: $supabase.user.loggedIn,
      isPaused: isPaused.value,
      version: currentSyncVersion,
      isRetry: retryVersion !== undefined,
    });
    if (isPaused.value) {
      logger.debug('[Sync] Skipping - sync is paused');
      return;
    }
    if (!$supabase.user.loggedIn || !$supabase.user.id) {
      logger.debug('[Sync] Skipping - user not logged in');
      return;
    }
    isSyncing.value = true;
    try {
      const dataToSave = transform ? transform(state) : state;
      // Skip if transform returned null (e.g., during initial load)
      if (!dataToSave) {
        logger.debug('[Sync] Skipping - transform returned null');
        isSyncing.value = false;
        return;
      }
      // Ensure user_id is present if not already
      if (!dataToSave.user_id) {
        dataToSave.user_id = $supabase.user.id;
      }
      // Skip sync if data hasn't changed (reduces egress significantly)
      const currentHash = hashState(dataToSave);
      if (currentHash === lastSyncedHash) {
        logger.debug('[Sync] Skipping - data unchanged');
        isSyncing.value = false;
        return;
      }
      // Log detailed info about what we're syncing (dev only)
      if (import.meta.env.DEV) {
        if (table === 'user_progress') {
          const userData = dataToSave as SupabaseUserData;
          const pvpTasks = Object.keys(userData.pvp_data?.taskCompletions || {}).length;
          const pveTasks = Object.keys(userData.pve_data?.taskCompletions || {}).length;
          logger.debug(`[Sync] About to upsert to ${table}:`, {
            gameMode: userData.current_game_mode,
            pvpLevel: userData.pvp_data?.level,
            pvpTasksCompleted: pvpTasks,
            pveLevel: userData.pve_data?.level,
            pveTasksCompleted: pveTasks,
          });
        } else {
          logger.debug('[Sync] About to upsert to', table);
        }
      }
      const { error } = await $supabase.client.from(table).upsert(dataToSave);
      if (error) {
        logger.error(`[Sync] Error syncing to ${table}:`, error);
        // Retry with exponential backoff
        if (syncRetries < MAX_SYNC_RETRIES) {
          syncRetries++;
          const retryDelay = 1000 * Math.pow(2, syncRetries - 1); // 1s, 2s, 4s
          logger.debug(
            `[Sync] Retrying in ${retryDelay}ms (attempt ${syncRetries}/${MAX_SYNC_RETRIES})`
          );
          const timeoutId = setTimeout(() => {
            logger.debug(`[Sync] Retry attempt ${syncRetries}/${MAX_SYNC_RETRIES}`);
            // Remove this timeout from pending list
            pendingRetryTimeouts = pendingRetryTimeouts.filter((id) => id !== timeoutId);
            // Pass version to ensure retry isn't stale
            syncToSupabase(state, currentSyncVersion);
          }, retryDelay);
          pendingRetryTimeouts.push(timeoutId);
          isSyncing.value = false;
          return;
        }
        // All retries exhausted - notify user
        const toast = useToast();
        toast.add({
          title: 'Sync failed',
          description:
            "Your progress couldn't be saved to the cloud. Please check your connection and try again.",
          color: 'error',

        });
        // Store failed sync for potential recovery (table-specific key to avoid conflicts)
        if (typeof window !== 'undefined') {
          try {
            const pendingSyncKey = `pending_sync_${table}`;
            localStorage.setItem(pendingSyncKey, JSON.stringify(dataToSave));
            logger.debug(`[Sync] Saved pending sync to localStorage for recovery (${pendingSyncKey})`);
          } catch (e) {
            logger.error('[Sync] Could not save pending sync:', e);
          }
        }
      } else {
        // Success - reset retry counter and clear pending sync
        syncRetries = 0;
        lastSyncedHash = currentHash;
        logger.debug(`[Sync] ✅ Successfully synced to ${table}`);
        // Clear any pending sync from localStorage (table-specific key)
        if (typeof window !== 'undefined') {
          try {
            const pendingSyncKey = `pending_sync_${table}`;
            localStorage.removeItem(pendingSyncKey);
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    } catch (err) {
      logger.error('[Sync] Unexpected error:', err);
      // Treat unexpected errors same as sync errors
      if (syncRetries < MAX_SYNC_RETRIES) {
        syncRetries++;
        const retryDelay = 1000 * Math.pow(2, syncRetries - 1);
        logger.debug(
          `[Sync] Retrying after unexpected error in ${retryDelay}ms (attempt ${syncRetries}/${MAX_SYNC_RETRIES})`
        );
        const timeoutId = setTimeout(() => {
          // Remove this timeout from pending list
          pendingRetryTimeouts = pendingRetryTimeouts.filter((id) => id !== timeoutId);
          // Pass version to ensure retry isn't stale
          syncToSupabase(state, currentSyncVersion);
        }, retryDelay);
        pendingRetryTimeouts.push(timeoutId);
        isSyncing.value = false;
        return;
      }
      const toast = useToast();
      toast.add({
        title: 'Sync error',
        description: 'An unexpected error occurred while saving your progress.',
        color: 'error',
        timeout: 10000,
      });
    } finally {
      isSyncing.value = false;
    }
  };
  const snapshotState = (state: unknown) => {
    try {
      // Avoid cloning Vue proxies directly
      const raw = typeof state === 'object' ? toRaw(state) : state;
      if (typeof structuredClone === 'function') {
        return structuredClone(raw);
      }
      if (Array.isArray(raw)) return raw.slice();
      if (raw && typeof raw === 'object') return { ...(raw as Record<string, unknown>) };
      return raw;
    } catch {
      // Fallback to JSON clone as last resort
      try {
        return JSON.parse(JSON.stringify(state));
      } catch {
        return state;
      }
    }
  };
  const debouncedSync = debounce(syncToSupabase, debounceMs);
  const unwatch = watch(
    () => store.$state,
    (newState) => {
      logger.debug(`[Sync] Store state changed for ${table}, triggering debounced sync`);
      const clonedState = snapshotState(newState);
      debouncedSync(clonedState);
    },
    { deep: true }
  );
  const cleanup = () => {
    debouncedSync.cancel();
    unwatch();
    // Clear any pending retry timeouts
    if (pendingRetryTimeouts.length > 0) {
      logger.debug(`[Sync] Cleanup: clearing ${pendingRetryTimeouts.length} pending retry timeouts`);
      pendingRetryTimeouts.forEach(clearTimeout);
      pendingRetryTimeouts = [];
    }
    // Reset retry state
    syncRetries = 0;
  };
  if (getCurrentInstance()) {
    onUnmounted(cleanup);
  }
  const pause = () => {
    logger.debug(`[Sync] Pausing sync for ${table}`);
    isPaused.value = true;
    debouncedSync.cancel();
  };
  const resume = () => {
    logger.debug(`[Sync] Resuming sync for ${table}`);
    isPaused.value = false;
  };
  return {
    isSyncing,
    isPaused,
    cleanup,
    pause,
    resume,
  };
}
