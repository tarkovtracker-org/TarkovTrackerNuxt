import type { FilterConfig } from '@/composables/usePageFilters';
import { usePreferencesStore } from '@/stores/usePreferences';
/**
 * Returns the filter configuration for the Tasks page.
 * This is extracted so it can be used by both the page (for URL-based filtering)
 * and navigation links (for building URLs with stored preferences).
 */
export function useTasksFilterConfig(): FilterConfig {
  const preferencesStore = usePreferencesStore();
  return {
    // Primary view selector - always included in nav URLs
    view: {
      default: 'all',
      storedDefault: () => preferencesStore.getTaskPrimaryView,
      onUpdate: (v) => preferencesStore.setTaskPrimaryView(v as string),
      validate: (v) => ['all', 'traders', 'maps'].includes(v),
    },
    // Status filter - always included in nav URLs
    status: {
      default: 'available',
      storedDefault: () => preferencesStore.getTaskSecondaryView,
      onUpdate: (v) => preferencesStore.setTaskSecondaryView(v as string),
      validate: (v) => ['all', 'available', 'locked', 'completed', 'failed'].includes(v),
    },
    // Map filter - only include in nav URLs when view=maps
    map: {
      default: 'all',
      storedDefault: () => preferencesStore.getTaskMapView,
      onUpdate: (v) => preferencesStore.setTaskMapView(v as string),
      scope: { dependsOn: 'view', values: ['maps'] },
    },
    // Trader filter - only include in nav URLs when view=traders
    trader: {
      default: 'all',
      storedDefault: () => preferencesStore.getTaskTraderView,
      onUpdate: (v) => preferencesStore.setTaskTraderView(v as string),
      scope: { dependsOn: 'view', values: ['traders'] },
    },
    // Single-task mode - persisted to store
    task: {
      default: '',
      storedDefault: () => preferencesStore.getTaskId ?? '',
      onUpdate: (v) => preferencesStore.setTaskId(v as string),
    },
    // Search - persisted to store
    search: {
      default: '',
      storedDefault: () => preferencesStore.getTaskSearch ?? '',
      onUpdate: (v) => preferencesStore.setTaskSearch(v as string),
      debounceMs: 300,
    },
  };
}
