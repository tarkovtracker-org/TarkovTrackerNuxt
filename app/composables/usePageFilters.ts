import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Configuration for a single filter parameter.
 */
export interface FilterParamConfig<T = string> {
  /** Default value when param is not in URL */
  default: T;
  /** Optional validator - invalid values fall back to default */
  validate?: (value: string) => boolean;
  /** Transform URL string to typed value (default: identity for strings, parse for booleans) */
  parse?: (value: string) => T;
  /** Transform typed value to URL string (default: identity for strings, '1'/'0' for booleans) */
  serialize?: (value: T) => string | null;
  /** Debounce delay in ms for this param (useful for search inputs) */
  debounceMs?: number;
}

/**
 * Filter configuration map - keys are URL param names.
 */
export type FilterConfig = Record<string, FilterParamConfig<unknown>>;

/**
 * Infer the value type for a filter config.
 */
type FilterValue<C extends FilterParamConfig<unknown>> = C extends FilterParamConfig<infer T> ? T : string;

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
 * Composable for URL-based filter state management.
 * 
 * URL is the single source of truth. Components read from computed refs
 * that derive from route.query. User actions update the URL via router.push.
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
  config: C
): UsePageFiltersReturn<C> {
  const route = useRoute();
  const router = useRouter();

  // Debounce timers for params with debounceMs
  const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  // Local refs for debounced inputs
  const debouncedInputRefs: Record<string, Ref<unknown>> = {};

  /**
   * Parse a URL string value to typed value using config.
   */
  const parseValue = <K extends keyof C>(
    key: K,
    urlValue: string | undefined
  ): FilterValue<C[K]> => {
    const paramConfig = config[key];
    const defaultValue = paramConfig.default as FilterValue<C[K]>;

    if (urlValue === undefined || urlValue === null || urlValue === '') {
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
  const serializeValue = <K extends keyof C>(
    key: K,
    value: FilterValue<C[K]>
  ): string | null => {
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

  /**
   * Build computed refs for each filter.
   */
  const filters = {} as Filters<C>;
  for (const key of Object.keys(config) as Array<keyof C>) {
    filters[key] = computed(() => {
      const urlValue = route.query[key as string] as string | undefined;
      return parseValue(key, urlValue);
    }) as Filters<C>[typeof key];
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
      watch(
        () => filters[key as keyof C].value,
        (newValue) => {
          localRef.value = newValue;
        }
      );

      // Watch local ref and debounce updates to URL
      watch(localRef, (newValue) => {
        if (debounceTimers[key]) {
          clearTimeout(debounceTimers[key]);
        }
        debounceTimers[key] = setTimeout(() => {
          updateUrl({ [key]: newValue } as Partial<{ [K in keyof C]: FilterValue<C[K]> }>);
        }, paramConfig.debounceMs);
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
      const value = updateValue === null 
        ? config[key].default as FilterValue<C[typeof key]>
        : (key in updates ? updateValue : filters[key].value) as FilterValue<C[typeof key]>;
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
      Object.fromEntries(
        Object.entries(newQuery).sort(([a], [b]) => a.localeCompare(b))
      )
    );

    if (currentQueryStr !== newQueryStr) {
      router.push({ query: newQuery });
    }
  };

  /**
   * Set a single filter value.
   */
  const setFilter = <K extends keyof C>(key: K, value: FilterValue<C[K]>) => {
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
    // Handle debounced inputs
    for (const [key, value] of Object.entries(updates)) {
      if (debouncedInputRefs[key]) {
        debouncedInputRefs[key].value = value;
        delete updates[key as keyof C];
      }
    }
    if (Object.keys(updates).length > 0) {
      updateUrl(updates);
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

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    debouncedInputs,
  };
}
