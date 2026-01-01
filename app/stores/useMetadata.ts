import { defineStore } from 'pinia';
import { markRaw, ref } from 'vue';
import { extractLanguageCode, useSafeLocale } from '@/composables/i18nHelpers';
import { useGraphBuilder } from '@/composables/useGraphBuilder';
import mapsData from '@/data/maps.json';
import { useProgressStore } from '@/stores/useProgress';
import { useTarkovStore } from '@/stores/useTarkov';
import type {
  FinishRewards,
  GameEdition,
  HideoutModule,
  HideoutStation,
  NeededItemHideoutModule,
  NeededItemTaskObjective,
  ObjectiveGPSInfo,
  ObjectiveMapInfo,
  PlayerLevel,
  PrestigeLevel,
  StaticMapData,
  TarkovBootstrapQueryResult,
  TarkovDataQueryResult,
  TarkovHideoutQueryResult,
  TarkovItem,
  TarkovItemsQueryResult,
  TarkovMap,
  TarkovPrestigeQueryResult,
  TarkovTaskObjectivesQueryResult,
  TarkovTaskRewardsQueryResult,
  TarkovTasksCoreQueryResult,
  Task,
  TaskObjective,
  Trader,
} from '@/types/tarkov';
import {
  API_GAME_MODES,
  API_SUPPORTED_LANGUAGES,
  EXCLUDED_SCAV_KARMA_TASKS,
  GAME_MODES,
  LOCALE_TO_API_MAPPING,
  MAP_NAME_MAPPING,
  sortMapsByGameOrder,
  sortTradersByGameOrder,
} from '@/utils/constants';
import { createGraph } from '@/utils/graphHelpers';
import { normalizeTaskObjectives } from '@/utils/helpers';
import { logger } from '@/utils/logger';
import {
  CACHE_CONFIG,
  type CacheType,
  cleanupExpiredCache,
  getCachedData,
  setCachedData,
} from '@/utils/tarkovCache';
import type { AbstractGraph } from 'graphology-types';
// Exported type for craft sources used by components
export type CraftSource = { stationId: string; stationName: string; stationLevel: number };
// Initialization guard to prevent race conditions
let initPromise: Promise<void> | null = null;
const isInitializing = ref(false);
// Helper type to safely access item properties that might be missing in older type definitions
type ObjectiveWithItems = TaskObjective & {
  item?: TarkovItem;
  items?: TarkovItem[];
  markerItem?: TarkovItem;
  questItem?: TarkovItem;
  containsAll?: TarkovItem[];
  useAny?: TarkovItem[];
  usingWeapon?: TarkovItem;
  usingWeaponMods?: TarkovItem[];
  wearing?: TarkovItem[];
  notWearing?: TarkovItem[];
};
interface MetadataState {
  // Initialization and loading states
  initialized: boolean;
  initializationFailed: boolean;
  loading: boolean;
  hideoutLoading: boolean;
  itemsLoading: boolean;
  prestigeLoading: boolean;
  editionsLoading: boolean;
  error: Error | null;
  hideoutError: Error | null;
  itemsError: Error | null;
  prestigeError: Error | null;
  editionsError: Error | null;
  // Raw data from API
  tasks: Task[];
  editions: GameEdition[];
  hideoutStations: HideoutStation[];
  maps: TarkovMap[];
  traders: Trader[];
  playerLevels: PlayerLevel[];
  items: TarkovItem[];
  prestigeLevels: PrestigeLevel[];
  staticMapData: StaticMapData | null;
  // Processed data
  taskGraph: AbstractGraph;
  hideoutGraph: AbstractGraph;
  hideoutModules: HideoutModule[];
  craftSourcesByItemId: Map<string, CraftSource[]>;
  // Derived data structures
  objectiveMaps: { [taskId: string]: ObjectiveMapInfo[] };
  alternativeTasks: { [taskId: string]: string[] };
  objectiveGPS: { [taskId: string]: ObjectiveGPSInfo[] };
  mapTasks: { [mapId: string]: string[] };
  neededItemTaskObjectives: NeededItemTaskObjective[];
  neededItemHideoutModules: NeededItemHideoutModule[];
  // Language and game mode
  languageCode: string;
  currentGameMode: string;
}
export const useMetadataStore = defineStore('metadata', {
  state: (): MetadataState => ({
    initialized: false,
    initializationFailed: false,
    loading: false,
    hideoutLoading: false,
    itemsLoading: false,
    prestigeLoading: false,
    editionsLoading: false,
    error: null,
    hideoutError: null,
    itemsError: null,
    prestigeError: null,
    editionsError: null,
    tasks: [],
    editions: [],
    hideoutStations: [],
    maps: [],
    traders: [],
    playerLevels: [],
    items: [],
    prestigeLevels: [],
    staticMapData: null,
    taskGraph: markRaw(createGraph()),
    hideoutGraph: markRaw(createGraph()),
    hideoutModules: [],
    craftSourcesByItemId: new Map<string, CraftSource[]>(),
    objectiveMaps: {},
    alternativeTasks: {},
    objectiveGPS: {},
    mapTasks: {},
    neededItemTaskObjectives: [],
    neededItemHideoutModules: [],
    languageCode: 'en',
    currentGameMode: GAME_MODES.PVP,
  }),
  getters: {
    // Computed properties for tasks
    objectives: (state): TaskObjective[] => {
      if (!state.tasks.length) return [];
      const allObjectives: TaskObjective[] = [];
      state.tasks.forEach((task) => {
        normalizeTaskObjectives<TaskObjective>(task.objectives).forEach((obj) => {
          if (obj) {
            allObjectives.push({ ...obj, taskId: task.id });
          }
        });
      });
      return allObjectives;
    },
    enabledTasks: (state): Task[] => {
      return state.tasks.filter((task) => !EXCLUDED_SCAV_KARMA_TASKS.includes(task.id));
    },
    // Get edition name by value
    getEditionName:
      (state) =>
      (edition: number | undefined): string => {
        if (edition == null) return 'N/A';
        const found = state.editions.find((e) => e.value === edition);
        return found ? found.title : `Edition ${edition}`;
      },
    // Computed properties for maps with merged static data
    mapsWithSvg: (state): TarkovMap[] => {
      if (!state.maps.length || !state.staticMapData) {
        return [];
      }
      const mapGroups: Record<string, TarkovMap[]> = {};
      state.maps.forEach((map) => {
        const lowerCaseName = map.name.toLowerCase();
        const mapKey = MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
        if (!mapGroups[mapKey]) {
          mapGroups[mapKey] = [];
        }
        mapGroups[mapKey]!.push(map);
      });
      const mergedMaps = Object.entries(mapGroups)
        .map(([mapKey, maps]) => {
          const primaryMap =
            maps.find((map) => map.name.toLowerCase() === 'ground zero') ?? maps[0];
          if (!primaryMap) return null;
          const staticData = state.staticMapData?.[mapKey];
          const mergedIds = maps.map((map) => map.id);
          // Check for unavailable before svg check (unavailable maps may not have svg)
          const unavailable = staticData?.unavailable;
          if (staticData?.svg) {
            return {
              ...primaryMap,
              svg: staticData.svg,
              unavailable,
              mergedIds,
            };
          }
          if (!staticData) {
            logger.warn(
              `[MetadataStore] Static SVG data not found for map: ${primaryMap.name} (lookup key: ${mapKey})`
            );
          }
          return {
            ...primaryMap,
            mergedIds,
          };
        })
        .filter((map): map is NonNullable<typeof map> => map !== null);
      // Sort maps by task progression order using the mapKey for lookup
      return sortMapsByGameOrder(mergedMaps, (map) => {
        const lowerCaseName = map.name.toLowerCase();
        return MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
      });
    },
    // Computed properties for traders (sorted by in-game order)
    sortedTraders: (state): Trader[] => sortTradersByGameOrder(state.traders),
    // Computed properties for hideout
    stationsByName: (state): { [name: string]: HideoutStation } => {
      const stationMap: { [name: string]: HideoutStation } = {};
      state.hideoutStations.forEach((station) => {
        stationMap[station.name] = station;
        if (station.normalizedName) {
          stationMap[station.normalizedName] = station;
        }
      });
      return stationMap;
    },
    modulesByStation: (state): { [stationId: string]: HideoutModule[] } => {
      const moduleMap: { [stationId: string]: HideoutModule[] } = {};
      state.hideoutModules.forEach((module) => {
        if (!moduleMap[module.stationId]) {
          moduleMap[module.stationId] = [];
        }
        moduleMap[module.stationId]!.push(module);
      });
      return moduleMap;
    },
    maxStationLevels: (state): { [stationId: string]: number } => {
      const maxLevels: { [stationId: string]: number } = {};
      state.hideoutStations.forEach((station) => {
        maxLevels[station.id] = Math.max(...station.levels.map((level) => level.level));
      });
      return maxLevels;
    },
    // Player level properties
    minPlayerLevel: (state): number => {
      if (!state.playerLevels.length) return 1;
      return Math.min(...state.playerLevels.map((level) => level.level));
    },
    maxPlayerLevel: (state): number => {
      if (!state.playerLevels.length) return 79;
      return Math.max(...state.playerLevels.map((level) => level.level));
    },
    // Utility getters
    isDataLoaded: (state): boolean => {
      return (
        !state.loading &&
        !state.hideoutLoading &&
        state.tasks.length > 0 &&
        state.hideoutStations.length > 0
      );
    },
    hasInitialized: (state): boolean => state.initialized,
    // Items getters
    itemsById: (state): Map<string, TarkovItem> => {
      const map = new Map<string, TarkovItem>();
      state.items.forEach((item) => {
        map.set(item.id, item);
      });
      return map;
    },
    isItemsLoaded: (state): boolean => {
      return !state.itemsLoading && state.items.length > 0;
    },
    // Prestige getters
    isPrestigeLoaded: (state): boolean => {
      return !state.prestigeLoading && state.prestigeLevels.length > 0;
    },
    getPrestigeByLevel:
      (state) =>
      (level: number): PrestigeLevel | undefined => {
        return state.prestigeLevels.find(
          (prestige: PrestigeLevel) => prestige.prestigeLevel === level
        );
      },
    /**
     * Build a mapping of task IDs to the user prestige level that should see them.
     * This is derived from prestige conditions - if prestige N requires completing task X,
     * then users at prestige (N-1) should see task X.
     *
     * Returns: Map<taskId, userPrestigeLevel>
     * Example: { "6761f28a022f60bb320f3e95": 0 } means users at prestige 0 see this task
     */
    prestigeTaskMap: (state): Map<string, number> => {
      const map = new Map<string, number>();
      for (const prestige of state.prestigeLevels) {
        const prestigeLevel = prestige.prestigeLevel ?? 0;
        // Find TaskObjectiveTaskStatus conditions that reference tasks
        for (const condition of prestige.conditions || []) {
          // Check if this is a task status condition with a task reference
          if (condition.task?.id && condition.task?.name === 'New Beginning') {
            // User at prestige (N-1) needs to complete this task to reach prestige N
            map.set(condition.task.id, prestigeLevel - 1);
          }
        }
      }
      return map;
    },
    /**
     * Get all "New Beginning" task IDs that are prestige-gated
     */
    prestigeTaskIds: (state): string[] => {
      const ids: string[] = [];
      for (const prestige of state.prestigeLevels) {
        for (const condition of prestige.conditions || []) {
          if (condition.task?.id && condition.task?.name === 'New Beginning') {
            ids.push(condition.task.id);
          }
        }
      }
      return ids;
    },
  },
  actions: {
    async initialize() {
      // Guard against concurrent initialization calls
      if (initPromise) {
        return initPromise;
      }
      if (isInitializing.value) {
        return;
      }
      isInitializing.value = true;
      initPromise = (async () => {
        try {
          this.updateLanguageAndGameMode();
          await this.loadStaticMapData();
          await this.fetchAllData();
          this.initialized = true;
          this.initializationFailed = false;
        } catch (err) {
          logger.error('[MetadataStore] Failed to initialize metadata:', err);
          this.initializationFailed = true;
          // Rethrow to allow caller (e.g. metadata plugin) to handle retries or critical failure
          throw err;
        } finally {
          isInitializing.value = false;
          initPromise = null;
        }
      })();
      return initPromise;
    },
    /**
     * Update language code and game mode based on current state
     * @param localeOverride - Optional locale override to use instead of useSafeLocale()
     */
    updateLanguageAndGameMode(localeOverride?: string) {
      const store = useTarkovStore();
      const effectiveLocale = localeOverride || useSafeLocale().value;
      logger.debug('[MetadataStore] updateLanguageAndGameMode - raw locale:', effectiveLocale);
      // Update language code
      const mappedCode = LOCALE_TO_API_MAPPING[effectiveLocale];
      if (mappedCode) {
        this.languageCode = mappedCode;
      } else {
        this.languageCode = extractLanguageCode(effectiveLocale, [...API_SUPPORTED_LANGUAGES]);
      }
      // Update game mode
      this.currentGameMode = store.getCurrentGameMode();
    },
    /**
     * Load static map data from local source
     */
    async loadStaticMapData() {
      if (!this.staticMapData) {
        this.staticMapData = mapsData as unknown as StaticMapData;
      }
    },
    /**
     * Fetch all metadata from the API
     * @param forceRefresh - If true, bypass cache and fetch fresh data
     */
    async fetchAllData(forceRefresh = false) {
      // Run cleanup once per session
      if (typeof window !== 'undefined') {
        cleanupExpiredCache().catch((err) =>
          logger.error('[MetadataStore] Error during cache cleanup:', err)
        );
      }
      await this.fetchBootstrapData(forceRefresh);
      const hideoutPromise = this.fetchHideoutData(forceRefresh);
      const prestigePromise = this.fetchPrestigeData(forceRefresh);
      const editionsPromise = this.fetchEditionsData(forceRefresh);
      await this.fetchTasksCoreData(forceRefresh);
      if (this.tasks.length) {
        this.fetchTaskObjectivesData(forceRefresh).catch((err) =>
          logger.error('[MetadataStore] Error fetching task objectives data:', err)
        );
        this.fetchTaskRewardsData(forceRefresh).catch((err) =>
          logger.error('[MetadataStore] Error fetching task rewards data:', err)
        );
      }
      // Items are heavy; load in background for hydration without blocking app init.
      this.fetchItemsData(forceRefresh).catch((err) =>
        logger.error('[MetadataStore] Error fetching items data:', err)
      );
      await Promise.all([hideoutPromise, prestigePromise, editionsPromise]);
    },
    /**
     * Fetch minimal bootstrap data (player levels) to enable early UI rendering
     * Uses IndexedDB cache for client-side persistence
     */
    async fetchBootstrapData(forceRefresh = false) {
      try {
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<TarkovBootstrapQueryResult>(
            'bootstrap' as CacheType,
            'all',
            this.languageCode
          );
          if (cached) {
            logger.debug(`[MetadataStore] Bootstrap loaded from cache: ${this.languageCode}`);
            this.processBootstrapData(cached);
            return;
          }
        }
        // Step 2: Fetch from server API
        logger.debug(`[MetadataStore] Fetching bootstrap from server: ${this.languageCode}`);
        const response = (await $fetch<{
          data: TarkovBootstrapQueryResult;
        }>('/api/tarkov/bootstrap', {
          query: {
            lang: this.languageCode,
          },
        })) as { data: TarkovBootstrapQueryResult; error?: unknown };
        if (response.error) {
          throw new Error(response.error as string);
        }
        if (response?.data) {
          this.processBootstrapData(response.data);
          // Step 3: Store in IndexedDB for future visits
          if (typeof window !== 'undefined') {
            setCachedData(
              'bootstrap' as CacheType,
              'all',
              this.languageCode,
              response.data,
              CACHE_CONFIG.DEFAULT_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching bootstrap data:', err));
          }
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching bootstrap data:', err);
      }
    },
    /**
     * Fetch core tasks, maps, and traders data (no objectives/rewards)
     * Uses IndexedDB cache for client-side persistence
     */
    async fetchTasksCoreData(forceRefresh = false) {
      this.loading = true;
      this.error = null;
      try {
        const apiGameMode =
          API_GAME_MODES[this.currentGameMode as keyof typeof API_GAME_MODES] ||
          API_GAME_MODES[GAME_MODES.PVP];
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<TarkovTasksCoreQueryResult>(
            'tasks-core' as CacheType,
            apiGameMode,
            this.languageCode
          );
          if (cached) {
            logger.debug(
              `[MetadataStore] Task core loaded from cache: ${this.languageCode}-${apiGameMode}`
            );
            this.processTasksCoreData(cached);
            this.loading = false;
            return;
          }
        }
        // Step 2: Fetch from server API
        logger.debug(
          `[MetadataStore] Fetching task core from server: ${this.languageCode}-${apiGameMode}`
        );
        const response = (await $fetch<{
          data: TarkovTasksCoreQueryResult;
        }>('/api/tarkov/tasks-core', {
          query: {
            lang: this.languageCode,
            gameMode: apiGameMode,
          },
        })) as { data: TarkovTasksCoreQueryResult; error?: unknown };
        if (response.error) {
          throw new Error(response.error as string);
        }
        if (response?.data) {
          this.processTasksCoreData(response.data);
          // Step 3: Store in IndexedDB for future visits
          if (typeof window !== 'undefined') {
            setCachedData(
              'tasks-core' as CacheType,
              apiGameMode,
              this.languageCode,
              response.data,
              CACHE_CONFIG.DEFAULT_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching task core data:', err));
          }
        } else {
          this.resetTasksData();
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching task core data:', err);
        this.error = err as Error;
        this.resetTasksData();
      } finally {
        this.loading = false;
      }
    },
    /**
     * Fetch task objectives and fail conditions data
     * Uses IndexedDB cache for client-side persistence
     */
    async fetchTaskObjectivesData(forceRefresh = false) {
      try {
        const apiGameMode =
          API_GAME_MODES[this.currentGameMode as keyof typeof API_GAME_MODES] ||
          API_GAME_MODES[GAME_MODES.PVP];
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<TarkovTaskObjectivesQueryResult>(
            'tasks-objectives' as CacheType,
            apiGameMode,
            this.languageCode
          );
          if (cached) {
            logger.debug(
              `[MetadataStore] Task objectives loaded from cache: ${this.languageCode}-${apiGameMode}`
            );
            this.mergeTaskObjectives(cached.tasks);
            this.hydrateTaskItems();
            return;
          }
        }
        // Step 2: Fetch from server API
        logger.debug(
          `[MetadataStore] Fetching task objectives from server: ${this.languageCode}-${apiGameMode}`
        );
        const response = (await $fetch<{
          data: TarkovTaskObjectivesQueryResult;
        }>('/api/tarkov/tasks-objectives', {
          query: {
            lang: this.languageCode,
            gameMode: apiGameMode,
          },
        })) as { data: TarkovTaskObjectivesQueryResult; error?: unknown };
        if (response.error) {
          throw new Error(response.error as string);
        }
        if (response?.data?.tasks) {
          this.mergeTaskObjectives(response.data.tasks);
          this.hydrateTaskItems();
          // Step 3: Store in IndexedDB for future visits
          if (typeof window !== 'undefined') {
            setCachedData(
              'tasks-objectives' as CacheType,
              apiGameMode,
              this.languageCode,
              response.data,
              CACHE_CONFIG.DEFAULT_TTL
            ).catch((err) =>
              logger.error('[MetadataStore] Error caching task objectives data:', err)
            );
          }
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching task objectives data:', err);
      }
    },
    /**
     * Fetch task rewards data
     * Uses IndexedDB cache for client-side persistence
     */
    async fetchTaskRewardsData(forceRefresh = false) {
      try {
        const apiGameMode =
          API_GAME_MODES[this.currentGameMode as keyof typeof API_GAME_MODES] ||
          API_GAME_MODES[GAME_MODES.PVP];
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<TarkovTaskRewardsQueryResult>(
            'tasks-rewards' as CacheType,
            apiGameMode,
            this.languageCode
          );
          if (cached) {
            logger.debug(
              `[MetadataStore] Task rewards loaded from cache: ${this.languageCode}-${apiGameMode}`
            );
            this.mergeTaskRewards(cached.tasks);
            this.hydrateTaskItems();
            return;
          }
        }
        // Step 2: Fetch from server API
        logger.debug(
          `[MetadataStore] Fetching task rewards from server: ${this.languageCode}-${apiGameMode}`
        );
        const response = (await $fetch<{
          data: TarkovTaskRewardsQueryResult;
        }>('/api/tarkov/tasks-rewards', {
          query: {
            lang: this.languageCode,
            gameMode: apiGameMode,
          },
        })) as { data: TarkovTaskRewardsQueryResult; error?: unknown };
        if (response.error) {
          throw new Error(response.error as string);
        }
        if (response?.data?.tasks) {
          this.mergeTaskRewards(response.data.tasks);
          this.hydrateTaskItems();
          // Step 3: Store in IndexedDB for future visits
          if (typeof window !== 'undefined') {
            setCachedData(
              'tasks-rewards' as CacheType,
              apiGameMode,
              this.languageCode,
              response.data,
              CACHE_CONFIG.DEFAULT_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching task rewards data:', err));
          }
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching task rewards data:', err);
      }
    },
    /**
     * Backwards-compatible wrapper for legacy callers
     */
    async fetchTasksData(forceRefresh = false) {
      await this.fetchTasksCoreData(forceRefresh);
      if (!this.tasks.length) return;
      await Promise.all([
        this.fetchTaskObjectivesData(forceRefresh),
        this.fetchTaskRewardsData(forceRefresh),
      ]);
      this.fetchItemsData(forceRefresh).catch((err) =>
        logger.error('[MetadataStore] Error fetching items data:', err)
      );
    },
    /**
     * Fetch hideout data
     * Uses IndexedDB cache for client-side persistence
     */
    async fetchHideoutData(forceRefresh = false) {
      this.hideoutLoading = true;
      this.hideoutError = null;
      try {
        const apiGameMode =
          API_GAME_MODES[this.currentGameMode as keyof typeof API_GAME_MODES] ||
          API_GAME_MODES[GAME_MODES.PVP];
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        // Hideout data IS language-specific (station names, descriptions, item names, etc.)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<TarkovHideoutQueryResult>(
            'hideout' as CacheType,
            apiGameMode,
            this.languageCode
          );
          if (cached) {
            logger.debug(
              `[MetadataStore] Hideout loaded from cache: ${this.languageCode}-${apiGameMode}`
            );
            this.processHideoutData(cached);
            this.hideoutLoading = false;
            return;
          }
        }
        // Step 2: Fetch from server API
        logger.debug(
          `[MetadataStore] Fetching hideout from server: ${this.languageCode}-${apiGameMode}`
        );
        const response = (await $fetch<{
          data: TarkovHideoutQueryResult;
        }>('/api/tarkov/hideout', {
          query: {
            lang: this.languageCode,
            gameMode: apiGameMode,
          },
        })) as { data: TarkovHideoutQueryResult; error?: unknown };
        if (response.error) {
          throw new Error(response.error as string);
        }
        if (response?.data) {
          this.processHideoutData(response.data);
          // Step 3: Store in IndexedDB for future visits
          if (typeof window !== 'undefined') {
            setCachedData(
              'hideout' as CacheType,
              apiGameMode,
              this.languageCode,
              response.data,
              CACHE_CONFIG.DEFAULT_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching hideout data:', err));
          }
        } else {
          this.resetHideoutData();
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching hideout data:', err);
        this.hideoutError = err as Error;
        this.resetHideoutData();
      } finally {
        this.hideoutLoading = false;
      }
    },
    /**
     * Fetch all items data
     * Uses IndexedDB cache for client-side persistence
     * Items are language-specific but not game-mode specific
     */
    async fetchItemsData(forceRefresh = false) {
      this.itemsLoading = true;
      this.itemsError = null;
      try {
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<TarkovItemsQueryResult>(
            'items' as CacheType,
            'all',
            this.languageCode
          );
          if (cached) {
            logger.debug(`[MetadataStore] Items loaded from cache: ${this.languageCode}`);
            this.items = cached.items || [];
            this.hydrateTaskItems();
            this.itemsLoading = false;
            return;
          }
        }
        // Step 2: Fetch from server API
        logger.debug(`[MetadataStore] Fetching items from server: ${this.languageCode}`);
        const response = (await $fetch<{
          data: TarkovItemsQueryResult;
        }>('/api/tarkov/items', {
          query: {
            lang: this.languageCode,
          },
        })) as { data: TarkovItemsQueryResult; error?: unknown };
        if (response.error) {
          throw new Error(response.error as string);
        }
        if (response?.data?.items) {
          this.items = response.data.items;
          this.hydrateTaskItems();
          // Step 3: Store in IndexedDB for future visits (24 hour TTL for items)
          if (typeof window !== 'undefined') {
            setCachedData(
              'items' as CacheType,
              'all',
              this.languageCode,
              response.data,
              CACHE_CONFIG.MAX_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching items data:', err));
          }
        } else {
          this.items = [];
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching items data:', err);
        this.itemsError = err as Error;
        this.items = [];
      } finally {
        this.itemsLoading = false;
      }
    },
    /**
     * Fetch prestige data
     * Uses IndexedDB cache for client-side persistence
     * Prestige is language-specific but NOT game-mode specific
     */
    async fetchPrestigeData(forceRefresh = false) {
      this.prestigeLoading = true;
      this.prestigeError = null;
      try {
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<TarkovPrestigeQueryResult>(
            'prestige' as CacheType,
            'all',
            this.languageCode
          );
          if (cached) {
            logger.debug(`[MetadataStore] Prestige loaded from cache: ${this.languageCode}`);
            this.prestigeLevels = cached.prestige || [];
            this.prestigeLoading = false;
            return;
          }
        }
        // Step 2: Fetch from server API
        logger.debug(`[MetadataStore] Fetching prestige from server: ${this.languageCode}`);
        const response = (await $fetch<{
          data: TarkovPrestigeQueryResult;
        }>('/api/tarkov/prestige', {
          query: {
            lang: this.languageCode,
          },
        })) as { data: TarkovPrestigeQueryResult; error?: unknown };
        if (response.error) {
          throw new Error(response.error as string);
        }
        if (response?.data?.prestige) {
          this.prestigeLevels = response.data.prestige;
          // Step 3: Store in IndexedDB for future visits (24 hour TTL)
          if (typeof window !== 'undefined') {
            setCachedData(
              'prestige' as CacheType,
              'all',
              this.languageCode,
              response.data,
              CACHE_CONFIG.MAX_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching prestige data:', err));
          }
        } else {
          this.prestigeLevels = [];
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching prestige data:', err);
        this.prestigeError = err as Error;
        this.prestigeLevels = [];
      } finally {
        this.prestigeLoading = false;
      }
    },
    /**
     * Fetch game editions data directly from GitHub overlay
     * Editions are universal (not language or game-mode specific)
     * Uses IndexedDB cache for client-side persistence
     */
    async fetchEditionsData(forceRefresh = false) {
      this.editionsLoading = true;
      this.editionsError = null;
      try {
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<{ editions: GameEdition[] }>(
            'editions' as CacheType,
            'all',
            'en' // Editions are universal, use 'en' as cache key
          );
          if (cached?.editions) {
            logger.debug('[MetadataStore] Editions loaded from cache');
            this.editions = cached.editions;
            this.editionsLoading = false;
            return;
          }
        }
        // Step 2: Fetch directly from GitHub overlay
        logger.debug('[MetadataStore] Fetching editions from GitHub overlay');
        const OVERLAY_URL =
          'https://raw.githubusercontent.com/tarkovtracker-org/tarkov-data-overlay/main/dist/overlay.json';
        const overlay = await $fetch<{
          editions?: Record<string, GameEdition>;
        }>(OVERLAY_URL, {
          parseResponse: JSON.parse,
        });
        logger.debug('[MetadataStore] Overlay fetch response:', overlay);
        if (overlay?.editions) {
          // Convert editions object to array
          const editionsArray = Object.values(overlay.editions);
          logger.debug('[MetadataStore] Editions array:', editionsArray);
          this.editions = editionsArray;
          // Step 3: Store in IndexedDB for future visits (24 hour TTL)
          if (typeof window !== 'undefined') {
            setCachedData(
              'editions' as CacheType,
              'all',
              'en',
              { editions: editionsArray },
              CACHE_CONFIG.MAX_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching editions data:', err));
          }
        } else {
          logger.warn('[MetadataStore] No editions found in overlay response');
          this.editions = [];
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching editions data:', err);
        this.editionsError = err as Error;
        this.editions = [];
      } finally {
        this.editionsLoading = false;
      }
    },
    /**
     * Process bootstrap data (player levels) for early UI rendering
     */
    processBootstrapData(data: TarkovBootstrapQueryResult) {
      const levels = data.playerLevels || [];
      this.playerLevels = this.convertToCumulativeXP(levels);
    },
    /**
     * Process core task data without objectives/rewards
     */
    processTasksCoreData(data: TarkovTasksCoreQueryResult) {
      this.processTasksData({
        tasks: data.tasks || [],
        maps: data.maps || [],
        traders: data.traders || [],
      });
    },
    dedupeObjectiveIds(tasks: Task[]) {
      const objectiveCounts = new Map<string, number>();
      tasks.forEach((task) => {
        task.objectives?.forEach((objective) => {
          if (!objective?.id) return;
          objectiveCounts.set(objective.id, (objectiveCounts.get(objective.id) ?? 0) + 1);
        });
      });
      const duplicateObjectiveIds = new Map<string, string[]>();
      const updatedTasks = tasks.map((task) => {
        if (!task.objectives?.length) return task;
        let changed = false;
        const objectives = task.objectives.map((objective) => {
          if (!objective?.id) return objective;
          const count = objectiveCounts.get(objective.id) ?? 0;
          if (count <= 1) return objective;
          const newId = `${objective.id}:${task.id}`;
          const existing = duplicateObjectiveIds.get(objective.id);
          if (existing) {
            existing.push(newId);
          } else {
            duplicateObjectiveIds.set(objective.id, [newId]);
          }
          changed = true;
          return { ...objective, id: newId };
        });
        return changed ? { ...task, objectives } : task;
      });
      return { tasks: updatedTasks, duplicateObjectiveIds };
    },
    /**
     * Merge objective payloads into existing tasks
     */
    mergeTaskObjectives(tasks: TarkovTaskObjectivesQueryResult['tasks']) {
      if (!tasks?.length || !this.tasks.length) return;
      const updateMap = new Map(tasks.map((task) => [task.id, task]));
      let changed = false;
      const merged = this.tasks.map((task) => {
        const update = updateMap.get(task.id);
        if (!update) return task;
        changed = true;
        return {
          ...task,
          objectives:
            update.objectives !== undefined
              ? this.normalizeObjectiveItems(
                  normalizeTaskObjectives<TaskObjective>(update.objectives)
                )
              : task.objectives,
          failConditions:
            update.failConditions !== undefined
              ? this.normalizeObjectiveItems(
                  normalizeTaskObjectives<TaskObjective>(update.failConditions)
                )
              : task.failConditions,
        };
      });
      if (changed) {
        const deduped = this.dedupeObjectiveIds(merged);
        this.tasks = deduped.tasks;
        if (deduped.duplicateObjectiveIds.size > 0) {
          const progressStore = useProgressStore();
          progressStore.migrateDuplicateObjectiveProgress(deduped.duplicateObjectiveIds);
        }
        const tarkovStore = useTarkovStore();
        tarkovStore.repairCompletedTaskObjectives();
        this.rebuildTaskDerivedData();
        tarkovStore.repairFailedTaskStates();
      }
    },
    /**
     * Merge reward payloads into existing tasks
     */
    mergeTaskRewards(tasks: TarkovTaskRewardsQueryResult['tasks']) {
      if (!tasks?.length || !this.tasks.length) return;
      const updateMap = new Map(tasks.map((task) => [task.id, task]));
      let changed = false;
      const merged = this.tasks.map((task) => {
        const update = updateMap.get(task.id);
        if (!update) return task;
        changed = true;
        return {
          ...task,
          startRewards: update.startRewards !== undefined ? update.startRewards : task.startRewards,
          finishRewards:
            update.finishRewards !== undefined ? update.finishRewards : task.finishRewards,
          failureOutcome:
            update.failureOutcome !== undefined ? update.failureOutcome : task.failureOutcome,
        };
      });
      if (changed) {
        this.tasks = merged;
        this.rebuildTaskDerivedData();
      }
    },
    /**
     * Rebuild derived task structures after incremental merges
     */
    rebuildTaskDerivedData() {
      if (!this.tasks.length) {
        this.resetTasksData();
        return;
      }
      const graphBuilder = useGraphBuilder();
      const processedData = graphBuilder.processTaskData(this.tasks);
      this.tasks = processedData.tasks;
      this.taskGraph = processedData.taskGraph;
      this.mapTasks = processedData.mapTasks;
      this.objectiveMaps = processedData.objectiveMaps;
      this.objectiveGPS = processedData.objectiveGPS;
      this.alternativeTasks = processedData.alternativeTasks;
      this.neededItemTaskObjectives = processedData.neededItemTaskObjectives;
    },
    /**
     * Hydrate task item references with full item data
     */
    hydrateTaskItems() {
      if (!this.items.length || !this.tasks.length) return;
      const itemsById = new Map(this.items.map((item) => [item.id, item]));
      const mergeItem = (item?: TarkovItem | null): TarkovItem | undefined => {
        if (!item?.id) return item ?? undefined;
        const cached = itemsById.get(item.id);
        const merged = cached ? { ...cached, ...item } : item;
        if (merged?.properties?.defaultPreset) {
          merged.properties = {
            ...merged.properties,
            defaultPreset: mergeItem(merged.properties.defaultPreset),
          };
        }
        if (Array.isArray(merged?.containsItems)) {
          merged.containsItems = merged.containsItems.map((entry) => ({
            ...entry,
            item: mergeItem(entry.item) ?? entry.item,
          }));
        }
        return merged;
      };
      const mergeItemArray = (items?: TarkovItem[] | null): TarkovItem[] | undefined => {
        if (!Array.isArray(items)) return items ?? undefined;
        return items.map((item) => mergeItem(item) ?? item);
      };
      const hydrateObjective = (objective: TaskObjective): TaskObjective => {
        const obj = objective as ObjectiveWithItems;
        return {
          ...obj,
          item: mergeItem(obj.item),
          items: mergeItemArray(obj.items),
          markerItem: mergeItem(obj.markerItem),
          questItem: mergeItem(obj.questItem),
          containsAll: mergeItemArray(obj.containsAll),
          useAny: mergeItemArray(obj.useAny),
          usingWeapon: mergeItem(obj.usingWeapon),
          usingWeaponMods: mergeItemArray(obj.usingWeaponMods),
          wearing: mergeItemArray(obj.wearing),
          notWearing: mergeItemArray(obj.notWearing),
        } as TaskObjective;
      };
      const hydrateRewards = (rewards?: FinishRewards): FinishRewards | undefined => {
        if (!rewards) return rewards;
        return {
          ...rewards,
          items: rewards.items?.map((reward) => ({
            ...reward,
            item: mergeItem(reward.item) ?? reward.item,
          })),
          offerUnlock: rewards.offerUnlock?.map((unlock) => ({
            ...unlock,
            item: mergeItem(unlock.item) ?? unlock.item,
          })),
        };
      };
      this.tasks = this.tasks.map((task) => ({
        ...task,
        objectives: task.objectives?.map(hydrateObjective),
        failConditions: task.failConditions?.map(hydrateObjective),
        neededKeys: task.neededKeys?.map((needed) => ({
          ...needed,
          keys: needed.keys?.map((key) => mergeItem(key) ?? key) ?? needed.keys,
        })),
        startRewards: hydrateRewards(task.startRewards),
        finishRewards: hydrateRewards(task.finishRewards),
        failureOutcome: hydrateRewards(task.failureOutcome),
      }));
      this.rebuildTaskDerivedData();
    },
    /**
     * Process tasks data and build derived structures using the graph builder composable
     */
    processTasksData(data: TarkovDataQueryResult) {
      // Filter out scav karma tasks at the source
      // These tasks require Scav Karma validation which isn't yet implemented
      const allTasks = data.tasks || [];
      const normalizedTasks = allTasks
        .filter((task): task is Task => Boolean(task))
        .map((task) => ({
          ...task,
          objectives: this.normalizeObjectiveItems(
            normalizeTaskObjectives<TaskObjective>(task.objectives)
          ),
          failConditions: this.normalizeObjectiveItems(
            normalizeTaskObjectives<TaskObjective>(task.failConditions)
          ),
        }));
      const filteredTasks = normalizedTasks.filter(
        (task) => !EXCLUDED_SCAV_KARMA_TASKS.includes(task.id)
      );
      const deduped = this.dedupeObjectiveIds(filteredTasks);
      this.tasks = deduped.tasks;
      if (deduped.duplicateObjectiveIds.size > 0) {
        const progressStore = useProgressStore();
        progressStore.migrateDuplicateObjectiveProgress(deduped.duplicateObjectiveIds);
      }
      const tarkovStore = useTarkovStore();
      tarkovStore.repairCompletedTaskObjectives();
      this.maps = data.maps || [];
      this.traders = data.traders || [];
      if (Array.isArray(data.playerLevels)) {
        this.playerLevels = this.convertToCumulativeXP(data.playerLevels);
      }
      if (this.tasks.length > 0) {
        const graphBuilder = useGraphBuilder();
        const processedData = graphBuilder.processTaskData(this.tasks);
        this.tasks = processedData.tasks;
        this.taskGraph = processedData.taskGraph;
        this.mapTasks = processedData.mapTasks;
        this.objectiveMaps = processedData.objectiveMaps;
        this.objectiveGPS = processedData.objectiveGPS;
        this.alternativeTasks = processedData.alternativeTasks;
        this.neededItemTaskObjectives = processedData.neededItemTaskObjectives;
        tarkovStore.repairFailedTaskStates();
      } else {
        this.resetTasksData();
      }
    },
    /**
     * Ensure objective.item is populated from objective.items when using the new schema.
     */
    normalizeObjectiveItems(objectives: TaskObjective[]): TaskObjective[] {
      if (!objectives?.length) return objectives;
      return objectives.map((objective) => {
        if (!objective) return objective;
        const obj = objective as ObjectiveWithItems;
        if (!obj.item && Array.isArray(obj.items) && obj.items.length > 0) {
          return { ...objective, item: obj.items[0] };
        }
        return objective;
      });
    },
    /**
     * Process hideout data and build derived structures using the graph builder composable
     */
    processHideoutData(data: TarkovHideoutQueryResult) {
      this.hideoutStations = data.hideoutStations || [];
      if (this.hideoutStations.length > 0) {
        this.craftSourcesByItemId = this.buildCraftSourcesMap(this.hideoutStations);
        const graphBuilder = useGraphBuilder();
        const processedData = graphBuilder.processHideoutData(this.hideoutStations);
        this.hideoutModules = processedData.hideoutModules;
        this.hideoutGraph = processedData.hideoutGraph;
        this.neededItemHideoutModules = processedData.neededItemHideoutModules;
      } else {
        this.resetHideoutData();
      }
    },
    /**
     * Builds a map of craft sources indexed by item ID from hideout stations.
     */
    buildCraftSourcesMap(stations: HideoutStation[]): Map<string, CraftSource[]> {
      const map = new Map<string, CraftSource[]>();
      for (const station of stations) {
        for (const level of station.levels || []) {
          for (const craft of level.crafts || []) {
            for (const reward of craft.rewardItems || []) {
              const itemId = reward?.item?.id;
              if (!itemId) continue;
              const sources = map.get(itemId) ?? [];
              const isDuplicate = sources.some(
                (source) => source.stationId === station.id && source.stationLevel === level.level
              );
              if (!isDuplicate) {
                sources.push({
                  stationId: station.id,
                  stationName: station.name,
                  stationLevel: level.level,
                });
                map.set(itemId, sources);
              }
            }
          }
        }
      }
      return map;
    },
    /**
     * Converts player level XP from per-level increments to cumulative totals
     * The API returns exp as XP needed from previous level (incremental)
     * We need cumulative XP from level 1 for proper level calculations
     */
    convertToCumulativeXP(levels: PlayerLevel[]): PlayerLevel[] {
      if (!levels || levels.length === 0) return [];
      let cumulativeXP = 0;
      return levels.map((level) => {
        cumulativeXP += level.exp;
        return {
          ...level,
          exp: cumulativeXP,
        };
      });
    },
    /**
     * Reset tasks data to empty state
     */
    resetTasksData() {
      this.tasks = [];
      this.maps = [];
      this.traders = [];
      this.taskGraph = markRaw(createGraph());
      this.objectiveMaps = {};
      this.alternativeTasks = {};
      this.objectiveGPS = {};
      this.mapTasks = {};
      this.neededItemTaskObjectives = [];
    },
    /**
     * Reset hideout data to empty state
     */
    resetHideoutData() {
      this.hideoutStations = [];
      this.hideoutModules = [];
      this.hideoutGraph = markRaw(createGraph());
      this.neededItemHideoutModules = [];
      this.craftSourcesByItemId = new Map<string, CraftSource[]>();
    },
    // Task utility functions
    getTaskById(taskId: string): Task | undefined {
      return this.tasks.find((task) => task.id === taskId);
    },
    getTasksByTrader(traderId: string): Task[] {
      return this.tasks.filter((task) => task.trader?.id === traderId);
    },
    getTasksByMap(mapId: string): Task[] {
      const taskIds = this.mapTasks[mapId] || [];
      return this.tasks.filter((task) => taskIds.includes(task.id));
    },
    isPrerequisiteFor(taskId: string, targetTaskId: string): boolean {
      const targetTask = this.getTaskById(targetTaskId);
      return targetTask?.predecessors?.includes(taskId) ?? false;
    },
    // Trader utility functions
    getTraderById(traderId: string): Trader | undefined {
      return this.traders.find((trader) => trader.id === traderId);
    },
    getTraderByName(traderName: string): Trader | undefined {
      const lowerCaseName = traderName.toLowerCase();
      return this.traders.find(
        (trader) =>
          trader.name.toLowerCase() === lowerCaseName ||
          trader.normalizedName?.toLowerCase() === lowerCaseName
      );
    },
    // Map utility functions
    getMapById(mapId: string): TarkovMap | undefined {
      return this.maps.find((map) => map.id === mapId);
    },
    getMapByName(mapName: string): TarkovMap | undefined {
      const lowerCaseName = mapName.toLowerCase();
      return this.maps.find(
        (map) =>
          map.name.toLowerCase() === lowerCaseName ||
          map.normalizedName?.toLowerCase() === lowerCaseName
      );
    },
    getStaticMapKey(mapName: string): string {
      const lowerCaseName = mapName.toLowerCase();
      return MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
    },
    hasMapSvg(mapId: string): boolean {
      const map = this.getMapById(mapId);
      return !!map?.svg;
    },
    // Hideout utility functions
    getStationById(stationId: string): HideoutStation | undefined {
      return this.hideoutStations.find((station) => station.id === stationId);
    },
    getStationByName(name: string): HideoutStation | undefined {
      return this.stationsByName[name];
    },
    getModuleById(moduleId: string): HideoutModule | undefined {
      return this.hideoutModules.find((module) => module.id === moduleId);
    },
    getModulesByStation(stationId: string): HideoutModule[] {
      return this.modulesByStation[stationId] || [];
    },
    getMaxStationLevel(stationId: string): number {
      return this.maxStationLevels[stationId] || 0;
    },
    isPrerequisiteForModule(moduleId: string, targetModuleId: string): boolean {
      const targetModule = this.getModuleById(targetModuleId);
      return targetModule?.predecessors?.includes(moduleId) ?? false;
    },
    getItemsForModule(moduleId: string): NeededItemHideoutModule[] {
      return this.neededItemHideoutModules.filter((item) => item.hideoutModule.id === moduleId);
    },
    getModulesRequiringItem(itemId: string): NeededItemHideoutModule[] {
      return this.neededItemHideoutModules.filter((item) => item.item.id === itemId);
    },
    getTotalConstructionTime(moduleId: string): number {
      const module = this.getModuleById(moduleId);
      if (!module) return 0;
      let totalTime = module.constructionTime;
      // Add time for all prerequisite modules
      module.predecessors.forEach((prerequisiteId) => {
        const prerequisite = this.getModuleById(prerequisiteId);
        if (prerequisite) {
          totalTime += prerequisite.constructionTime;
        }
      });
      return totalTime;
    },
    /**
     * Refresh all data
     */
    async refresh() {
      this.updateLanguageAndGameMode();
      await this.fetchAllData();
    },
  },
});
// Export type for use in components
export type MetadataStore = ReturnType<typeof useMetadataStore>;
