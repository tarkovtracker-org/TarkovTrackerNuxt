export const STORAGE_PREFIX = 'v2_';
export const STORAGE_VERSION = '2';
export const STORAGE_KEYS = {
  storageVersion: `${STORAGE_PREFIX}storage_version`,
  progress: `${STORAGE_PREFIX}progress`,
  preferences: `${STORAGE_PREFIX}preferences`,
  progressBackupPrefix: `${STORAGE_PREFIX}progress_backup_`,
  adminLastPurge: `${STORAGE_PREFIX}tt:admin:last-purge`,
  sessionDataMigrated: `${STORAGE_PREFIX}tarkovDataMigrated`,
} as const;
export const LEGACY_STORAGE_KEYS = {
  progress: 'progress',
  preferences: 'preferences',
  user: 'user',
  progressBackupPrefix: 'progress_backup_',
  adminLastPurge: 'tt:admin:last-purge',
  sessionDataMigrated: 'tarkovDataMigrated',
} as const;
