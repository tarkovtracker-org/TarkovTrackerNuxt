import 'pinia-plugin-persistedstate';
import { defineStore } from 'pinia';
import { watch } from 'vue';
import { useSupabaseSync } from '@/composables/supabase/useSupabaseSync';
import { pinia as pluginPinia } from '@/plugins/01.pinia.client';
import { logger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/utils/storageKeys';
import { useNuxtApp } from '#imports';
// Define the state structure
export interface PreferencesState {
  streamerMode: boolean;
  teamHide: Record<string, boolean>;
  taskTeamHideAll: boolean;
  itemsTeamHideAll: boolean;
  itemsTeamHideNonFIR: boolean;
  itemsTeamHideHideout: boolean;
  mapTeamHideAll: boolean;
  taskPrimaryView: string | null;
  taskMapView: string | null;
  taskTraderView: string | null;
  taskSecondaryView: string | null;
  taskUserView: string | null;
  neededTypeView: string | null;
  itemsHideNonFIR: boolean;
  hideGlobalTasks: boolean;
  hideNonKappaTasks: boolean;
  neededitemsStyle: string | null;
  hideoutPrimaryView?: string | null;
  localeOverride: string | null;
  theme: 'system' | 'light' | 'dark';
  // Task filter settings
  showNonSpecialTasks: boolean;
  showEodTasks: boolean;
  showLightkeeperTasks: boolean;
  // Task appearance settings
  showRequiredLabels: boolean;
  showNotRequiredLabels: boolean;
  showExperienceRewards: boolean;
  showTaskIds: boolean;
  showNextQuests: boolean;
  showPreviousQuests: boolean;
  taskCardDensity: 'comfortable' | 'compact';
  enableManualTaskFail: boolean;
  // XP and Level settings
  useAutomaticLevelCalculation: boolean;
  // Holiday effects
  enableHolidayEffects: boolean;
  // Map display settings
  showMapExtracts: boolean;
  saving?: {
    streamerMode: boolean;
    hideGlobalTasks: boolean;
    hideNonKappaTasks: boolean;
    itemsNeededHideNonFIR: boolean;
  };
}
// Export the default state with type annotation
export const preferencesDefaultState: PreferencesState = {
  streamerMode: false,
  teamHide: {},
  taskTeamHideAll: false,
  itemsTeamHideAll: false,
  itemsTeamHideNonFIR: false,
  itemsTeamHideHideout: false,
  mapTeamHideAll: false,
  taskPrimaryView: null,
  taskMapView: null,
  taskTraderView: null,
  taskSecondaryView: null,
  taskUserView: null,
  neededTypeView: null,
  itemsHideNonFIR: false,
  hideGlobalTasks: false,
  hideNonKappaTasks: false,
  neededitemsStyle: null,
  hideoutPrimaryView: null,
  localeOverride: null,
  theme: 'system', // Default to system to respect OS preference
  // Task filter settings (all shown by default)
  showNonSpecialTasks: true,
  showEodTasks: true,
  showLightkeeperTasks: true,
  // Task appearance settings
  showRequiredLabels: true,
  showNotRequiredLabels: true,
  showExperienceRewards: true,
  showTaskIds: true,
  showNextQuests: true,
  showPreviousQuests: true,
  taskCardDensity: 'compact',
  enableManualTaskFail: false,
  // XP and Level settings
  useAutomaticLevelCalculation: false,
  // Holiday effects (enabled by default during holiday season)
  enableHolidayEffects: true,
  // Map display settings
  showMapExtracts: true,
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
      return state.streamerMode ?? false;
    },
    teamIsHidden: (state) => {
      return (teamId: string): boolean => {
        // Always show self unless explicitly hidden (though self shouldn't be hidden usually)
        // But definitely don't let "Hide All" hide self
        if (teamId === 'self') {
          return state.teamHide?.[teamId] || false;
        }
        const isHidden = state.taskTeamHideAll || state.teamHide?.[teamId] || false;
        if (isHidden) {
          logger.debug('[PreferencesStore] Teammate is hidden:', {
            teamId,
            taskTeamHideAll: state.taskTeamHideAll,
            individuallyHidden: state.teamHide?.[teamId],
          });
        }
        return isHidden;
      };
    },
    taskTeamAllHidden: (state) => {
      return state.taskTeamHideAll ?? false;
    },
    itemsTeamAllHidden: (state) => {
      return state.itemsTeamHideAll ?? false;
    },
    itemsTeamNonFIRHidden: (state) => {
      return state.itemsTeamHideAll || state.itemsTeamHideNonFIR || false;
    },
    itemsTeamHideoutHidden: (state) => {
      return state.itemsTeamHideAll || state.itemsTeamHideHideout || false;
    },
    mapTeamAllHidden: (state) => {
      return state.mapTeamHideAll ?? false;
    },
    // Add default values for views using nullish coalescing and validation
    getTaskPrimaryView: (state) => {
      const valid = ['all', 'traders', 'maps'];
      const val = state.taskPrimaryView;
      return val && valid.includes(val) ? val : 'all';
    },
    getTaskMapView: (state) => {
      return state.taskMapView ?? 'all';
    },
    getTaskTraderView: (state) => {
      return state.taskTraderView ?? 'all';
    },
    getTaskSecondaryView: (state) => {
      const valid = ['all', 'available', 'locked', 'completed', 'failed'];
      const val = state.taskSecondaryView;
      return val && valid.includes(val) ? val : 'available';
    },
    getTaskUserView: (state) => {
      return state.taskUserView ?? 'self';
    },
    getNeededTypeView: (state) => {
      const valid = ['all', 'tasks', 'hideout', 'completed'];
      const val = state.neededTypeView;
      return val && valid.includes(val) ? val : 'all';
    },
    itemsNeededHideNonFIR: (state) => {
      return state.itemsHideNonFIR ?? false;
    },
    getHideGlobalTasks: (state) => {
      return state.hideGlobalTasks ?? false;
    },
    getHideNonKappaTasks: (state) => {
      return state.hideNonKappaTasks ?? false;
    },
    getNeededItemsStyle: (state) => {
      return state.neededitemsStyle ?? 'mediumCard';
    },
    getHideoutPrimaryView: (state) => {
      const valid = ['all', 'available', 'maxed', 'locked'];
      const val = state.hideoutPrimaryView;
      return val && valid.includes(val) ? val : 'available';
    },
    getLocaleOverride: (state) => {
      return state.localeOverride ?? null;
    },
    getTheme: (state) => {
      return state.theme ?? 'dark';
    },
    // Task filter getters
    getShowNonSpecialTasks: (state) => {
      return state.showNonSpecialTasks ?? true;
    },
    getShowEodTasks: (state) => {
      return state.showEodTasks ?? true;
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
    getUseAutomaticLevelCalculation: (state) => {
      return state.useAutomaticLevelCalculation ?? false;
    },
    getEnableHolidayEffects: (state) => {
      return state.enableHolidayEffects ?? true;
    },
    // Map display getters
    getShowMapExtracts: (state) => {
      return state.showMapExtracts ?? true;
    },
  },
  actions: {
    setStreamerMode(mode: boolean) {
      this.streamerMode = mode;
    },
    toggleHidden(teamId: string) {
      if (!this.teamHide) {
        this.teamHide = {};
      }
      this.teamHide[teamId] = !this.teamHide[teamId];
    },
    setQuestTeamHideAll(hide: boolean) {
      this.taskTeamHideAll = hide;
    },
    setItemsTeamHideAll(hide: boolean) {
      this.itemsTeamHideAll = hide;
    },
    setItemsTeamHideNonFIR(hide: boolean) {
      this.itemsTeamHideNonFIR = hide;
    },
    setItemsTeamHideHideout(hide: boolean) {
      this.itemsTeamHideHideout = hide;
    },
    setMapTeamHideAll(hide: boolean) {
      this.mapTeamHideAll = hide;
    },
    setTaskPrimaryView(view: string) {
      this.taskPrimaryView = view;
    },
    setTaskMapView(view: string) {
      this.taskMapView = view;
    },
    setTaskTraderView(view: string) {
      this.taskTraderView = view;
    },
    setTaskSecondaryView(view: string) {
      this.taskSecondaryView = view;
    },
    setTaskUserView(view: string) {
      this.taskUserView = view;
    },
    setNeededTypeView(view: string) {
      this.neededTypeView = view;
    },
    setItemsNeededHideNonFIR(hide: boolean) {
      this.itemsHideNonFIR = hide;
      // Persistence handled automatically by plugin
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.itemsNeededHideNonFIR = true;
    },
    setHideGlobalTasks(hide: boolean) {
      this.hideGlobalTasks = hide;
      // Persistence handled automatically by plugin
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideGlobalTasks = true;
    },
    setHideNonKappaTasks(hide: boolean) {
      this.hideNonKappaTasks = hide;
      // Persistence handled automatically by plugin
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideNonKappaTasks = true;
    },
    setNeededItemsStyle(style: string) {
      this.neededitemsStyle = style;
    },
    setHideoutPrimaryView(view: string) {
      this.hideoutPrimaryView = view;
    },
    setLocaleOverride(locale: string | null) {
      this.localeOverride = locale;
    },
    setTheme(theme: 'system' | 'light' | 'dark') {
      this.theme = theme;
    },
    // Task filter actions
    setShowNonSpecialTasks(show: boolean) {
      this.showNonSpecialTasks = show;
    },
    setShowEodTasks(show: boolean) {
      this.showEodTasks = show;
    },
    setShowLightkeeperTasks(show: boolean) {
      this.showLightkeeperTasks = show;
    },
    // Task appearance actions
    setShowRequiredLabels(show: boolean) {
      this.showRequiredLabels = show;
    },
    setShowNotRequiredLabels(show: boolean) {
      this.showNotRequiredLabels = show;
    },
    setShowExperienceRewards(show: boolean) {
      this.showExperienceRewards = show;
    },
    setShowTaskIds(show: boolean) {
      this.showTaskIds = show;
    },
    setShowNextQuests(show: boolean) {
      this.showNextQuests = show;
    },
    setShowPreviousQuests(show: boolean) {
      this.showPreviousQuests = show;
    },
    setTaskCardDensity(density: 'comfortable' | 'compact') {
      this.taskCardDensity = density;
    },
    setEnableManualTaskFail(enable: boolean) {
      this.enableManualTaskFail = enable;
    },
    setUseAutomaticLevelCalculation(use: boolean) {
      this.useAutomaticLevelCalculation = use;
    },
    setEnableHolidayEffects(enable: boolean) {
      this.enableHolidayEffects = enable;
    },
    // Map display actions
    setShowMapExtracts(show: boolean) {
      this.showMapExtracts = show;
    },
  },
  // Enable automatic localStorage persistence
  persist: {
    key: STORAGE_KEYS.preferences, // LocalStorage key for user preference data
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    // Use serializer instead of paths for selective persistence
    serializer: {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
    // Pick specific properties to persist (excluding transient state)
    pick: [
      'streamerMode',
      'teamHide',
      'taskTeamHideAll',
      'itemsTeamHideAll',
      'itemsTeamHideNonFIR',
      'itemsTeamHideHideout',
      'mapTeamHideAll',
      'taskPrimaryView',
      'taskMapView',
      'taskTraderView',
      'taskSecondaryView',
      'taskUserView',
      'neededTypeView',
      'itemsHideNonFIR',
      'hideGlobalTasks',
      'hideNonKappaTasks',
      'neededitemsStyle',
      'hideoutPrimaryView',
      'localeOverride',
      'theme',
      // Task filter settings
      'showNonSpecialTasks',
      'showEodTasks',
      'showLightkeeperTasks',
      // Task appearance settings
      'showRequiredLabels',
      'showNotRequiredLabels',
      'showExperienceRewards',
      'showTaskIds',
      'showNextQuests',
      'showPreviousQuests',
      'taskCardDensity',
      'enableManualTaskFail',
      'useAutomaticLevelCalculation',
      'enableHolidayEffects',
      'showMapExtracts',
    ],
  },
});
export type PreferencesStore = ReturnType<typeof usePreferencesStore>;
// Watch for Supabase user state changing
let stopUserWatch: (() => void) | null = null;
if (import.meta.client) {
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
                  // Update store with server data
                  Object.keys(data).forEach((key) => {
                    if (key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
                      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
                        letter.toUpperCase()
                      );
                      if (camelKey in preferencesStore.$state) {
                        // Fix type issue by casting through unknown first
                        (preferencesStore.$state as unknown as Record<string, unknown>)[camelKey] =
                          data[key];
                      }
                    }
                  });
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
                    // Convert camelCase to snake_case for Supabase
                    return {
                      user_id: $supabase.user.id,
                      streamer_mode: preferencesState.streamerMode,
                      team_hide: preferencesState.teamHide,
                      task_team_hide_all: preferencesState.taskTeamHideAll,
                      items_team_hide_all: preferencesState.itemsTeamHideAll,
                      items_team_hide_non_fir: preferencesState.itemsTeamHideNonFIR,
                      items_team_hide_hideout: preferencesState.itemsTeamHideHideout,
                      map_team_hide_all: preferencesState.mapTeamHideAll,
                      task_primary_view: preferencesState.taskPrimaryView,
                      task_map_view: preferencesState.taskMapView,
                      task_trader_view: preferencesState.taskTraderView,
                      task_secondary_view: preferencesState.taskSecondaryView,
                      task_user_view: preferencesState.taskUserView,
                      needed_type_view: preferencesState.neededTypeView,
                      items_hide_non_fir: preferencesState.itemsHideNonFIR,
                      hide_global_tasks: preferencesState.hideGlobalTasks,
                      hide_non_kappa_tasks: preferencesState.hideNonKappaTasks,
                      neededitems_style: preferencesState.neededitemsStyle,
                      hideout_primary_view: preferencesState.hideoutPrimaryView,
                      locale_override: preferencesState.localeOverride,
                      enable_manual_task_fail: preferencesState.enableManualTaskFail,
                      use_automatic_level_calculation:
                        preferencesState.useAutomaticLevelCalculation,
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
