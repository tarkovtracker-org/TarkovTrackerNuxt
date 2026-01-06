import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useMetadataStore, type CraftSource } from '@/stores/useMetadata';
import { useProgressStore } from '@/stores/useProgress';
import { logger } from '@/utils/logger';
export interface CraftSourceStatus extends CraftSource {
  currentLevel: number;
  isAvailable: boolean;
  missingLevels: number;
}
export interface UseCraftableItemReturn {
  craftSources: ComputedRef<CraftSource[]>;
  isCraftable: ComputedRef<boolean>;
  craftSourceStatuses: ComputedRef<CraftSourceStatus[]>;
  isCraftableAvailable: ComputedRef<boolean>;
  craftStationTargetId: ComputedRef<string>;
  /** Pre-computed URL for linking to the craft station in hideout */
  craftStationHref: ComputedRef<string>;
  craftableIconClass: ComputedRef<string>;
  craftableTitle: ComputedRef<string>;
  goToCraftStation: () => Promise<void>;
}
/**
 * Composable for craftable item logic.
 * Provides craft source information, availability status, and navigation.
 *
 * @param itemId - Reactive or raw item ID to check craftability
 * @returns Craftable item state and actions
 */
export function useCraftableItem(
  itemId: MaybeRefOrGetter<string | undefined>
): UseCraftableItemReturn {
  const metadataStore = useMetadataStore();
  const progressStore = useProgressStore();
  const craftSources = computed(() => {
    const currentItemId = toValue(itemId);
    if (!currentItemId) {
      return [];
    }
    return metadataStore.craftSourcesByItemId.get(currentItemId) ?? [];
  });
  const isCraftable = computed(() => craftSources.value.length > 0);
  const craftSourceStatuses = computed((): CraftSourceStatus[] => {
    return craftSources.value.map((source) => {
      const currentLevel = progressStore.hideoutLevels?.[source.stationId]?.self ?? 0;
      return {
        ...source,
        currentLevel,
        isAvailable: currentLevel >= source.stationLevel,
        missingLevels: Math.max(0, source.stationLevel - currentLevel),
      };
    });
  });
  const isCraftableAvailable = computed(() => {
    return craftSourceStatuses.value.some((source) => source.isAvailable);
  });
  const craftStationTargetId = computed(() => {
    if (!isCraftable.value) {
      return '';
    }
    // Prefer available stations, sorted by level (lowest first)
    const available = craftSourceStatuses.value
      .filter((source) => source.isAvailable)
      .sort((a, b) => a.stationLevel - b.stationLevel);
    if (available.length > 0) {
      return available[0]?.stationId ?? '';
    }
    // Otherwise, find the closest to being available
    // Sort a spread copy to avoid mutation: fewest missingLevels first, then lowest stationLevel.
    const closest = [...craftSourceStatuses.value].sort((a, b) => {
      if (a.missingLevels !== b.missingLevels) {
        return a.missingLevels - b.missingLevels;
      }
      return a.stationLevel - b.stationLevel;
    });
    return closest[0]?.stationId ?? craftSources.value[0]?.stationId ?? '';
  });
  const craftableIconClass = computed(() => {
    if (!isCraftable.value) {
      return '';
    }
    return isCraftableAvailable.value
      ? 'text-success-600 dark:text-success-400'
      : 'text-surface-400';
  });
  /**
   * Pre-computed URL for the craft station in hideout.
   * Includes the view param based on station availability so the station is visible.
   */
  const craftStationHref = computed(() => {
    if (!craftStationTargetId.value) {
      return '';
    }
    // Set view based on whether the target station is available or locked
    const view = isCraftableAvailable.value ? 'available' : 'locked';
    return `/hideout?station=${craftStationTargetId.value}&view=${view}`;
  });
  const craftableTitle = computed(() => {
    if (!isCraftable.value) {
      return '';
    }
    // Sort to show available options first
    const sorted = [...craftSourceStatuses.value].sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      return a.stationLevel - b.stationLevel;
    });
    const lines = sorted.slice(0, 3).map((source) => {
      if (source.isAvailable) {
        return `${source.stationName} level ${source.stationLevel}`;
      }
      return `${source.stationName} level ${source.stationLevel} (current: ${source.currentLevel})`;
    });
    const remainingCount = sorted.length - lines.length;
    if (remainingCount > 0) {
      lines.push(`+${remainingCount} more`);
    }
    const list = lines.join(', ');
    if (isCraftableAvailable.value) {
      return `Craftable at ${list}`;
    }
    return `Requires ${list}`;
  });
  const goToCraftStation = async () => {
    if (!craftStationTargetId.value) {
      return;
    }
    try {
      await navigateTo({
        path: '/hideout',
        query: { 
          station: craftStationTargetId.value,
          view: isCraftableAvailable.value ? 'available' : 'locked' 
        },
      });
    } catch (error) {
      const stationId = craftStationTargetId.value;
      const message = `[useCraftableItem] Failed to navigate to craft station (stationId: ${stationId}).`;
      logger.error(message, { stationId, error });
      throw new Error(message, { cause: error });
    }
  };
  return {
    craftSources,
    isCraftable,
    craftSourceStatuses,
    isCraftableAvailable,
    craftStationTargetId,
    craftStationHref,
    craftableIconClass,
    craftableTitle,
    goToCraftStation,
  };
}
