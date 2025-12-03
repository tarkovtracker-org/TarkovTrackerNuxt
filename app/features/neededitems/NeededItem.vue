<template>
  <template v-if="props.itemStyle == 'mediumCard'">
    <div class="w-full p-2 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6">
      <NeededItemMediumCard
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
        @set-count="setCount"
      />
    </div>
  </template>
  <template v-else-if="props.itemStyle == 'smallCard'">
    <div class="w-auto p-1">
      <NeededItemSmallCard
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
      <NeededItemRow
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
        @set-count="setCount"
      />
    </div>
  </template>
</template>
<script setup>
  import { computed, defineAsyncComponent, provide } from 'vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  const NeededItemMediumCard = defineAsyncComponent(
    () => import('@/features/neededitems/NeededItemMediumCard')
  );
  const NeededItemSmallCard = defineAsyncComponent(
    () => import('@/features/neededitems/NeededItemSmallCard')
  );
  const NeededItemRow = defineAsyncComponent(() => import('@/features/neededitems/NeededItemRow'));
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
  const setCount = (count) => {
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
      return tasks.value.find((t) => t.id == props.need.taskId);
    } else {
      return null;
    }
  });
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
      return relatedTask.value.predecessors.filter((s) => !tarkovStore.isTaskComplete(s)).length;
    } else if (props.need.needType == 'hideoutModule') {
      return props.need.hideoutModule.predecessors.filter(
        (s) => !tarkovStore.isHideoutModuleComplete(s)
      ).length;
    } else {
      return 0;
    }
  });
  const selfCompletedNeed = computed(() => {
    if (props.need.needType == 'taskObjective') {
      const alternativeTaskCompleted = alternativeTasks.value[props.need.taskId]?.some(
        (altTaskId) => progressStore.tasksCompletions?.[altTaskId]?.['self']
      );
      // Only consider the need "completed" when the parent TASK is completed (turned in)
      // Not when just the objective is marked complete - that should still allow adjustments
      return (
        progressStore.tasksCompletions?.[props.need.taskId]?.['self'] || alternativeTaskCompleted
      );
    } else if (props.need.needType == 'hideoutModule') {
      // Only consider the need "completed" when the parent MODULE is built
      // Not when just the part is marked complete - that should still allow adjustments
      return progressStore.moduleCompletions?.[props.need.hideoutModule.id]?.['self'];
    } else {
      return false;
    }
  });
  const relatedStation = computed(() => {
    if (props.need.needType == 'hideoutModule') {
      return Object.values(hideoutStations.value).find(
        (s) => s.id == props.need.hideoutModule.stationId
      );
    } else {
      return null;
    }
  });
  const levelRequired = computed(() => {
    if (props.need.needType == 'taskObjective') {
      return relatedTask.value.minPlayerLevel;
    } else if (props.need.needType == 'hideoutModule') {
      return 0;
    } else {
      return 0;
    }
  });
  const teamNeeds = computed(() => {
    const needingUsers = [];
    if (props.need.needType == 'taskObjective') {
      // Find all of the users that need this objective
      Object.entries(progressStore.objectiveCompletions[props.need.id]).forEach(
        ([user, completed]) => {
          if (!completed && !progressStore.tasksCompletions[props.need.taskId][user]) {
            needingUsers.push({
              user: user,
              count: progressStore.teamStores[user].getObjectiveCount(props.need.id),
            });
          }
        }
      );
    } else if (props.need.needType == 'hideoutModule') {
      // Find all of the users that need this module
      Object.entries(progressStore.modulePartCompletions[props.need.id]).forEach(
        ([user, completed]) => {
          if (!completed) {
            needingUsers.push({
              user: user,
              count: progressStore.teamStores[user].getHideoutPartCount(props.need.id),
            });
          }
        }
      );
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
  provide('neededitem', {
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
  });
</script>
