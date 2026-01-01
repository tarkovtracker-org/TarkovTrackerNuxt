import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useMetadataStore } from '@/stores/useMetadata';
import { usePreferencesStore } from '@/stores/usePreferences';
import { useProgressStore } from '@/stores/useProgress';
import type { HideoutStation } from '@/types/tarkov';
import { logger } from '@/utils/logger';
export function useHideoutFiltering() {
  const metadataStore = useMetadataStore();
  const { hideoutStations, hideoutLoading } = storeToRefs(metadataStore);
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  // Active primary view (available, maxed, locked, all)
  const activePrimaryView = computed({
    get: () => preferencesStore.getHideoutPrimaryView,
    set: (value) => preferencesStore.setHideoutPrimaryView(value),
  });
  // Helper to determine if a station is available for upgrade
  const isStationAvailable = (station: HideoutStation): boolean => {
    const lvl = progressStore.hideoutLevels?.[station.id]?.self || 0;
    const nextLevelData = station.levels.find((l) => l.level === lvl + 1);
    if (!nextLevelData) return false;
    return nextLevelData.stationLevelRequirements.every(
      (req) => (progressStore.hideoutLevels?.[req.station.id]?.self || 0) >= req.level
    );
  };
  // Helper to determine if a station is maxed
  const isStationMaxed = (station: HideoutStation): boolean => {
    return (progressStore.hideoutLevels?.[station.id]?.self || 0) === station.levels.length;
  };
  // Helper to determine if a station is locked
  const isStationLocked = (station: HideoutStation): boolean => {
    const lvl = progressStore.hideoutLevels?.[station.id]?.self || 0;
    const nextLevelData = station.levels.find((l) => l.level === lvl + 1);
    if (!nextLevelData) return false;
    return !nextLevelData.stationLevelRequirements.every(
      (req) => (progressStore.hideoutLevels?.[req.station.id]?.self || 0) >= req.level
    );
  };
  // Calculate station counts for each filter
  const stationCounts = computed(() => {
    const counts = {
      available: 0,
      maxed: 0,
      locked: 0,
      all: 0,
    };
    if (!hideoutStations.value || hideoutStations.value.length === 0) {
      return counts;
    }
    const stationList = hideoutStations.value as HideoutStation[];
    counts.all = stationList.length;
    for (const station of stationList) {
      if (isStationMaxed(station)) {
        counts.maxed++;
      } else if (isStationAvailable(station)) {
        counts.available++;
      } else if (isStationLocked(station)) {
        counts.locked++;
      }
    }
    return counts;
  });
  // Comprehensive loading check
  const isStoreLoading = computed(() => {
    try {
      // Check if store is ready
      if (!metadataStore.hasInitialized) return true;
      // Check if hideout data is still loading
      if (hideoutLoading.value) return true;
      // Check if we have hideout stations data
      if (!hideoutStations.value || hideoutStations.value.length === 0) {
        return true;
      }
      // Check if progress store team data is ready
      // We don't block on visibleTeamStores being empty anymore, as it might be intentional
      // if the user has hidden all teams (including self, though that should be prevented)
      if (!progressStore.visibleTeamStores) {
        return true;
      }
      // Remove the hideoutLevels check as it creates a circular dependency
      // The hideoutLevels computed property needs both hideout stations AND team stores
      // Since we've already verified both are available above, we can proceed
      return false;
    } catch (error) {
      logger.error('[useHideoutFiltering] Error in hideout loading check:', error);
      // Return false to prevent stuck loading state on error
      return false;
    }
  });
  // Filter stations based on current view
  const visibleStations = computed(() => {
    try {
      // Use the comprehensive loading check - don't render until everything is ready
      if (isStoreLoading.value) {
        return [];
      }
      const hideoutStationList = hideoutStations.value as HideoutStation[];
      // Display all upgradeable stations
      if (activePrimaryView.value === 'available') {
        return hideoutStationList.filter(isStationAvailable);
      }
      // Display all maxed stations
      if (activePrimaryView.value === 'maxed') {
        return hideoutStationList.filter(isStationMaxed);
      }
      // Display all locked stations
      if (activePrimaryView.value === 'locked') {
        return hideoutStationList.filter(isStationLocked);
      }
      // Display all stations
      if (activePrimaryView.value === 'all') return hideoutStationList;
      return hideoutStationList;
    } catch (error) {
      logger.error('[useHideoutFiltering] Error computing visible stations:', error);
      // Return empty array on error to prevent stuck states
      return [];
    }
  });
  return {
    activePrimaryView,
    isStoreLoading,
    visibleStations,
    stationCounts,
  };
}
