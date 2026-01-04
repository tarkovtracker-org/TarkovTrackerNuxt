import { onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePreferencesStore } from '@/stores/usePreferences';
import { initializeTarkovSync, resetTarkovSync, useTarkovStore } from '@/stores/useTarkov';
import { logger } from '@/utils/logger';
/**
 * Handles app-level initialization:
 * - Locale setup from user preferences
 * - Supabase sync initialization for authenticated users
 * - Legacy data migration
 */
export function useAppInitialization() {
  const { $supabase } = useNuxtApp();
  const preferencesStore = usePreferencesStore();
  const { locale } = useI18n({ useScope: 'global' });
  let syncStarted = false;
  let migrationAttempted = false;
  const startSyncIfNeeded = async () => {
    if (!import.meta.client || !$supabase.user.loggedIn || syncStarted) return;
    syncStarted = true;
    try {
      await initializeTarkovSync();
    } catch (error) {
      syncStarted = false;
      logger.error('[useAppInitialization] Error initializing Supabase sync:', error);
    }
  };
  const runMigrationIfNeeded = async () => {
    if (!import.meta.client || !$supabase.user.loggedIn || migrationAttempted) return;
    try {
      const store = useTarkovStore();
      // migrateDataIfNeeded is safe to call repeatedly; internal guard checks shape
      await store.migrateDataIfNeeded?.();
      migrationAttempted = true;
    } catch (error) {
      migrationAttempted = false; // allow another attempt on next login change
      logger.error('[useAppInitialization] Error running data migration:', error);
    }
  };
  // React to authentication changes so login-after-load users get sync/migration too
  watch(
    () => [$supabase.user.loggedIn, $supabase.user.id] as const,
    async ([loggedIn, userId], previous) => {
      const [prevLoggedIn, prevUserId] = previous ?? [false, null];
      if (!loggedIn) {
        if (prevLoggedIn) {
          resetTarkovSync('logout');
        }
        syncStarted = false;
        migrationAttempted = false;
        return;
      }
      if (prevUserId && userId && prevUserId !== userId) {
        resetTarkovSync('user switched');
        syncStarted = false;
        migrationAttempted = false;
      }
      await startSyncIfNeeded();
      await runMigrationIfNeeded();
    },
    { immediate: true }
  );
  onMounted(async () => {
    // Apply user's locale preference
    const localeOverride = preferencesStore.localeOverride;
    if (localeOverride) {
      locale.value = localeOverride;
    }
    // For users already logged in on first mount, ensure sync/migration run once
    await startSyncIfNeeded();
    await runMigrationIfNeeded();
  });
}
