import { computed, ref, watch, onUnmounted, type ComputedRef, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
/**
 * Configuration for a single filter parameter.
 */
export interface FilterParamConfig<T = string> {
  /** Default value when param is not in URL */
  default: T;
  /** Getter for stored value (used by nav links to build URLs with preferences) */
  storedDefault?: () => T | null | undefined;
  /** Setter to persist value when filter changes */
  onUpdate?: (value: T) => void;
  /** Optional validator - invalid values fall back to default */
  validate?: (value: string) => boolean;
  /** Transform URL string to typed value (default: identity for strings, parse for booleans) */
  parse?: (value: string) => T;
  /** Transform typed value to URL string (default: identity for strings, '1'/'0' for booleans) */
  serialize?: (value: T) => string | null;
  /** Debounce delay in ms for this param (useful for search inputs) */
  debounceMs?: number;
  /**
   * Scoping rule for nav URL construction.
   * When set, this param is only included in nav URLs when the dependsOn param
   * has one of the specified values. Used to avoid including irrelevant params
   * (e.g., don't include map param when view=traders).
   */
  scope?: {
    /** The param key this param depends on (e.g., 'view') */
    dependsOn: string;
    /** Only include this param when dependsOn has one of these values */
    values: string[];
  };
}
/**
 * Filter configuration map - keys are URL param names.
 */
export type FilterConfig = Record<string, FilterParamConfig<unknown>>;
/**
 * Infer the value type for a filter config.
 */
type FilterValue<C extends FilterParamConfig<unknown>> =
  C extends FilterParamConfig<infer T> ? T : string;
/**
 * Typed filters object - computed refs for each filter.
 */
export type Filters<C extends FilterConfig> = {
  [K in keyof C]: ComputedRef<FilterValue<C[K]>>;
};
/**
 * Return type of usePageFilters composable.
 */
export interface UsePageFiltersReturn<C extends FilterConfig> {
  /** Computed refs for each filter, derived from URL */
  filters: Filters<C>;
  /** Set a single filter value (updates URL) */
  setFilter: <K extends keyof C>(key: K, value: FilterValue<C[K]>) => void;
  /** Set multiple filter values at once (single URL update) */
  setFilters: (updates: Partial<{ [K in keyof C]: FilterValue<C[K]> }>) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Debounced refs for inputs that need debouncing (e.g., search) */
  debouncedInputs: { [K in keyof C]?: Ref<FilterValue<C[K]>> };
}
/**
 * Build a URL path with query params from stored preferences.
 * Used by navigation links to construct URLs that restore user preferences.
 *
 * Respects scope rules: params with a `scope` property are only included
 * when the dependsOn param has one of the specified values.
 *
 * @param basePath - The base path (e.g., '/tasks')
 * @param config - Filter configuration with storedDefault getters
 * @returns Full path with query string (e.g., '/tasks?view=traders&status=completed')
 */
export function buildPreferredUrl<C extends FilterConfig>(basePath: string, config: C): string {
  // First pass: collect all stored values that differ from defaults
  const storedValues: Record<string, unknown> = {};
  for (const [key, paramConfig] of Object.entries(config)) {
    if (paramConfig.storedDefault) {
      const stored = paramConfig.storedDefault();
      if (stored !== null && stored !== undefined && stored !== paramConfig.default) {
        // Validate stored value if validator provided
        if (paramConfig.validate) {
          const storedStr = typeof stored === 'boolean' ? (stored ? '1' : '0') : String(stored);
          if (!paramConfig.validate(storedStr)) {
            continue; // Skip invalid stored values
          }
        }
        storedValues[key] = stored;
      }
    }
  }
  // Second pass: build URL with only scoped params
  const params = new URLSearchParams();
  for (const [key, paramConfig] of Object.entries(config)) {
    const value = storedValues[key];
    if (value === undefined) continue;
    // Check scope - skip params that don't match the current view context
    if (paramConfig.scope) {
      const dependsOnValue = storedValues[paramConfig.scope.dependsOn];
      // If dependsOn value is not set, use the default for that param
      const effectiveValue = dependsOnValue ?? config[paramConfig.scope.dependsOn]?.default;
      if (!paramConfig.scope.values.includes(effectiveValue as string)) {
        continue; // Skip - not in scope for the current view
      }
    }
    // Serialize the value
    let serialized: string | null;
    if (paramConfig.serialize) {
      serialized = paramConfig.serialize(value);
    } else if (typeof value === 'boolean') {
      serialized = value ? '1' : null;
    } else {
      serialized = String(value);
    }
    if (serialized !== null) {
      params.set(key, serialized);
    }
  }
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
/**
 * Options for usePageFilters.
 */
export interface UsePageFiltersOptions {
  /**
   * Custom function to determine if the current route matches this filter context.
   * If it returns false, the filters will "freeze" and ignore URL changes.
   * Defaults to matching the path or name that was active when initialized.
   */
  match?: (route: ReturnType<typeof useRoute>) => boolean;
}
/**
 * Composable for URL-based filter state management.
 *
 * URL is the single source of truth. Components read from computed refs
 * that derive from route.query. User actions update the URL via router.push.
 *
 * Navigation intelligence is handled by the navigation links, not this composable.
 * Nav links use buildPreferredUrl() to construct URLs with stored preferences
 * when navigating from other pages, or navigate to clean URLs to reset.
 *
 * @example
 * ```ts
 * const { filters, setFilter } = usePageFilters({
 *   view: { default: 'all', validate: v => ['all', 'maps'].includes(v) },
 *   status: { default: 'available' },
 *   search: { default: '', debounceMs: 300 },
 *   kappa: { default: false, parse: v => v === '1', serialize: v => v ? '1' : null },
 * });
 *
 * // Read: filters.view.value
 * // Write: setFilter('view', 'maps')
 * // Debounced input: v-model="debouncedInputs.search"
 * ```
 */
export function usePageFilters<C extends FilterConfig>(
  config: C,
  options: UsePageFiltersOptions = {}
): UsePageFiltersReturn<C> {
  const route = useRoute();
  const router = useRouter();

  // Capture the route identity when the composable is initialized.
  // This allows us to ignore URL changes that occur during navigation away from this page.
  const initialPath = route.path;
  const initialName = route.name;

  /**
   * Determines if the current route matches the context where this composable was created.
   */
  const isMatch = () => {
    if (options.match) return options.match(route);
    // Default: Match if path is same, or if name is same (names are stable across param changes)
    return route.path === initialPath || (initialName && route.name === initialName);
  };

  /**
   * Parse a URL string value to typed value using config.
   * URL is the single source of truth - if param is absent, use static default.
   */
  const parseValue = <K extends keyof C>(
    key: K,
    urlValue: string | undefined
  ): FilterValue<C[K]> => {
    const paramConfig = config[key];
    const defaultValue = paramConfig.default as FilterValue<C[K]>;
    if (urlValue === undefined || urlValue === null || urlValue === '') {
      // URL is empty - use static default (not storedDefault)
      // storedDefault is only used by nav links to build URLs
      return defaultValue;
    }
    // Validate if validator provided
    if (paramConfig.validate && !paramConfig.validate(urlValue)) {
      return defaultValue;
    }
    // Parse if parser provided
    if (paramConfig.parse) {
      return paramConfig.parse(urlValue) as FilterValue<C[K]>;
    }
    // Default: return as-is for strings, handle booleans
    if (typeof defaultValue === 'boolean') {
      return (urlValue === '1' || urlValue === 'true') as FilterValue<C[K]>;
    }
    return urlValue as FilterValue<C[K]>;
  };
  /**
   * Serialize a typed value to URL string using config.
   */
  const serializeValue = <K extends keyof C>(key: K, value: FilterValue<C[K]>): string | null => {
    const paramConfig = config[key];
    const defaultValue = paramConfig.default;
    // Don't include default values in URL (clean URLs)
    if (value === defaultValue) {
      return null;
    }
    // Use custom serializer if provided
    if (paramConfig.serialize) {
      return paramConfig.serialize(value);
    }
    // Default: handle booleans as '1', others as string
    if (typeof value === 'boolean') {
      return value ? '1' : null;
    }
    return String(value);
  };

  // Internal reactive state to hold the parsed filter values.
  // We use this instead of direct computed derived from route.query to allow "freezing" the state.
  const filterValues = ref<Record<string, unknown>>({});

  // Initialize values from current route
  for (const key of Object.keys(config)) {
    filterValues.value[key] = parseValue(key, route.query[key] as string);
  }

  // Sync internal state with URL query, but only when on the correct route
  watch(
    () => route.query,
    (newQuery) => {
      if (!isMatch()) return;

      for (const key of Object.keys(config) as Array<keyof C>) {
        const newValue = parseValue(key, newQuery[key as string] as string | undefined);
        if (filterValues.value[key as string] !== newValue) {
          filterValues.value[key as string] = newValue;
        }
      }
    }
  );

  // Debounce timers for params with debounceMs
  const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  // Local refs for debounced inputs
  const debouncedInputRefs: Record<string, Ref<unknown>> = {};

  /**
   * Build computed refs for each filter.
   */
  const filters = {} as Filters<C>;
  for (const key of Object.keys(config) as Array<keyof C>) {
    filters[key] = computed(() => filterValues.value[key as string]) as Filters<C>[typeof key];
  }
  /**
   * Build debounced input refs for filters with debounceMs.
   */
  const debouncedInputs: UsePageFiltersReturn<C>['debouncedInputs'] = {};
  for (const [key, paramConfig] of Object.entries(config)) {
    if (paramConfig.debounceMs && paramConfig.debounceMs > 0) {
      // Create a local ref initialized from current URL value
      const localRef = ref(filters[key as keyof C].value);
      debouncedInputRefs[key] = localRef;
      debouncedInputs[key as keyof C] = localRef as Ref<FilterValue<C[keyof C]>>;
      // Watch URL changes and sync to local ref (for back/forward nav)
      const stopUrlWatch = watch(
        () => filters[key as keyof C].value,
        (newValue) => {
          localRef.value = newValue;
        }
      );
      // Watch local ref and debounce updates to URL
      const stopLocalWatch = watch(localRef, (newValue) => {
        if (debounceTimers[key]) {
          clearTimeout(debounceTimers[key]);
        }
        debounceTimers[key] = setTimeout(() => {
          updateUrl({ [key]: newValue } as Partial<{ [K in keyof C]: FilterValue<C[K]> }>);
        }, paramConfig.debounceMs);
      });

      // Cleanup on unmount
      onUnmounted(() => {
        stopUrlWatch();
        stopLocalWatch();
        if (debounceTimers[key]) {
          clearTimeout(debounceTimers[key]);
        }
      });
    }
  }
  /**
   * Update URL with new filter values.
   * Pass null to explicitly reset a param to its default (removing it from URL).
   */
  const updateUrl = (updates: Partial<{ [K in keyof C]: FilterValue<C[K]> | null }>) => {
    const newQuery: Record<string, string> = {};
    // Build query from current filters + updates
    for (const key of Object.keys(config) as Array<keyof C>) {
      // If update is explicitly null, use default value (will be omitted from URL)
      // If update is provided, use it; otherwise use current filter value
      const updateValue = updates[key];
      const value =
        updateValue === null
          ? (config[key].default as FilterValue<C[typeof key]>)
          : ((key in updates ? updateValue : filters[key].value) as FilterValue<C[typeof key]>);
      const serialized = serializeValue(key, value);
      if (serialized !== null) {
        newQuery[key as string] = serialized;
      }
    }
    // Preserve query params not managed by this composable
    for (const [key, value] of Object.entries(route.query)) {
      if (!(key in config) && typeof value === 'string') {
        newQuery[key] = value;
      }
    }
    // Only push if query actually changed
    const currentQueryStr = JSON.stringify(
      Object.fromEntries(
        Object.entries(route.query)
          .filter(([k]) => k in config || k in newQuery)
          .sort(([a], [b]) => a.localeCompare(b))
      )
    );
    const newQueryStr = JSON.stringify(
      Object.fromEntries(Object.entries(newQuery).sort(([a], [b]) => a.localeCompare(b)))
    );
    if (currentQueryStr !== newQueryStr) {
      router.push({ query: newQuery });
    }
  };
  /**
   * Set a single filter value.
   */
  const setFilter = <K extends keyof C>(key: K, value: FilterValue<C[K]>) => {
    // Call onUpdate callback if provided to persist to store
    const paramConfig = config[key];
    if (paramConfig.onUpdate) {
      paramConfig.onUpdate(value);
    }
    // If this param has a debounced input, update that instead
    if (debouncedInputRefs[key as string]) {
      debouncedInputRefs[key as string].value = value;
      return;
    }
    updateUrl({ [key]: value } as Partial<{ [K in keyof C]: FilterValue<C[K]> }>);
  };
  /**
   * Set multiple filter values at once.
   * Pass null to explicitly reset a param to its default (removing it from URL).
   */
  const setFilters = (updates: Partial<{ [K in keyof C]: FilterValue<C[K]> | null }>) => {
    // Call onUpdate callbacks for each updated filter
    for (const [key, value] of Object.entries(updates)) {
      if (value !== null && value !== undefined) {
        const paramConfig = config[key as keyof C];
        if (paramConfig?.onUpdate) {
          paramConfig.onUpdate(value as FilterValue<C[keyof C]>);
        }
      }
    }
    // Handle debounced inputs and collect remaining updates
    const remainingUpdates: Partial<{ [K in keyof C]: FilterValue<C[K]> | null }> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (debouncedInputRefs[key]) {
        debouncedInputRefs[key].value = value;
      } else {
        remainingUpdates[key as keyof C] = value as FilterValue<C[keyof C]> | null;
      }
    }
    if (Object.keys(remainingUpdates).length > 0) {
      updateUrl(remainingUpdates);
    }
  };
  /**
   * Reset all filters to defaults.
   */
  const resetFilters = () => {
    // Clear debounced inputs
    for (const [key, ref] of Object.entries(debouncedInputRefs)) {
      ref.value = config[key].default;
    }
    // Clear URL params for this composable
    const newQuery: Record<string, string> = {};
    for (const [key, value] of Object.entries(route.query)) {
      if (!(key in config) && typeof value === 'string') {
        newQuery[key] = value;
      }
    }
    router.push({ query: newQuery });
  };
  /**
   * Persist URL params to storage on route changes.
   * This ensures "last view is remembered" when user explicitly visits a URL with params
   * (click on filter, shared link, bookmark).
   *
   * IMPORTANT: Only persist explicit URL params. When URL has no params,
   * we should NOT overwrite stored prefs - the restoration logic will handle it.
   */
  watch(
    () => route.query,
    () => {
      if (!isMatch()) return;

      for (const [key, paramConfig] of Object.entries(config)) {
        if (paramConfig.onUpdate) {
          const urlValue = route.query[key] as string | undefined;
          // Persist if there's an explicit URL value
          if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
            const parsedValue = parseValue(key as keyof C, urlValue);
            paramConfig.onUpdate(parsedValue);
          }
          // Clear stored value if param is absent from URL (reset to default)
          else {
            paramConfig.onUpdate(paramConfig.default);
          }
        }
      }
    },
    { immediate: true }
  );
  // NOTE: Preference restoration is now handled by nav links pre-computing URLs
  // with stored preferences (via getPreferredNavUrl in DrawerItem.vue).
  // This eliminates the "one-two" flash and avoids history manipulation issues.
  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    debouncedInputs,
  };
}
