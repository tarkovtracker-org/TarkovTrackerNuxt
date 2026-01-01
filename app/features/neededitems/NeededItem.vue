<template>
  <template v-if="props.itemStyle == 'card'">
    <div class="h-full">
      <LazyNeededItemSmallCard
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
        @set-count="setCount"
      />
    </div>
  </template>
  <template v-else-if="props.itemStyle == 'row'">
    <div class="w-full pt-1">
      <LazyNeededItemRow
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
        @set-count="setCount"
      />
    </div>
  </template>
</template>
<script setup lang="ts">
  import { computed, provide } from 'vue';
  import { neededItemKey, type NeededItemTeamNeed } from '@/features/neededitems/neededitem-keys';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  const props = defineProps({
    need: {
      type: Object,
      required: true,
    },
    itemStyle: {
      type: String,
      default: 'mediumCard',
    },
  });
  const progressStore = useProgressStore();
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  const tasks = computed(() => metadataStore.tasks);
  const hideoutStations = computed(() => metadataStore.hideoutStations);
  const alternativeTasks = computed(() => metadataStore.alternativeTasks);
  // Emit functions to update the user's progress towards the need
  // the child functions emit these functions and we watch for them here
  const decreaseCount = () => {
    if (props.need.needType == 'taskObjective') {
      if (currentCount.value > 0) {
        const newCount = currentCount.value - 1;
        tarkovStore.setObjectiveCount(props.need.id, newCount);
        // If we drop below needed count and objective was complete, uncomplete it
        if (newCount < neededCount.value && tarkovStore.isTaskObjectiveComplete(props.need.id)) {
          tarkovStore.setTaskObjectiveUncomplete(props.need.id);
        }
      }
    } else if (props.need.needType == 'hideoutModule') {
      if (currentCount.value > 0) {
        const newCount = currentCount.value - 1;
        tarkovStore.setHideoutPartCount(props.need.id, newCount);
        // If we drop below needed count and module was complete, uncomplete it
        // Note: Hideout modules are complex, usually parts contribute to a module.
        // If this is a part, we might want to uncomplete the part?
        // The store has setHideoutPartUncomplete.
        if (newCount < neededCount.value && tarkovStore.isHideoutPartComplete(props.need.id)) {
          tarkovStore.setHideoutPartUncomplete(props.need.id);
        }
      }
    }
  };
  const increaseCount = () => {
    if (props.need.needType == 'taskObjective') {
      if (currentCount.value < neededCount.value) {
        const newCount = currentCount.value + 1;
        tarkovStore.setObjectiveCount(props.need.id, newCount);
        // If we reach needed count, mark objective as complete
        if (newCount >= neededCount.value && !tarkovStore.isTaskObjectiveComplete(props.need.id)) {
          tarkovStore.setTaskObjectiveComplete(props.need.id);
        }
      }
    } else if (props.need.needType == 'hideoutModule') {
      if (currentCount.value < neededCount.value) {
        const newCount = currentCount.value + 1;
        tarkovStore.setHideoutPartCount(props.need.id, newCount);
        // If we reach needed count, mark part as complete
        if (newCount >= neededCount.value && !tarkovStore.isHideoutPartComplete(props.need.id)) {
          tarkovStore.setHideoutPartComplete(props.need.id);
        }
      }
    }
  };
  const toggleCount = () => {
    if (props.need.needType == 'taskObjective') {
      if (currentCount.value === 0) {
        tarkovStore.setObjectiveCount(props.need.id, neededCount.value);
        tarkovStore.setTaskObjectiveComplete(props.need.id);
      } else if (currentCount.value === neededCount.value) {
        tarkovStore.setObjectiveCount(props.need.id, Math.max(0, neededCount.value - 1));
        tarkovStore.setTaskObjectiveUncomplete(props.need.id);
      } else {
        tarkovStore.setObjectiveCount(props.need.id, neededCount.value);
        tarkovStore.setTaskObjectiveComplete(props.need.id);
      }
    } else if (props.need.needType == 'hideoutModule') {
      if (currentCount.value === 0) {
        tarkovStore.setHideoutPartCount(props.need.id, neededCount.value);
        tarkovStore.setHideoutPartComplete(props.need.id);
      } else if (currentCount.value === neededCount.value) {
        tarkovStore.setHideoutPartCount(props.need.id, Math.max(0, neededCount.value - 1));
        tarkovStore.setHideoutPartUncomplete(props.need.id);
      } else {
        tarkovStore.setHideoutPartCount(props.need.id, neededCount.value);
        tarkovStore.setHideoutPartComplete(props.need.id);
      }
    }
  };
  const setCount = (count: number) => {
    if (props.need.needType == 'taskObjective') {
      tarkovStore.setObjectiveCount(props.need.id, count);
      // Update completion status based on new count
      if (count >= neededCount.value) {
        if (!tarkovStore.isTaskObjectiveComplete(props.need.id)) {
          tarkovStore.setTaskObjectiveComplete(props.need.id);
        }
      } else {
        if (tarkovStore.isTaskObjectiveComplete(props.need.id)) {
          tarkovStore.setTaskObjectiveUncomplete(props.need.id);
        }
      }
    } else if (props.need.needType == 'hideoutModule') {
      tarkovStore.setHideoutPartCount(props.need.id, count);
      // Update completion status based on new count
      if (count >= neededCount.value) {
        if (!tarkovStore.isHideoutPartComplete(props.need.id)) {
          tarkovStore.setHideoutPartComplete(props.need.id);
        }
      } else {
        if (tarkovStore.isHideoutPartComplete(props.need.id)) {
          tarkovStore.setHideoutPartUncomplete(props.need.id);
        }
      }
    }
  };
  const imageItem = computed(() => {
    if (!item.value) {
      return null;
    }
    if (item.value.properties?.defaultPreset) {
      return item.value.properties.defaultPreset;
    }
    return item.value;
  });
  const craftSources = computed(() => {
    const currentItemId = item.value?.id;
    if (!currentItemId) {
      return [];
    }
    return metadataStore.craftSourcesByItemId.get(currentItemId) ?? [];
  });
  const isCraftable = computed(() => {
    return craftSources.value.length > 0;
  });
  const craftSourceStatuses = computed(() => {
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
    const available = craftSourceStatuses.value
      .filter((source) => source.isAvailable)
      .sort((a, b) => a.stationLevel - b.stationLevel);
    if (available.length > 0) {
      return available[0]!.stationId;
    }
    const closest = [...craftSourceStatuses.value].sort((a, b) => {
      if (a.missingLevels !== b.missingLevels) {
        return a.missingLevels - b.missingLevels;
      }
      return a.stationLevel - b.stationLevel;
    });
    return closest[0]?.stationId ?? craftSources.value[0]?.stationId ?? '';
  });
  const craftableIconClass = computed(() => {
    return isCraftableAvailable.value ? 'text-success-400' : 'text-red-400';
  });
  const goToCraftStation = async () => {
    if (!craftStationTargetId.value) {
      return;
    }
    await navigateTo({
      path: '/hideout',
      query: { station: craftStationTargetId.value },
    });
  };
  const craftableTitle = computed(() => {
    if (!isCraftable.value) {
      return '';
    }
    const prefix = isCraftableAvailable.value
      ? 'Craftable now'
      : 'Craftable (station level too low)';
    const preview = craftSourceStatuses.value
      .slice(0, 3)
      .map((source) => `${source.stationName} ${source.stationLevel} (you ${source.currentLevel})`);
    const remainingCount = craftSourceStatuses.value.length - preview.length;
    const remainingText = remainingCount > 0 ? ` +${remainingCount} more` : '';
    return `${prefix}: ${preview.join(', ')}${remainingText}`;
  });
  // Helper functions and data to calculate the item's progress
  // These are passed to the child components via provide/inject
  const currentCount = computed(() => {
    if (selfCompletedNeed.value) {
      return neededCount.value;
    }
    if (props.need.needType == 'taskObjective') {
      return tarkovStore.getObjectiveCount(props.need.id);
    } else if (props.need.needType == 'hideoutModule') {
      return tarkovStore.getHideoutPartCount(props.need.id);
    } else {
      return 0;
    }
  });
  const neededCount = computed(() => {
    if (props.need.needType == 'taskObjective' && props.need.count) {
      return props.need.count;
    } else if (props.need.needType == 'hideoutModule' && props.need.count) {
      return props.need.count;
    } else {
      return 1;
    }
  });
  const relatedTask = computed(() => {
    if (props.need.needType == 'taskObjective') {
      return tasks.value.find((t) => t.id == props.need.taskId) ?? null;
    } else {
      return null;
    }
  });
  const isTaskSuccessful = (taskId: string) =>
    tarkovStore.isTaskComplete(taskId) && !tarkovStore.isTaskFailed(taskId);
  const item = computed(() => {
    if (props.need.needType == 'taskObjective') {
      // Prefer the objective's item; fall back to marker item (e.g., beacons/cameras) when present
      if (props.need.item) {
        return props.need.item;
      }
      if (props.need.markerItem) {
        return props.need.markerItem;
      }
      return null;
    } else if (props.need.needType == 'hideoutModule') {
      // For hideout modules, return the associated item
      return props.need.item;
    } else {
      return null;
    }
  });
  const lockedBefore = computed(() => {
    if (props.need.needType == 'taskObjective') {
      if (!relatedTask.value?.predecessors) return 0;
      return relatedTask.value.predecessors.filter((s) => !isTaskSuccessful(s)).length;
    } else if (props.need.needType == 'hideoutModule') {
      return props.need.hideoutModule.predecessors.filter(
        (s: string) => !tarkovStore.isHideoutModuleComplete(s)
      ).length;
    } else {
      return 0;
    }
  });
  const selfCompletedNeed = computed(() => {
    if (props.need.needType == 'taskObjective') {
      const alternativeTaskCompleted =
        alternativeTasks.value[props.need.taskId]?.some((altTaskId) =>
          isTaskSuccessful(altTaskId)
        ) ?? false;
      // Only consider the need "completed" when the parent TASK is completed (turned in)
      // Not when just the objective is marked complete - that should still allow adjustments
      return isTaskSuccessful(props.need.taskId) || alternativeTaskCompleted;
    } else if (props.need.needType == 'hideoutModule') {
      // Only consider the need "completed" when the parent MODULE is built
      // Not when just the part is marked complete - that should still allow adjustments
      return progressStore.moduleCompletions?.[props.need.hideoutModule.id]?.['self'] ?? false;
    } else {
      return false;
    }
  });
  const relatedStation = computed(() => {
    if (props.need.needType == 'hideoutModule') {
      return (
        Object.values(hideoutStations.value).find(
          (s) => s.id == props.need.hideoutModule.stationId
        ) ?? null
      );
    } else {
      return null;
    }
  });
  const levelRequired = computed(() => {
    if (props.need.needType == 'taskObjective') {
      return relatedTask.value?.minPlayerLevel ?? 0;
    } else if (props.need.needType == 'hideoutModule') {
      return 0;
    } else {
      return 0;
    }
  });
  const teamNeeds = computed(() => {
    const needingUsers: NeededItemTeamNeed[] = [];
    // Check if team items should be hidden based on preferences
    if (preferencesStore.itemsTeamAllHidden) {
      return needingUsers;
    }
    // Check FIR preference - if hiding non-FIR and this item is not FIR, hide team needs
    if (preferencesStore.itemsTeamNonFIRHidden && !props.need.foundInRaid) {
      return needingUsers;
    }
    // Check hideout preference - if hiding hideout items and this is a hideout module
    if (preferencesStore.itemsTeamHideoutHidden && props.need.needType === 'hideoutModule') {
      return needingUsers;
    }
    if (props.need.needType == 'taskObjective') {
      // Safely get completions, defaulting to empty object
      const objectiveCompletions = progressStore.objectiveCompletions?.[props.need.id] || {};
      const taskCompletions = progressStore.tasksCompletions?.[props.need.taskId] || {};
      // Find all teammates (not self) that need this objective
      Object.entries(objectiveCompletions).forEach(([user, completed]) => {
        // Skip self - we only want to show teammates
        if (user === 'self') return;
        // Skip if objective is completed or parent task is completed
        if (completed || taskCompletions[user]) return;
        // Get the teammate's store and count
        const teammateStore = progressStore.teamStores?.[user] as
          | { getObjectiveCount?: (id: string) => number }
          | undefined;
        if (teammateStore) {
          needingUsers.push({
            user: user,
            count: teammateStore.getObjectiveCount?.(props.need.id) ?? 0,
          });
        }
      });
    } else if (props.need.needType == 'hideoutModule') {
      // Safely get completions, defaulting to empty object
      const partCompletions = progressStore.modulePartCompletions?.[props.need.id] || {};
      // Find all teammates (not self) that need this module part
      Object.entries(partCompletions).forEach(([user, completed]) => {
        // Skip self - we only want to show teammates
        if (user === 'self') return;
        // Skip if part is completed
        if (completed) return;
        // Get the teammate's store and count
        const teammateStore = progressStore.teamStores?.[user] as
          | { getHideoutPartCount?: (id: string) => number }
          | undefined;
        if (teammateStore) {
          needingUsers.push({
            user: user,
            count: teammateStore.getHideoutPartCount?.(props.need.id) ?? 0,
          });
        }
      });
    }
    return needingUsers;
  });
  // Check if the parent task/module is completed (for Completed tab display)
  const isParentCompleted = computed(() => {
    if (props.need.needType == 'taskObjective') {
      return progressStore.tasksCompletions?.[props.need.taskId]?.['self'] ?? false;
    } else if (props.need.needType == 'hideoutModule') {
      return progressStore.moduleCompletions?.[props.need.hideoutModule.id]?.['self'] ?? false;
    }
    return false;
  });
  provide(neededItemKey, {
    item,
    relatedTask,
    relatedStation,
    selfCompletedNeed,
    isParentCompleted,
    lockedBefore,
    currentCount,
    neededCount,
    levelRequired,
    teamNeeds,
    imageItem,
    craftableIconClass,
    craftableTitle,
    isCraftable,
    goToCraftStation,
  });
</script>
