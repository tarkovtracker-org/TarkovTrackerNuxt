import 'pinia-plugin-persistedstate';
import { defineStore } from 'pinia';
import { watch } from 'vue';
import { useSupabaseSync } from '@/composables/supabase/useSupabaseSync';
import { pinia as pluginPinia } from '@/plugins/01.pinia.client';
import { logger } from '@/utils/logger';
import { flattenPreferences, unflattenPreferences } from '@/utils/preferenceMapper';
import { STORAGE_KEYS } from '@/utils/storageKeys';
import { useNuxtApp } from '#imports';
// Define the state structure
export interface PreferencesState {
  global: {
    theme: 'system' | 'light' | 'dark';
    localeOverride: string | null;
    streamerMode: boolean;
    enableHolidayEffects: boolean;
    useAutomaticLevelCalculation: boolean;
  };
  team: {
    individualHide: Record<string, boolean>;
    taskHideAll: boolean;
    itemsHideAll: boolean;
    itemsHideNonFIR: boolean;
    itemsHideHideout: boolean;
    mapHideAll: boolean;
  };
  tasks: {
    views: {
      primary: string | null;
      secondary: string | null;
      map: string | null;
      trader: string | null;
      user: string | null;
      taskId: string | null;
    };
    filters: {
      hideGlobal: boolean;
      hideNonKappa: boolean;
      search: string | null;
      showNonSpecial: boolean;
      showEod: boolean;
      showLightkeeper: boolean;
    };
    appearance: {
      showRequiredLabels: boolean;
      showNotRequiredLabels: boolean;
      showExperienceRewards: boolean;
      showTaskIds: boolean;
      showNextQuests: boolean;
      showPreviousQuests: boolean;
      cardDensity: 'comfortable' | 'compact';
    };
    advanced: {
      enableManualFail: boolean;
    };
  };
  neededItems: {
    views: {
      type: string | null;
      style: string | null;
    };
    filters: {
      hideNonFIR: boolean;
      search: string | null;
    };
  };
  hideout: {
    views: {
      primary: string | null;
    };
    filters: {
      search: string | null;
    };
  };
  maps: {
    showExtracts: boolean;
  };
  // Transient state
  saving?: Record<string, boolean>;
}
// Export the default state with type annotation
export const preferencesDefaultState: PreferencesState = {
  global: {
    theme: 'system',
    localeOverride: null,
    streamerMode: false,
    enableHolidayEffects: true,
    useAutomaticLevelCalculation: false,
  },
  team: {
    individualHide: {},
    taskHideAll: false,
    itemsHideAll: false,
    itemsHideNonFIR: false,
    itemsHideHideout: false,
    mapHideAll: false,
  },
  tasks: {
    views: {
      primary: null,
      secondary: null,
      map: null,
      trader: null,
      user: null,
      taskId: null,
    },
    filters: {
      hideGlobal: false,
      hideNonKappa: false,
      search: null,
      showNonSpecial: true,
      showEod: true,
      showLightkeeper: true,
    },
    appearance: {
      showRequiredLabels: true,
      showNotRequiredLabels: true,
      showExperienceRewards: true,
      showTaskIds: true,
      showNextQuests: true,
      showPreviousQuests: true,
      cardDensity: 'compact',
    },
    advanced: {
      enableManualFail: false,
    },
  },
  neededItems: {
    views: {
      type: null,
      style: null,
    },
    filters: {
      hideNonFIR: false,
      search: null,
    },
  },
  hideout: {
    views: {
      primary: null,
    },
    filters: {
      search: null,
    },
  },
  maps: {
    showExtracts: true,
  },
  saving: {
    streamerMode: false,
    hideGlobalTasks: false,
    hideNonKappaTasks: false,
    itemsNeededHideNonFIR: false,
  },
};
// Per-toggle saving state (not persisted)
const initialSavingState = {
  streamerMode: false,
  hideGlobalTasks: false,
  hideNonKappaTasks: false,
  itemsNeededHideNonFIR: false,
};
export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => {
    const state = JSON.parse(JSON.stringify(preferencesDefaultState));
    // Always reset saving state on store creation
    state.saving = { ...initialSavingState };
    return state;
  },
  getters: {
    getStreamerMode(state) {
      return state.global.streamerMode ?? false;
    },
    getTheme(state) {
      return state.global.theme ?? 'system';
    },
    getLocaleOverride(state) {
      return state.global.localeOverride ?? null;
    },
    getEnableHolidayEffects(state) {
      return state.global.enableHolidayEffects ?? true;
    },
    getUseAutomaticLevelCalculation(state) {
      return state.global.useAutomaticLevelCalculation ?? false;
    },
    teamIsHidden: (state) => {
      return (teamId: string): boolean => {
        if (teamId === 'self') {
          return state.team.individualHide?.[teamId] || false;
        }
        const isHidden = state.team.taskHideAll || state.team.individualHide?.[teamId] || false;
        return isHidden;
      };
    },
    taskTeamAllHidden: (state) => {
      return state.team.taskHideAll ?? false;
    },
    itemsTeamAllHidden: (state) => {
      return state.team.itemsHideAll ?? false;
    },
    itemsTeamNonFIRHidden: (state) => {
      return state.team.itemsHideAll || state.team.itemsHideNonFIR || false;
    },
    itemsTeamHideoutHidden: (state) => {
      return state.team.itemsHideAll || state.team.itemsHideHideout || false;
    },
    mapTeamAllHidden: (state) => {
      return state.team.mapHideAll ?? false;
    },
    // Views
    getTaskPrimaryView: (state) => {
      const valid = ['all', 'traders', 'maps'];
      const val = state.tasks.views.primary;
      return val && valid.includes(val) ? val : 'all';
    },
    getTaskMapView: (state) => {
      return state.tasks.views.map ?? 'all';
    },
    getTaskTraderView: (state) => {
      return state.tasks.views.trader ?? 'all';
    },
    getTaskSecondaryView: (state) => {
      const valid = ['all', 'available', 'locked', 'completed', 'failed'];
      const val = state.tasks.views.secondary;
      return val && valid.includes(val) ? val : 'available';
    },
    getTaskUserView: (state) => {
      return state.tasks.views.user ?? 'self';
    },
    getTaskId: (state) => {
      return state.tasks.views.taskId ?? null;
    },
    getNeededTypeView: (state) => {
      const valid = ['all', 'tasks', 'hideout', 'completed'];
      const val = state.neededItems.views.type;
      return val && valid.includes(val) ? val : 'all';
    },
    itemsNeededHideNonFIR: (state) => {
      return state.neededItems.filters.hideNonFIR ?? false;
    },
    getHideGlobalTasks: (state) => {
      return state.tasks.filters.hideGlobal ?? false;
    },
    getHideNonKappaTasks: (state) => {
      return state.tasks.filters.hideNonKappa ?? false;
    },
    getNeededitemsStyle: (state) => {
      return state.neededItems.views.style ?? 'mediumCard';
    },
    getHideoutPrimaryView: (state) => {
      const valid = ['all', 'available', 'maxed', 'locked'];
      const val = state.hideout.views.primary;
      return val && valid.includes(val) ? val : 'available';
    },
    // Task filter getters
    getShowNonSpecialTasks: (state) => {
      return state.showNonSpecialTasks ?? true;
    },
    getShowLightkeeperTasks: (state) => {
      return state.showLightkeeperTasks ?? true;
    },
    // Task appearance getters
    getShowRequiredLabels: (state) => {
      return state.showRequiredLabels ?? true;
    },
    getShowNotRequiredLabels: (state) => {
      return state.showNotRequiredLabels ?? true;
    },
    getShowExperienceRewards: (state) => {
      return state.showExperienceRewards ?? true;
    },
    getShowTaskIds: (state) => {
      return state.showTaskIds ?? true;
    },
    getShowNextQuests: (state) => {
      return state.showNextQuests ?? true;
    },
    getShowPreviousQuests: (state) => {
      return state.showPreviousQuests ?? true;
    },
    getTaskCardDensity: (state) => {
      return state.taskCardDensity ?? 'compact';
    },
    getEnableManualTaskFail: (state) => {
      return state.enableManualTaskFail ?? false;
    },
    // Filter visibility
    getShowNonSpecialTasks: (state) => state.tasks.filters.showNonSpecial,
    getShowEodTasks: (state) => state.tasks.filters.showEod,
    getShowLightkeeperTasks: (state) => state.tasks.filters.showLightkeeper,
    // Appearance
    getShowRequiredLabels: (state) => state.tasks.appearance.showRequiredLabels,
    getShowNotRequiredLabels: (state) => state.tasks.appearance.showNotRequiredLabels,
    getShowExperienceRewards: (state) => state.tasks.appearance.showExperienceRewards,
    getShowTaskIds: (state) => state.tasks.appearance.showTaskIds,
    getShowNextQuests: (state) => state.tasks.appearance.showNextQuests,
    getShowPreviousQuests: (state) => state.tasks.appearance.showPreviousQuests,
    getTaskCardDensity: (state) => state.tasks.appearance.cardDensity,
    // Advanced
    getEnableManualTaskFail: (state) => state.tasks.advanced.enableManualFail,
    // Map
    getShowMapExtracts: (state) => state.maps.showExtracts,
    // Search
    getTaskSearch: (state) => state.tasks.filters.search,
    getNeededItemsSearch: (state) => state.neededItems.filters.search,
    getHideoutSearch: (state) => state.hideout.filters.search,
  },
  actions: {
    setStreamerMode(enabled: boolean) {
      this.global.streamerMode = enabled;
      this.setSaving('streamerMode', true);
    },
    setSaving(key: string, value: boolean) {
      if (!this.saving) this.saving = {};
      this.saving[key] = value;
    },
    toggleHidden(teamId: string) {
      this.team.individualHide[teamId] = !this.team.individualHide[teamId];
    },
    setQuestTeamHideAll(hide: boolean) {
      this.team.taskHideAll = hide;
    },
    setItemsTeamHideAll(hide: boolean) {
      this.team.itemsHideAll = hide;
    },
    setItemsTeamHideNonFIR(hide: boolean) {
      this.team.itemsHideNonFIR = hide;
    },
    setItemsTeamHideHideout(hide: boolean) {
      this.team.itemsHideHideout = hide;
    },
    setMapTeamHideAll(hide: boolean) {
      this.team.mapHideAll = hide;
    },
    setTaskPrimaryView(view: string | null) {
      this.tasks.views.primary = view;
    },
    setTaskMapView(view: string | null) {
      this.tasks.views.map = view;
    },
    setTaskTraderView(view: string | null) {
      this.tasks.views.trader = view;
    },
    setTaskSecondaryView(view: string | null) {
      this.tasks.views.secondary = view;
    },
    setTaskUserView(view: string | null) {
      this.tasks.views.user = view;
    },
    setTaskId(id: string | null) {
      this.tasks.views.taskId = id;
    },
    setNeededTypeView(view: string | null) {
      this.neededItems.views.type = view;
    },
    setItemsNeededHideNonFIR(hide: boolean) {
      this.neededItems.filters.hideNonFIR = hide;
      this.setSaving('itemsNeededHideNonFIR', true);
    },
    setHideGlobalTasks(hide: boolean) {
      this.tasks.filters.hideGlobal = hide;
      this.setSaving('hideGlobalTasks', true);
    },
    setHideNonKappaTasks(hide: boolean) {
      this.tasks.filters.hideNonKappa = hide;
      this.setSaving('hideNonKappaTasks', true);
    },
    setNeededItemsStyle(style: string | null) {
      this.neededItems.views.style = style;
    },
    setHideoutPrimaryView(view: string | null) {
      this.hideout.views.primary = view;
    },
    setLocaleOverride(locale: string | null) {
      this.global.localeOverride = locale;
    },
    setTheme(theme: 'system' | 'light' | 'dark') {
      this.global.theme = theme;
    },
    setShowNonSpecialTasks(show: boolean) {
      this.tasks.filters.showNonSpecial = show;
    },
    setShowEodTasks(show: boolean) {
      this.tasks.filters.showEod = show;
    },
    setShowLightkeeperTasks(show: boolean) {
      this.tasks.filters.showLightkeeper = show;
    },
    setShowRequiredLabels(show: boolean) {
      this.tasks.appearance.showRequiredLabels = show;
    },
    setShowNotRequiredLabels(show: boolean) {
      this.tasks.appearance.showNotRequiredLabels = show;
    },
    setShowExperienceRewards(show: boolean) {
      this.tasks.appearance.showExperienceRewards = show;
    },
    setShowTaskIds(show: boolean) {
      this.tasks.appearance.showTaskIds = show;
    },
    setShowNextQuests(show: boolean) {
      this.tasks.appearance.showNextQuests = show;
    },
    setShowPreviousQuests(show: boolean) {
      this.tasks.appearance.showPreviousQuests = show;
    },
    setTaskCardDensity(density: 'comfortable' | 'compact') {
      this.tasks.appearance.cardDensity = density;
    },
    setEnableManualTaskFail(enable: boolean) {
      this.tasks.advanced.enableManualFail = enable;
    },
    setUseAutomaticLevelCalculation(use: boolean) {
      this.global.useAutomaticLevelCalculation = use;
    },
    setEnableHolidayEffects(enable: boolean) {
      this.global.enableHolidayEffects = enable;
    },
    setShowMapExtracts(show: boolean) {
      this.maps.showExtracts = show;
    },
    setTaskSearch(search: string | null) {
      this.tasks.filters.search = search;
    },
    setNeededItemsSearch(search: string | null) {
      this.neededItems.filters.search = search;
    },
    setHideoutSearch(search: string | null) {
      this.hideout.filters.search = search;
    },
  },
  // Enable automatic localStorage persistence
  persist: {
    key: STORAGE_KEYS.preferences,
    pick: ['global', 'team', 'tasks', 'neededItems', 'hideout', 'maps'],
  },
});
export type PreferencesStore = ReturnType<typeof usePreferencesStore>;
// Watch for Supabase user state changing
let stopUserWatch: (() => void) | null = null;
const shouldInitPreferencesWatchers = import.meta.client && import.meta.env.MODE !== 'test';
if (shouldInitPreferencesWatchers) {
  setTimeout(() => {
    try {
      const nuxtApp = useNuxtApp();
      // Ensure Supabase plugin is initialized before accessing
      if (nuxtApp.$supabase) {
        const { $supabase } = nuxtApp;
        // Stop any existing watcher to avoid duplicates (HMR/login churn)
        if (stopUserWatch) {
          stopUserWatch();
          stopUserWatch = null;
        }
        stopUserWatch = watch(
          () => $supabase.user.loggedIn,
          async (newValue: boolean) => {
            // User store data now managed through Supabase listeners
            try {
              const resolvedPinia = pluginPinia ?? nuxtApp.$pinia;
              if (!resolvedPinia) return;
              const preferencesStore = usePreferencesStore(resolvedPinia);
              if (newValue && $supabase.user.id) {
                // Load user preferences from Supabase
                const { data, error } = await $supabase.client
                  .from('user_preferences')
                  .select('*')
                  .eq('user_id', $supabase.user.id)
                  .maybeSingle();
                if (error && error.code !== 'PGRST116') {
                  logger.error(
                    '[PreferencesStore] Error loading preferences from Supabase:',
                    error
                  );
                }
                if (data) {
                  logger.debug('[PreferencesStore] Loading preferences from Supabase:', data);
                  // Update store with server data using mapper
                  const nestedData = unflattenPreferences(data, preferencesDefaultState);
                  preferencesStore.$patch(nestedData);
                }
                // Set up sync to Supabase
                useSupabaseSync({
                  store: preferencesStore,
                  table: 'user_preferences',
                  debounceMs: 500,
                  transform: (state: unknown) => {
                    const preferencesState = state as PreferencesState;
                    logger.debug(
                      '[PreferencesStore] Transform called - preparing preferences for sync'
                    );
                    // Convert nested state to flat snake_case for Supabase
                    const flat = flattenPreferences(preferencesState);
                    return {
                      user_id: $supabase.user.id,
                      ...flat,
                    };
                  },
                });
              }
            } catch (_error) {
              logger.error(
                '[PreferencesStore] Error in preferencesStore watch for user.loggedIn:',
                _error
              );
            }
          },
          { immediate: true }
        );
        // HMR/route cleanup
        if (import.meta.hot) {
          import.meta.hot.dispose(() => {
            if (stopUserWatch) {
              stopUserWatch();
              stopUserWatch = null;
            }
          });
        }
      }
    } catch (error) {
      logger.error('[PreferencesStore] Error setting up preferences store watchers:', error);
    }
  }, 100);
}
