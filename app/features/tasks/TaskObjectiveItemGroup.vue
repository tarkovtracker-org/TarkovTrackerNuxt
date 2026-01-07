<template>
  <div class="space-y-2 px-2 py-2">
    <div class="flex items-start gap-4">
      <UIcon
        :name="`i-${iconName}`"
        aria-hidden="true"
        class="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400"
      />
      <div class="min-w-0 pt-0.5">
        <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ title }}</div>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <div
        v-for="row in consolidatedRows"
        :key="row.itemKey"
        class="flex max-w-full items-center gap-2 rounded-md border p-1 transition-colors"
        :class="[
          row.allComplete
            ? 'border-success-500/50 bg-success-100 text-success-900 dark:bg-success-500/10 dark:text-success-100'
            : 'border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5',
          isParentTaskLocked ? 'cursor-not-allowed opacity-70' : 'hover-effect cursor-pointer',
        ]"
        @click.stop="toggleCountForRow(row)"
      >
        <div v-if="row.meta.item || row.meta.itemIcon" class="relative shrink-0">
          <ItemStatusBadge
            :current-count="row.currentCount"
            :needed-count="row.meta.neededCount"
            :is-complete="row.allComplete"
            :found-in-raid="row.meta.foundInRaid"
            :is-craftable="isItemCraftable(row)"
            :craftable-title="getCraftableTitle(row)"
            :is-craftable-available="isItemCraftableAvailable(row)"
            :is-kappa-required="false"
            :show-count="false"
            size="sm"
            @craft="goToCraftStation(row)"
          />
          <GameItem :item="row.meta.item" size="medium" simple-mode />
        </div>
        <span
          v-tooltip="row.meta.itemFullName"
          class="max-w-[12rem] truncate text-xs font-medium text-gray-900 dark:text-gray-100"
        >
          {{ row.meta.itemName }}
        </span>
        <!-- External links to task guide -->
        <div v-if="getTaskForRow(row)" class="flex shrink-0 items-center gap-0.5" @click.stop>
          <a
            v-if="getTaskForRow(row)?.wikiLink"
            v-tooltip="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
            :href="`${getTaskForRow(row)?.wikiLink}#Guide`"
            target="_blank"
            rel="noopener noreferrer"
            class="hover-effect inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition-colors"
          >
            <img src="/img/logos/wikilogo.webp" alt="Wiki" aria-hidden="true" class="h-4 w-4" />
          </a>
          <a
            v-tooltip="t('page.tasks.questcard.viewOnTarkovDev', 'View on tarkov.dev')"
            :href="`https://tarkov.dev/task/${getTaskForRow(row)?.id}#objectives`"
            target="_blank"
            rel="noopener noreferrer"
            class="hover-effect inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition-colors"
          >
            <img
              src="/img/logos/tarkovdevlogo.webp"
              alt="tarkov.dev"
              aria-hidden="true"
              class="h-4 w-4"
            />
          </a>
        </div>
        <!-- Single set of controls per item - updates all related objectives together -->
        <span v-if="row.meta.neededCount > 1" @click.stop>
          <ObjectiveCountControls
            :current-count="row.currentCount"
            :needed-count="row.meta.neededCount"
            :disabled="isParentTaskLocked"
            @decrease="decreaseCountForRow(row)"
            @increase="increaseCountForRow(row)"
            @toggle="toggleCountForRow(row)"
            @set-count="(value) => setCountForRow(row, value)"
          />
        </span>
        <span v-else class="flex items-center" @click.stop>
          <ToggleButton
            :is-active="row.allComplete"
            :disabled="isParentTaskLocked"
            variant="complete"
            :active-icon="'i-mdi-check'"
            :inactive-icon="'i-mdi-circle-outline'"
            :tooltip="
              row.allComplete
                ? t('page.tasks.questcard.uncomplete', 'Uncomplete')
                : t('page.tasks.questcard.complete', 'Complete')
            "
            :aria-label="
              row.allComplete
                ? t('page.tasks.questcard.uncomplete', 'Uncomplete')
                : t('page.tasks.questcard.complete', 'Complete')
            "
            @toggle="toggleCountForRow(row)"
          />
        </span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import GameItem from '@/components/ui/GameItem.vue';
  import ItemStatusBadge from '@/components/ui/ItemStatusBadge.vue';
  import ToggleButton from '@/components/ui/ToggleButton.vue';
  import ObjectiveCountControls from '@/features/tasks/ObjectiveCountControls.vue';
  import { useMetadataStore, type CraftSource } from '@/stores/useMetadata';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { TaskObjective } from '@/types/tarkov';
  const props = defineProps<{
    title: string;
    iconName: string;
    objectives: TaskObjective[];
  }>();
  const { t } = useI18n({ useScope: 'global' });
  const tarkovStore = useTarkovStore();
  const progressStore = useProgressStore();
  const metadataStore = useMetadataStore();
  type ObjectiveMeta = {
    item?: {
      id?: string;
      name?: string;
      shortName?: string;
      iconLink?: string;
      image512pxLink?: string;
      image8xLink?: string;
      backgroundColor?: string;
      properties?: { defaultPreset?: unknown };
    };
    neededCount: number;
    currentCount: number;
    itemName: string;
    itemFullName: string;
    itemIcon?: string;
    backgroundColor?: string;
    foundInRaid: boolean;
  };
  type ObjectiveRow = {
    objective: TaskObjective;
    meta: ObjectiveMeta;
  };
  // Consolidated row groups objectives by item ID
  type ConsolidatedRow = {
    itemKey: string;
    meta: ObjectiveMeta;
    objectives: ObjectiveRow[];
    allComplete: boolean;
    currentCount: number;
  };
  const fullObjectives = computed(() => metadataStore.objectives);
  const objectiveMetaById = computed<Record<string, ObjectiveMeta>>(() => {
    const map: Record<string, ObjectiveMeta> = {};
    props.objectives.forEach((objective) => {
      const full = fullObjectives.value.find((o) => o.id === objective.id) as
        | TaskObjective
        | undefined;
      const neededCount = (full?.count ?? objective.count ?? 1) as number;
      const currentCount = tarkovStore.getObjectiveCount(objective.id);
      // Use item, markerItem, or questItem (quest items use questItem)
      const item =
        full?.item ||
        full?.items?.[0] ||
        full?.markerItem ||
        full?.questItem ||
        objective.item ||
        objective.items?.[0] ||
        objective.markerItem ||
        objective.questItem;
      // Use defaultPreset for image display when available (e.g., weapons with attachments)
      const imageItem = item?.properties?.defaultPreset || item;
      map[objective.id] = {
        item,
        neededCount,
        currentCount,
        itemName:
          item?.shortName ||
          item?.name ||
          objective.description ||
          t('page.tasks.questcard.item', 'Item'),
        itemFullName:
          item?.name ||
          item?.shortName ||
          objective.description ||
          t('page.tasks.questcard.item', 'Item'),
        itemIcon: imageItem?.image512pxLink || imageItem?.image8xLink || undefined,
        backgroundColor: imageItem?.backgroundColor || item?.backgroundColor,
        foundInRaid: full?.foundInRaid === true || objective.foundInRaid === true,
      };
    });
    return map;
  });
  const objectiveRows = computed<ObjectiveRow[]>(() => {
    return props.objectives.map((objective) => {
      const fallback: ObjectiveMeta = {
        item: undefined,
        neededCount: objective.count ?? 1,
        currentCount: tarkovStore.getObjectiveCount(objective.id),
        itemName: objective.description || t('page.tasks.questcard.item', 'Item'),
        itemFullName: objective.description || t('page.tasks.questcard.item', 'Item'),
        itemIcon: undefined,
        backgroundColor: undefined,
        foundInRaid: objective.foundInRaid === true,
      };
      return { objective, meta: objectiveMetaById.value[objective.id] ?? fallback };
    });
  });
  // Consolidate objectives by item ID - show one card per unique item
  const consolidatedRows = computed<ConsolidatedRow[]>(() => {
    const itemMap = new Map<string, ConsolidatedRow>();
    objectiveRows.value.forEach((row) => {
      // Use item, markerItem, or questItem ID (quest items use questItem)
      const itemId =
        row.objective.item?.id ||
        row.objective.items?.[0]?.id ||
        row.objective.markerItem?.id ||
        row.objective.questItem?.id;
      const foundInRaid = row.meta.foundInRaid;
      // Use item ID + foundInRaid as key, fallback to objective ID if no item
      const key = itemId ? `${itemId}:${foundInRaid ? 1 : 0}` : row.objective.id;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          itemKey: key,
          meta: { ...row.meta }, // Initial meta, will be aggregated below
          objectives: [],
          allComplete: true,
          currentCount: 0,
        });
      }
      const consolidated = itemMap.get(key)!;
      consolidated.objectives.push(row);
    });
    // Second pass to aggregate values
    // For find+give pairs, only count the "give" objectives since "find" is a passive check
    const findTypes = new Set(['findItem', 'findQuestItem']);
    const giveTypes = new Set(['giveItem', 'giveQuestItem']);
    return Array.from(itemMap.values()).map((consolidated) => {
      let allComplete = true;
      const firstRow = consolidated.objectives[0];
      if (!firstRow) return consolidated;
      // Separate objectives by type
      const findObjectives = consolidated.objectives.filter((row) =>
        findTypes.has(row.objective.type ?? '')
      );
      const giveObjectives = consolidated.objectives.filter((row) =>
        giveTypes.has(row.objective.type ?? '')
      );
      // Determine which objectives to count for the total
      // If we have give objectives, use those (find is just a passive check)
      // If we only have find objectives, use those
      const objectivesToCount =
        giveObjectives.length > 0
          ? giveObjectives
          : findObjectives.length > 0
            ? findObjectives
            : consolidated.objectives;
      let totalCurrent = 0;
      let totalNeeded = 0;
      objectivesToCount.forEach((row) => {
        totalCurrent += row.meta.currentCount;
        totalNeeded += row.meta.neededCount;
      });
      // Check completion status across ALL objectives (both find and give must be complete)
      consolidated.objectives.forEach((row) => {
        if (!isObjectiveComplete(row.objective.id)) {
          allComplete = false;
        }
      });
      return {
        ...consolidated,
        allComplete,
        currentCount: totalCurrent,
        meta: {
          ...firstRow.meta,
          neededCount: totalNeeded,
          currentCount: totalCurrent,
        },
      };
    });
  });
  const isObjectiveComplete = (objectiveId: string) => {
    return tarkovStore.isTaskObjectiveComplete(objectiveId);
  };
  const getObjectiveTaskId = (objective: TaskObjective): string | undefined => {
    return (
      objective.taskId ?? fullObjectives.value.find((entry) => entry.id === objective.id)?.taskId
    );
  };
  const getTaskForRow = (row: ConsolidatedRow) => {
    const firstObjective = row.objectives[0]?.objective;
    if (!firstObjective) return undefined;
    const taskId = getObjectiveTaskId(firstObjective);
    if (!taskId) return undefined;
    return metadataStore.tasks.find((t) => t.id === taskId);
  };
  // Craftable item helpers
  const getItemIdForRow = (row: ConsolidatedRow): string | undefined => {
    return row.meta.item?.id;
  };
  const getCraftSourcesForRow = (row: ConsolidatedRow): CraftSource[] => {
    const itemId = getItemIdForRow(row);
    if (!itemId) return [];
    return metadataStore.craftSourcesByItemId.get(itemId) ?? [];
  };
  const isItemCraftable = (row: ConsolidatedRow): boolean => {
    return getCraftSourcesForRow(row).length > 0;
  };
  const isItemCraftableAvailable = (row: ConsolidatedRow): boolean => {
    const sources = getCraftSourcesForRow(row);
    if (sources.length === 0) return false;
    return sources.some((source) => {
      const currentLevel = progressStore.hideoutLevels?.[source.stationId]?.self ?? 0;
      return currentLevel >= source.stationLevel;
    });
  };
  const getCraftableTitle = (row: ConsolidatedRow): string => {
    const sources = getCraftSourcesForRow(row);
    if (sources.length === 0) return '';
    const statuses = sources.map((source) => {
      const currentLevel = progressStore.hideoutLevels?.[source.stationId]?.self ?? 0;
      const isAvailable = currentLevel >= source.stationLevel;
      return { ...source, currentLevel, isAvailable };
    });
    const sorted = [...statuses].sort((a, b) => {
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
    const isAvailable = statuses.some((s) => s.isAvailable);
    return isAvailable ? `Craftable at ${list}` : `Requires ${list}`;
  };
  const goToCraftStation = async (row: ConsolidatedRow) => {
    const sources = getCraftSourcesForRow(row);
    if (sources.length === 0) return;
    const statuses = sources.map((source) => {
      const currentLevel = progressStore.hideoutLevels?.[source.stationId]?.self ?? 0;
      const isAvailable = currentLevel >= source.stationLevel;
      return {
        ...source,
        currentLevel,
        isAvailable,
        missingLevels: Math.max(0, source.stationLevel - currentLevel),
      };
    });
    // Prefer available stations, sorted by level (lowest first)
    const available = statuses
      .filter((s) => s.isAvailable)
      .sort((a, b) => a.stationLevel - b.stationLevel);
    let targetId = available[0]?.stationId;
    if (!targetId) {
      // Find the closest to being available
      const closest = [...statuses].sort((a, b) => {
        if (a.missingLevels !== b.missingLevels) return a.missingLevels - b.missingLevels;
        return a.stationLevel - b.stationLevel;
      });
      targetId = closest[0]?.stationId ?? sources[0]?.stationId;
    }
    if (targetId) {
      await navigateTo({ path: '/hideout', query: { station: targetId } });
    }
  };
  const parentTaskIds = computed(() => {
    const ids = new Set<string>();
    props.objectives.forEach((objective) => {
      const taskId = getObjectiveTaskId(objective);
      if (taskId) {
        ids.add(taskId);
      }
    });
    return Array.from(ids);
  });
  const _isParentTaskComplete = computed(() => {
    return parentTaskIds.value.some(
      (taskId) => tarkovStore.isTaskComplete(taskId) && !tarkovStore.isTaskFailed(taskId)
    );
  });
  const _isParentTaskFailed = computed(() => {
    return parentTaskIds.value.some((taskId) => tarkovStore.isTaskFailed(taskId));
  });
  const isParentTaskLocked = computed(() => {
    if (parentTaskIds.value.length === 0) return false;
    // If ANY associated task is NOT available (locked, complete, failed, or blocked),
    // we consider the group locked for safety. Usually these are all the same task anyway.
    return parentTaskIds.value.some((taskId) => {
      const isUnlocked = progressStore.unlockedTasks[taskId]?.self === true;
      const isComplete = tarkovStore.isTaskComplete(taskId);
      const isFailed = tarkovStore.isTaskFailed(taskId);
      const isInvalid = progressStore.invalidTasks[taskId]?.self === true;
      return !isUnlocked || isComplete || isFailed || isInvalid;
    });
  });
  // Update all objectives in a row together
  const decreaseCountForRow = (row: ConsolidatedRow) => {
    if (isParentTaskLocked.value) return;
    if (row.currentCount <= 0) return;
    // Find the last objective with progress and decrement it
    for (let i = row.objectives.length - 1; i >= 0; i--) {
      const obj = row.objectives[i];
      if (!obj) continue;
      if (obj.meta.currentCount > 0) {
        const newCount = obj.meta.currentCount - 1;
        tarkovStore.setObjectiveCount(obj.objective.id, newCount);
        if (newCount < obj.meta.neededCount && isObjectiveComplete(obj.objective.id)) {
          tarkovStore.setTaskObjectiveUncomplete(obj.objective.id);
        }
        break;
      }
    }
  };
  const increaseCountForRow = (row: ConsolidatedRow) => {
    if (isParentTaskLocked.value) return;
    if (row.currentCount >= row.meta.neededCount) return;
    // Find the first objective that isn't complete and increment it
    for (const obj of row.objectives) {
      if (obj.meta.currentCount < obj.meta.neededCount) {
        const newCount = obj.meta.currentCount + 1;
        tarkovStore.setObjectiveCount(obj.objective.id, newCount);
        if (newCount >= obj.meta.neededCount && !isObjectiveComplete(obj.objective.id)) {
          tarkovStore.setTaskObjectiveComplete(obj.objective.id);
        }
        break;
      }
    }
  };
  const toggleCountForRow = (row: ConsolidatedRow) => {
    if (isParentTaskLocked.value) return;
    const isAllComplete = row.allComplete;
    if (isAllComplete) {
      // Set all to 0
      row.objectives.forEach((obj) => {
        tarkovStore.setObjectiveCount(obj.objective.id, 0);
        if (isObjectiveComplete(obj.objective.id)) {
          tarkovStore.setTaskObjectiveUncomplete(obj.objective.id);
        }
      });
    } else {
      // Set all to their needed count
      row.objectives.forEach((obj) => {
        tarkovStore.setObjectiveCount(obj.objective.id, obj.meta.neededCount);
        if (!isObjectiveComplete(obj.objective.id)) {
          tarkovStore.setTaskObjectiveComplete(obj.objective.id);
        }
      });
    }
  };
  /**
   * Set count to a specific value for a consolidated row (from direct input)
   * Distributes the count across objectives in the row
   */
  const setCountForRow = (row: ConsolidatedRow, newCount: number) => {
    if (isParentTaskLocked.value) return;
    const totalNeeded = row.meta.neededCount;
    const clampedCount = Math.max(0, Math.min(totalNeeded, newCount));
    // Distribute the count across objectives
    let remaining = clampedCount;
    row.objectives.forEach((obj) => {
      const objNeeded = obj.meta.neededCount;
      const objCount = Math.min(remaining, objNeeded);
      tarkovStore.setObjectiveCount(obj.objective.id, objCount);
      // Update completion status
      if (objCount >= objNeeded && !isObjectiveComplete(obj.objective.id)) {
        tarkovStore.setTaskObjectiveComplete(obj.objective.id);
      } else if (objCount < objNeeded && isObjectiveComplete(obj.objective.id)) {
        tarkovStore.setTaskObjectiveUncomplete(obj.objective.id);
      }
      remaining -= objCount;
    });
  };
</script>
