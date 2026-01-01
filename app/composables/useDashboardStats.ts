import { computed } from 'vue';
import { useMetadataStore } from '@/stores/useMetadata';
import { useProgressStore } from '@/stores/useProgress';
import { useTarkovStore } from '@/stores/useTarkov';
import type { TaskObjective } from '@/types/tarkov';
import { CURRENCY_ITEM_IDS } from '@/utils/constants';
export function useDashboardStats() {
  const progressStore = useProgressStore();
  const metadataStore = useMetadataStore();
  const tarkovStore = useTarkovStore();
  const isTaskSuccessful = (taskId: string) =>
    tarkovStore.isTaskComplete(taskId) && !tarkovStore.isTaskFailed(taskId);
  // Check if a task is invalid (failed, blocked by failed prereqs, wrong faction, etc.)
  const isTaskInvalid = (taskId: string) => progressStore.invalidTasks[taskId]?.self === true;
  // Memoize tasks filtered by faction to avoid repeated filtering
  const relevantTasks = computed(() => {
    if (!metadataStore.tasks) return [];
    const currentFaction = tarkovStore.getPMCFaction();
    return metadataStore.tasks.filter(
      (task) => task && (task.factionName === 'Any' || task.factionName === currentFaction)
    );
  });
  // Available tasks count
  const availableTasksCount = computed(() => {
    if (!progressStore.unlockedTasks) return 0;
    let count = 0;
    for (const taskId in progressStore.unlockedTasks) {
      if (progressStore.unlockedTasks[taskId]?.self) count++;
    }
    return count;
  });
  // Failed tasks count
  const failedTasksCount = computed(() => {
    if (!metadataStore.tasks) return 0;
    return metadataStore.tasks.filter((t) => tarkovStore.isTaskFailed(t.id)).length;
  });
  // Needed item task objectives (memoized)
  const neededItemTaskObjectives = computed(() => {
    if (!metadataStore.objectives) return [];
    const itemObjectiveTypes = [
      'giveItem',
      'findItem',
      'findQuestItem',
      'giveQuestItem',
      'plantQuestItem',
      'plantItem',
      'buildWeapon',
    ];
    return metadataStore.objectives.filter(
      (obj) => obj && obj.type && itemObjectiveTypes.includes(obj.type)
    );
  });
  // Total tasks count - includes completed tasks, excludes failed and invalid tasks
  const totalTasks = computed(() => {
    return relevantTasks.value.filter((task) => {
      // Completed tasks always count toward total
      if (isTaskSuccessful(task.id)) return true;
      // Failed tasks don't count (they failed as side effect of completing alternatives)
      if (tarkovStore.isTaskFailed(task.id)) return false;
      // Incomplete tasks only count if they can still be completed (not invalid)
      return !isTaskInvalid(task.id);
    }).length;
  });
  // Total objectives count - includes objectives from completed tasks, excludes from failed/invalid tasks
  const totalObjectives = computed(() => {
    return relevantTasks.value.reduce((total, task) => {
      // Completed tasks' objectives always count
      if (isTaskSuccessful(task.id)) return total + (task?.objectives?.length || 0);
      // Failed tasks' objectives don't count
      if (tarkovStore.isTaskFailed(task.id)) return total;
      // Incomplete invalid tasks' objectives don't count
      if (isTaskInvalid(task.id)) return total;
      return total + (task?.objectives?.length || 0);
    }, 0);
  });
  // Completed objectives count - from completed tasks or non-failed/non-invalid incomplete tasks
  const completedObjectives = computed(() => {
    if (!relevantTasks.value.length || !tarkovStore) {
      return 0;
    }
    let count = 0;
    for (const task of relevantTasks.value) {
      // Skip failed tasks
      if (tarkovStore.isTaskFailed(task.id)) continue;
      // Skip incomplete invalid tasks
      if (!isTaskSuccessful(task.id) && isTaskInvalid(task.id)) continue;
      for (const objective of task.objectives || []) {
        if (objective?.id && tarkovStore.isTaskObjectiveComplete(objective.id)) {
          count++;
        }
      }
    }
    return count;
  });
  // Completed tasks count (only faction-relevant tasks)
  const completedTasks = computed(() => {
    if (!relevantTasks.value.length) return 0;
    return relevantTasks.value.filter((task) => isTaskSuccessful(task.id)).length;
  });
  // Helper to check if objective is relevant for current faction
  const isObjectiveRelevant = (objective: TaskObjective | null | undefined) => {
    if (!objective) return false;
    const primaryItem = objective.item ?? objective.items?.[0];
    if (
      primaryItem &&
      CURRENCY_ITEM_IDS.includes(primaryItem.id as (typeof CURRENCY_ITEM_IDS)[number])
    ) {
      return false;
    }
    const relatedTask = metadataStore.tasks?.find(
      (task) => task && objective.taskId && task.id === objective.taskId
    );
    if (!relatedTask) return false;
    // Exclude objectives from failed tasks
    if (tarkovStore.isTaskFailed(relatedTask.id)) return false;
    // Exclude objectives from incomplete invalid tasks (but include from completed tasks)
    if (!isTaskSuccessful(relatedTask.id) && isTaskInvalid(relatedTask.id)) return false;
    const currentPMCFaction = tarkovStore.getPMCFaction();
    return !!(
      relatedTask.factionName &&
      currentPMCFaction !== undefined &&
      (relatedTask.factionName === 'Any' || relatedTask.factionName === currentPMCFaction)
    );
  };
  // Completed task items count
  const completedTaskItems = computed(() => {
    if (
      !neededItemTaskObjectives.value ||
      !metadataStore.tasks ||
      !progressStore.tasksCompletions ||
      !progressStore.objectiveCompletions ||
      !tarkovStore
    ) {
      return 0;
    }
    let total = 0;
    neededItemTaskObjectives.value.forEach((objective) => {
      if (!isObjectiveRelevant(objective)) return;
      if (!objective.id || !objective.taskId) return;
      const objectiveCompletion = progressStore.objectiveCompletions[objective.id];
      if (
        isTaskSuccessful(objective.taskId) ||
        (objectiveCompletion && objectiveCompletion['self']) ||
        (objective.count &&
          objective.id &&
          objective.count <= tarkovStore.getObjectiveCount(objective.id))
      ) {
        total += objective.count || 1;
      } else {
        if (objective.id) {
          total += tarkovStore.getObjectiveCount(objective.id);
        }
      }
    });
    return total;
  });
  // Total task items count
  const totalTaskItems = computed(() => {
    if (!metadataStore.objectives || !metadataStore.tasks || !tarkovStore) {
      return 0;
    }
    return neededItemTaskObjectives.value.reduce((total, objective) => {
      if (!isObjectiveRelevant(objective)) return total;
      return total + (objective.count || 1);
    }, 0);
  });
  // Total Kappa tasks count - includes completed, excludes failed and invalid
  const totalKappaTasks = computed(() => {
    return relevantTasks.value.filter((task) => {
      if (!task.kappaRequired) return false;
      // Completed kappa tasks always count
      if (isTaskSuccessful(task.id)) return true;
      // Failed kappa tasks don't count
      if (tarkovStore.isTaskFailed(task.id)) return false;
      // Incomplete kappa tasks only count if not invalid
      return !isTaskInvalid(task.id);
    }).length;
  });
  // Completed Kappa tasks count
  const completedKappaTasks = computed(() => {
    return relevantTasks.value.filter(
      (task) => task.kappaRequired === true && isTaskSuccessful(task.id)
    ).length;
  });
  // Total Lightkeeper tasks count - includes completed, excludes failed and invalid
  const totalLightkeeperTasks = computed(() => {
    return relevantTasks.value.filter((task) => {
      if (!task.lightkeeperRequired) return false;
      // Completed lightkeeper tasks always count
      if (isTaskSuccessful(task.id)) return true;
      // Failed lightkeeper tasks don't count
      if (tarkovStore.isTaskFailed(task.id)) return false;
      // Incomplete lightkeeper tasks only count if not invalid
      return !isTaskInvalid(task.id);
    }).length;
  });
  // Completed Lightkeeper tasks count
  const completedLightkeeperTasks = computed(() => {
    return relevantTasks.value.filter(
      (task) => task.lightkeeperRequired === true && isTaskSuccessful(task.id)
    ).length;
  });
  // Trader-specific stats - includes completed, excludes failed and invalid
  const traderStats = computed(() => {
    if (!metadataStore.traders) return [];
    return metadataStore.sortedTraders
      .map((trader) => {
        const traderTasks = relevantTasks.value.filter((task) => task.trader?.id === trader.id);
        // Total includes completed tasks, excludes failed and invalid tasks
        const totalTasks = traderTasks.filter((task) => {
          if (isTaskSuccessful(task.id)) return true;
          if (tarkovStore.isTaskFailed(task.id)) return false;
          return !isTaskInvalid(task.id);
        }).length;
        const completedTasks = traderTasks.filter((task) => isTaskSuccessful(task.id)).length;
        return {
          id: trader.id,
          name: trader.name,
          imageLink: trader.imageLink,
          totalTasks,
          completedTasks,
          percentage: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0',
        };
      })
      .filter((stats) => stats.totalTasks > 0); // Only show traders with at least 1 task
  });
  return {
    availableTasksCount,
    failedTasksCount,
    totalTasks,
    totalObjectives,
    completedObjectives,
    completedTasks,
    completedTaskItems,
    totalTaskItems,
    totalKappaTasks,
    completedKappaTasks,
    totalLightkeeperTasks,
    completedLightkeeperTasks,
    traderStats,
  };
}
