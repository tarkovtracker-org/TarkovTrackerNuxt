import { logger } from '@/utils/logger';
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS, STORAGE_VERSION } from '@/utils/storageKeys';
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return;
  try {
    const currentVersion = window.localStorage.getItem(STORAGE_KEYS.storageVersion);
    if (currentVersion === STORAGE_VERSION) return;
    const legacyKeys = [
      LEGACY_STORAGE_KEYS.progress,
      LEGACY_STORAGE_KEYS.preferences,
      LEGACY_STORAGE_KEYS.user,
      LEGACY_STORAGE_KEYS.adminLastPurge,
    ];
    legacyKeys.forEach((key) => window.localStorage.removeItem(key));
    const backupKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(LEGACY_STORAGE_KEYS.progressBackupPrefix)) {
        backupKeys.push(key);
      }
    }
    backupKeys.forEach((key) => window.localStorage.removeItem(key));
    try {
      window.sessionStorage.removeItem(LEGACY_STORAGE_KEYS.sessionDataMigrated);
    } catch (error) {
      logger.warn('[Storage] Failed to clear legacy sessionStorage flag', error);
    }
    window.localStorage.setItem(STORAGE_KEYS.storageVersion, STORAGE_VERSION);
    logger.info('[Storage] Cleared legacy local data after storage version bump');
  } catch (error) {
    logger.warn('[Storage] Failed to run storage version cleanup', error);
  }
});
