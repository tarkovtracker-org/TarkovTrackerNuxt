<template>
  <div class="px-4 py-6">
    <TaskLoadingState v-if="isLoading" />
    <div v-else>
      <QuestTreeGraph
        :nodes="questTreeRoots"
        :task-statuses="taskStatusMap"
        @finish="markTaskComplete"
        @cancel="markTaskUncomplete"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
  import { storeToRefs } from 'pinia';
  import { computed } from 'vue';
  import { buildQuestTree } from '@/composables/useQuestTree';
  import QuestTreeGraph from '@/features/tasks/QuestTreeGraph.vue';
  import TaskLoadingState from '@/features/tasks/TaskLoadingState.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { Task, TaskObjective } from '@/types/tarkov';

  type TaskStatus = 'available' | 'locked' | 'completed';

  const metadataStore = useMetadataStore();
  const { tasks, loading: tasksLoading } = storeToRefs(metadataStore);
  const preferencesStore = usePreferencesStore();
  const progressStore = useProgressStore();
  const { tasksCompletions, unlockedTasks, playerFaction, visibleTeamStores } =
    storeToRefs(progressStore);
  const tarkovStore = useTarkovStore();

  const activeUserView = computed(() => preferencesStore.getTaskUserView);
  const isLoading = computed(() => tasksLoading.value);

  const questTreeRoots = computed(() => buildQuestTree(tasks.value, tasks.value));

  const taskStatusMap = computed<Record<string, TaskStatus>>(() => {
    const statusMap: Record<string, TaskStatus> = {};
    tasks.value.forEach((task) => {
      statusMap[task.id] = determineTaskStatus(task);
    });
    return statusMap;
  });

  const determineTaskStatus = (task: Task): TaskStatus => {
    const currentView = activeUserView.value;
    if (!currentView || currentView === 'all') {
      return getStatusForTeam(task);
    }
    return getStatusForUser(task, currentView);
  };

  const getStatusForUser = (task: Task, userId: string): TaskStatus => {
    const faction = playerFaction.value?.[userId];
    if (task.factionName && task.factionName !== 'Any' && task.factionName !== faction) {
      return 'locked';
    }
    const isCompleted = tasksCompletions.value?.[task.id]?.[userId] === true;
    if (isCompleted) return 'completed';
    const isUnlocked = unlockedTasks.value?.[task.id]?.[userId] === true;
    if (isUnlocked) return 'available';
    return 'locked';
  };

  const getStatusForTeam = (task: Task): TaskStatus => {
    const teamIds = Object.keys(visibleTeamStores.value || {});
    if (teamIds.length === 0) {
      return 'locked';
    }
    const relevantTeamIds = teamIds.filter((teamId) => {
      const faction = playerFaction.value?.[teamId];
      return task.factionName === 'Any' || task.factionName === faction;
    });
    if (!relevantTeamIds.length) {
      return 'locked';
    }
    const isCompletedByAll = relevantTeamIds.every(
      (teamId) => tasksCompletions.value?.[task.id]?.[teamId] === true
    );
    if (isCompletedByAll) return 'completed';
    const isUnlockedByAny = relevantTeamIds.some((teamId) => {
      const isCompleted = tasksCompletions.value?.[task.id]?.[teamId] === true;
      const isUnlocked = unlockedTasks.value?.[task.id]?.[teamId] === true;
      return isUnlocked && !isCompleted;
    });
    if (isUnlockedByAny) return 'available';
    return 'locked';
  };

  const handleTaskObjectives = (
    objectives: TaskObjective[],
    action: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    objectives.forEach((o) => {
      if (action === 'setTaskObjectiveComplete') {
        tarkovStore.setTaskObjectiveComplete(o.id);
        if (o.count !== undefined && o.count > 0) {
          tarkovStore.setObjectiveCount(o.id, o.count);
        }
      } else {
        const currentCount = tarkovStore.getObjectiveCount(o.id);
        const requiredCount = o.count ?? 1;
        if (currentCount < requiredCount) {
          tarkovStore.setTaskObjectiveUncomplete(o.id);
        }
      }
    });
  };

  const handleAlternatives = (
    alternatives: string[] | undefined,
    taskAction: 'setTaskComplete' | 'setTaskUncompleted' | 'setTaskFailed',
    objectiveAction: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    if (!Array.isArray(alternatives)) return;
    alternatives.forEach((a: string) => {
      if (taskAction === 'setTaskComplete') {
        tarkovStore.setTaskComplete(a);
      } else if (taskAction === 'setTaskUncompleted') {
        tarkovStore.setTaskUncompleted(a);
      } else if (taskAction === 'setTaskFailed') {
        tarkovStore.setTaskFailed(a);
      }
      const alternativeTask = tasks.value.find((task) => task.id === a);
      if (alternativeTask?.objectives) {
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
      }
    });
  };

  const markTaskComplete = (taskId: string) => {
    const taskToUpdate = tasks.value.find((task) => task.id === taskId);
    if (!taskToUpdate) return;
    tarkovStore.setTaskComplete(taskId);
    if (taskToUpdate?.objectives) {
      handleTaskObjectives(taskToUpdate.objectives, 'setTaskObjectiveComplete');
      handleAlternatives(
        (taskToUpdate as Task & { alternatives?: string[] }).alternatives,
        'setTaskFailed',
        'setTaskObjectiveComplete'
      );
    }
    const minLevel = taskToUpdate.minPlayerLevel;
    if (minLevel !== undefined && tarkovStore.playerLevel() < minLevel) {
      tarkovStore.setLevel(minLevel);
    }
  };

  const markTaskUncomplete = (taskId: string) => {
    const taskToUpdate = tasks.value.find((task) => task.id === taskId);
    if (!taskToUpdate) return;
    tarkovStore.setTaskUncompleted(taskId);
    if (taskToUpdate?.objectives) {
      handleTaskObjectives(taskToUpdate.objectives, 'setTaskObjectiveUncomplete');
      handleAlternatives(
        (taskToUpdate as Task & { alternatives?: string[] }).alternatives,
        'setTaskUncompleted',
        'setTaskObjectiveUncomplete'
      );
    }
  };
</script>
