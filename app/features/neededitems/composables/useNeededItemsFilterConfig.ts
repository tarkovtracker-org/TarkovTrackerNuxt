import type { FilterConfig } from '@/composables/usePageFilters';
import { usePreferencesStore } from '@/stores/usePreferences';
/**
 * Returns the filter configuration for the Needed Items page.
 * This is extracted so it can be used by both the page (for URL-based filtering)
 * and navigation links (for building URLs with stored preferences).
 */
export function useNeededItemsFilterConfig(): FilterConfig {
  const preferencesStore = usePreferencesStore();
  return {
    filter: {
      default: 'all',
      storedDefault: () => preferencesStore.getNeededTypeView(),
      onUpdate: (v) => preferencesStore.setNeededTypeView(v as string),
      validate: (v) => ['all', 'tasks', 'hideout', 'completed'].includes(v),
    },
    viewMode: {
      default: 'grid',
      storedDefault: () => {
        const style = preferencesStore.getNeededItemsStyle();
        return ['row', 'mediumCard'].includes(style as string) ? style : null;
      },
      onUpdate: (v) =>
        preferencesStore.setNeededItemsStyle((v as string) === 'list' ? 'row' : 'mediumCard'),
      validate: (v) => ['list', 'grid'].includes(v),
    },
    fir: {
      default: 'all',
      validate: (v) => ['all', 'fir', 'non-fir'].includes(v),
    },
    grouped: {
      default: false,
      parse: (v) => v === '1',
      serialize: (v) => ((v as boolean) ? '1' : null),
    },
    kappa: {
      default: false,
      parse: (v) => v === '1',
      serialize: (v) => ((v as boolean) ? '1' : null),
    },
    hideSpecial: {
      default: false,
      parse: (v) => v === '1',
      serialize: (v) => ((v as boolean) ? '1' : null),
    },
    search: {
      default: '',
      storedDefault: () => preferencesStore.getNeededItemsSearch() ?? '',
      onUpdate: (v) => preferencesStore.setNeededItemsSearch(v as string),
      debounceMs: 300,
    },
  };
}
