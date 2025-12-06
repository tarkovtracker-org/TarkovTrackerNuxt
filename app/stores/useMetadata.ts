import { defineStore } from 'pinia';
import { markRaw, ref } from 'vue';
import { extractLanguageCode, useSafeLocale } from '@/composables/i18nHelpers';
import { useGraphBuilder } from '@/composables/useGraphBuilder';
import mapsData from '@/data/maps.json';
import { useTarkovStore } from '@/stores/useTarkov';
import type {
  HideoutModule,
  HideoutStation,
  NeededItemHideoutModule,
  NeededItemTaskObjective,
  ObjectiveGPSInfo,
  ObjectiveMapInfo,
  PlayerLevel,
  StaticMapData,
  TarkovDataQueryResult,
  TarkovHideoutQueryResult,
  TarkovItem,
  TarkovItemsQueryResult,
  TarkovMap,
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
  sortTradersByGameOrder,
} from '@/utils/constants';
import { createGraph } from '@/utils/graphHelpers';
import { logger } from '@/utils/logger';
import {
  CACHE_CONFIG,
  type CacheType,
  cleanupExpiredCache,
  getCachedData,
  setCachedData,
} from '@/utils/tarkovCache';
import type { AbstractGraph } from 'graphology-types';
// Initialization guard to prevent race conditions
let initPromise: Promise<void> | null = null;
const isInitializing = ref(false);
interface MetadataState {
  // Loading states
  loading: boolean;
  hideoutLoading: boolean;
  itemsLoading: boolean;
  error: Error | null;
  hideoutError: Error | null;
  itemsError: Error | null;
  // Raw data from API
  tasks: Task[];
  hideoutStations: HideoutStation[];
  maps: TarkovMap[];
  traders: Trader[];
  playerLevels: PlayerLevel[];
  items: TarkovItem[];
  staticMapData: StaticMapData | null;
  // Processed data
  taskGraph: AbstractGraph;
  hideoutGraph: AbstractGraph;
  hideoutModules: HideoutModule[];
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
    loading: false,
    hideoutLoading: false,
    itemsLoading: false,
    error: null,
    hideoutError: null,
    itemsError: null,
    tasks: [],
    hideoutStations: [],
    maps: [],
    traders: [],
    playerLevels: [],
    items: [],
    staticMapData: null,
    taskGraph: markRaw(createGraph()),
    hideoutGraph: markRaw(createGraph()),
    hideoutModules: [],
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
        task.objectives?.forEach((obj) => {
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
    // Computed properties for maps with merged static data
    mapsWithSvg: (state): TarkovMap[] => {
      if (!state.maps.length || !state.staticMapData) {
        return [];
      }
      const mergedMaps = state.maps.map((map) => {
        const lowerCaseName = map.name.toLowerCase();
        const mapKey = MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
        const staticData = state.staticMapData?.[mapKey];
        if (staticData?.svg) {
          return {
            ...map,
            svg: staticData.svg,
          };
        } else {
          logger.warn(
            `[MetadataStore] Static SVG data not found for map: ${map.name} (lookup key: ${mapKey})`
          );
          return map;
        }
      });
      return [...mergedMaps].sort((a, b) => a.name.localeCompare(b.name));
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
        this.staticMapData = mapsData as StaticMapData;
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
      await Promise.all([this.fetchTasksData(forceRefresh), this.fetchHideoutData(forceRefresh)]);
    },
    /**
     * Fetch tasks, maps, traders, and player levels data
     * Uses IndexedDB cache for client-side persistence
     */
    async fetchTasksData(forceRefresh = false) {
      this.loading = true;
      this.error = null;
      try {
        const apiGameMode =
          API_GAME_MODES[this.currentGameMode as keyof typeof API_GAME_MODES] ||
          API_GAME_MODES[GAME_MODES.PVP];
        // Step 1: Check IndexedDB cache (unless forcing refresh)
        if (!forceRefresh && typeof window !== 'undefined') {
          const cached = await getCachedData<TarkovDataQueryResult>(
            'data' as CacheType,
            apiGameMode,
            this.languageCode
          );
          if (cached) {
            logger.debug(
              `[MetadataStore] Tasks loaded from cache: ${this.languageCode}-${apiGameMode}`
            );
            this.processTasksData(cached);
            this.loading = false;
            return;
          }
        }
        // Step 2: Fetch from server API
        logger.debug(
          `[MetadataStore] Fetching tasks from server: ${this.languageCode}-${apiGameMode}`
        );
        const response = (await $fetch<{
          data: TarkovDataQueryResult;
        }>('/api/tarkov/data', {
          query: {
            lang: this.languageCode,
            gameMode: apiGameMode,
          },
        })) as { data: TarkovDataQueryResult; error?: unknown };
        if (response.error) {
          throw new Error(response.error as string);
        }
        if (response?.data) {
          this.processTasksData(response.data);
          // Step 3: Store in IndexedDB for future visits
          if (typeof window !== 'undefined') {
            setCachedData(
              'data' as CacheType,
              apiGameMode,
              this.languageCode,
              response.data,
              CACHE_CONFIG.DEFAULT_TTL
            ).catch((err) => logger.error('[MetadataStore] Error caching tasks data:', err));
          }
        } else {
          this.resetTasksData();
        }
      } catch (err) {
        logger.error('[MetadataStore] Error fetching tasks data:', err);
        this.error = err as Error;
        this.resetTasksData();
      } finally {
        this.loading = false;
      }
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
     * Process tasks data and build derived structures using the graph builder composable
     */
    processTasksData(data: TarkovDataQueryResult) {
      // Filter out scav karma tasks at the source
      // These tasks require Scav Karma validation which isn't yet implemented
      const allTasks = data.tasks || [];
      this.tasks = allTasks.filter((task) => !EXCLUDED_SCAV_KARMA_TASKS.includes(task.id));
      this.maps = data.maps || [];
      this.traders = data.traders || [];
      this.playerLevels = data.playerLevels || [];
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
      } else {
        this.resetTasksData();
      }
    },
    /**
     * Process hideout data and build derived structures using the graph builder composable
     */
    processHideoutData(data: TarkovHideoutQueryResult) {
      this.hideoutStations = data.hideoutStations || [];
      if (this.hideoutStations.length > 0) {
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
     * Reset tasks data to empty state
     */
    resetTasksData() {
      this.tasks = [];
      this.maps = [];
      this.traders = [];
      this.playerLevels = [];
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
