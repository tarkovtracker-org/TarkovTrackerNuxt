import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMetadataStore } from '@/stores/useMetadata';
import { useTarkovStore } from '@/stores/useTarkov';
import type { Task, TaskObjective } from '@/types/tarkov';
export type TaskActionPayload = {
  taskId: string;
  taskName: string;
  action: 'available' | 'complete' | 'uncomplete' | 'resetfailed' | 'fail';
  undoKey?: string;
  statusKey?: string;
};
export type UseTaskActionsReturn = {
  markTaskComplete: (isUndo?: boolean) => void;
  markTaskUncomplete: (isUndo?: boolean) => void;
  markTaskAvailable: () => void;
  markTaskFailed: (isUndo?: boolean) => void;
};
export function useTaskActions(
  task: () => Task,
  onAction?: (payload: TaskActionPayload) => void
): UseTaskActionsReturn {
  const { t } = useI18n({ useScope: 'global' });
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const tasks = computed(() => metadataStore.tasks);
  // Create O(1) lookup map for tasks (more efficient than O(n) find operations)
  const tasksMap = computed(() => {
    const map = new Map<string, Task>();
    tasks.value.forEach((taskItem) => {
      map.set(taskItem.id, taskItem);
    });
    return map;
  });
  const handleTaskObjectives = (
    objectives: TaskObjective[],
    action: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    objectives.forEach((objective) => {
      if (!objective?.id) return;
      if (action === 'setTaskObjectiveComplete') {
        tarkovStore.setTaskObjectiveComplete(objective.id);
        if (objective.count !== undefined && objective.count > 0) {
          tarkovStore.setObjectiveCount(objective.id, objective.count);
        }
        return;
      }
      tarkovStore.setTaskObjectiveUncomplete(objective.id);
    });
  };
  const normalizeStatuses = (statuses?: string[]) =>
    (statuses ?? []).map((status) => status.toLowerCase());
  const hasAnyStatus = (statuses: string[], values: string[]) =>
    values.some((value) => statuses.includes(value));
  const isFailedOnlyRequirement = (statuses?: string[]) => {
    const normalized = normalizeStatuses(statuses);
    if (normalized.length === 0) return false;
    return (
      normalized.includes('failed') &&
      !hasAnyStatus(normalized, ['complete', 'completed', 'active', 'accept', 'accepted'])
    );
  };
  const completeTaskForAvailability = (taskId: string) => {
    tarkovStore.setTaskComplete(taskId);
    const requiredTask = tasksMap.value.get(taskId);
    if (requiredTask?.objectives) {
      handleTaskObjectives(requiredTask.objectives, 'setTaskObjectiveComplete');
    }
    if (requiredTask?.alternatives) {
      handleAlternatives(requiredTask.alternatives, 'setTaskFailed', 'setTaskObjectiveComplete');
    }
  };
  const failTaskForAvailability = (taskId: string) => {
    tarkovStore.setTaskFailed(taskId);
    const requiredTask = tasksMap.value.get(taskId);
    if (requiredTask?.objectives) {
      handleTaskObjectives(requiredTask.objectives, 'setTaskObjectiveComplete');
    }
  };
  const handleAlternatives = (
    alternatives: string[] | undefined,
    taskAction: 'setTaskFailed' | 'setTaskUncompleted',
    objectiveAction: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    if (!Array.isArray(alternatives)) return;
    alternatives.forEach((alternativeTaskId) => {
      tarkovStore[taskAction](alternativeTaskId);
      const alternativeTask = tasksMap.value.get(alternativeTaskId);
      if (alternativeTask?.objectives) {
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
      }
    });
  };
  const ensureMinLevel = () => {
    const minLevel = task().minPlayerLevel ?? 0;
    // Note: playerLevel is a getter that returns a function, so it must be called with ()
    if (tarkovStore.playerLevel() < minLevel) {
      tarkovStore.setLevel(minLevel);
    }
  };
  const emitAction = (payload: TaskActionPayload) => {
    onAction?.(payload);
  };
  const markTaskComplete = (isUndo = false) => {
    const currentTask = task();
    const taskName = currentTask.name ?? t('page.tasks.questcard.task', 'Task');
    if (!isUndo) {
      emitAction({
        taskId: currentTask.id,
        taskName,
        action: 'complete',
        statusKey: 'page.tasks.questcard.statuscomplete',
      });
    }
    tarkovStore.setTaskComplete(currentTask.id);
    if (currentTask.objectives) {
      handleTaskObjectives(currentTask.objectives, 'setTaskObjectiveComplete');
    }
    handleAlternatives(currentTask.alternatives, 'setTaskFailed', 'setTaskObjectiveComplete');
    ensureMinLevel();
    if (isUndo) {
      emitAction({
        taskId: currentTask.id,
        taskName,
        action: 'complete',
        undoKey: 'page.tasks.questcard.undocomplete',
      });
    }
  };
  const markTaskUncomplete = (isUndo = false) => {
    const currentTask = task();
    const taskName = currentTask.name ?? t('page.tasks.questcard.task', 'Task');
    const wasFailed = tarkovStore.isTaskFailed(currentTask.id);
    if (!isUndo) {
      emitAction({
        taskId: currentTask.id,
        taskName,
        action: wasFailed ? 'resetfailed' : 'uncomplete',
        statusKey: wasFailed
          ? 'page.tasks.questcard.statusresetfailed'
          : 'page.tasks.questcard.statusuncomplete',
      });
    }
    tarkovStore.setTaskUncompleted(currentTask.id);
    if (currentTask.objectives) {
      handleTaskObjectives(currentTask.objectives, 'setTaskObjectiveUncomplete');
    }
    handleAlternatives(
      currentTask.alternatives,
      'setTaskUncompleted',
      'setTaskObjectiveUncomplete'
    );
    if (isUndo) {
      emitAction({
        taskId: currentTask.id,
        taskName,
        action: wasFailed ? 'resetfailed' : 'uncomplete',
        undoKey: wasFailed
          ? 'page.tasks.questcard.undoresetfailed'
          : 'page.tasks.questcard.undouncomplete',
      });
    }
  };
  const markTaskAvailable = () => {
    const currentTask = task();
    const taskName = currentTask.name ?? t('page.tasks.questcard.task', 'Task');
    const handledRequirementTaskIds = new Set<string>();
    const failedRequirementTaskIds = new Set<string>();
    currentTask.taskRequirements?.forEach((req) => {
      if (req.task?.id) {
        const requirementTaskId = req.task.id;
        if (isFailedOnlyRequirement(req.status)) {
          failTaskForAvailability(requirementTaskId);
          failedRequirementTaskIds.add(requirementTaskId);
        } else {
          completeTaskForAvailability(requirementTaskId);
        }
        handledRequirementTaskIds.add(requirementTaskId);
      }
    });
    currentTask.predecessors?.forEach((predecessorId) => {
      if (handledRequirementTaskIds.has(predecessorId)) return;
      if (failedRequirementTaskIds.has(predecessorId)) return;
      completeTaskForAvailability(predecessorId);
    });
    ensureMinLevel();
    emitAction({
      taskId: currentTask.id,
      taskName,
      action: 'available',
      statusKey: 'page.tasks.questcard.statusavailable',
    });
  };
  const markTaskFailed = (isUndo = false) => {
    const currentTask = task();
    const taskName = currentTask.name ?? t('page.tasks.questcard.task', 'Task');
    if (!isUndo) {
      emitAction({
        taskId: currentTask.id,
        taskName,
        action: 'fail',
        statusKey: 'page.tasks.questcard.statusfailed',
      });
    }
    tarkovStore.setTaskFailed(currentTask.id);
    if (currentTask.objectives) {
      handleTaskObjectives(currentTask.objectives, 'setTaskObjectiveComplete');
    }
    if (isUndo) {
      emitAction({
        taskId: currentTask.id,
        taskName,
        action: 'fail',
        undoKey: 'page.tasks.questcard.undofailed',
      });
    }
  };
  return {
    markTaskComplete,
    markTaskUncomplete,
    markTaskAvailable,
    markTaskFailed,
  };
}
