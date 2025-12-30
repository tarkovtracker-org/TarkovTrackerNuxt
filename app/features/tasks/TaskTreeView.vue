<template>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
    <QuestTreeGraph
      ref="graphRef"
      :nodes="questTreeRoots"
      :task-statuses="taskStatusMap"
      @finish="markTaskComplete"
      @cancel="markTaskUncomplete"
      @select="goToTask"
    />
    <div class="rounded-2xl border border-white/10 bg-surface-900/70 p-4">
      <div class="mb-3 text-sm font-semibold text-gray-200">Quetes disponibles</div>
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher..."
        icon="i-mdi-magnify"
        size="sm"
        class="mb-3"
      />
      <div v-if="activeUserView === 'all'" class="text-xs text-gray-400">
        Selectionne un joueur pour valider les quetes.
      </div>
      <div v-else-if="filteredAvailableTasks.length === 0" class="text-xs text-gray-400">
        Aucune quete disponible.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="task in filteredAvailableTasks"
          :key="task.id"
          class="flex items-center justify-between gap-2"
        >
          <button
            type="button"
            class="text-left text-xs text-gray-200 hover:text-white"
            @click="focusTaskInTree(task.id)"
          >
            {{ task.name ?? 'Task' }}
          </button>
          <UButton size="xs" color="primary" variant="solid" @click="markTaskComplete(task.id)">
            Valider
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia';
  import { computed, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { buildQuestTree } from '@/composables/useQuestTree';
  import QuestTreeGraph from '@/features/tasks/QuestTreeGraph.vue';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { Task, TaskObjective } from '@/types/tarkov';

  type TaskStatus = 'available' | 'locked' | 'completed';

  const props = defineProps<{
    tasks: Task[];
  }>();

  const preferencesStore = usePreferencesStore();
  const progressStore = useProgressStore();
  const { tasksCompletions, unlockedTasks, playerFaction, visibleTeamStores } =
    storeToRefs(progressStore);
  const tarkovStore = useTarkovStore();
  const router = useRouter();
  const graphRef = ref<{ focusTask: (taskId: string) => void } | null>(null);
  const searchQuery = ref('');

  const activeUserView = computed(() => preferencesStore.getTaskUserView);

  const questTreeRoots = computed(() => buildQuestTree(props.tasks, props.tasks));

  const taskStatusMap = computed<Record<string, TaskStatus>>(() => {
    const statusMap: Record<string, TaskStatus> = {};
    props.tasks.forEach((task) => {
      statusMap[task.id] = determineTaskStatus(task);
    });
    return statusMap;
  });

  const availableTasks = computed(() => {
    if (activeUserView.value === 'all') return [];
    return props.tasks
      .filter((task) => taskStatusMap.value[task.id] === 'available')
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  });

  const filteredAvailableTasks = computed(() => {
    if (!searchQuery.value.trim()) return availableTasks.value;
    const query = searchQuery.value.toLowerCase();
    return availableTasks.value.filter((task) =>
      (task.name ?? '').toLowerCase().includes(query)
    );
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
      const alternativeTask = props.tasks.find((task) => task.id === a);
      if (alternativeTask?.objectives) {
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
      }
    });
  };

  const markTaskComplete = (taskId: string) => {
    const taskToUpdate = props.tasks.find((task) => task.id === taskId);
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
    const taskToUpdate = props.tasks.find((task) => task.id === taskId);
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

  const focusTaskInTree = (taskId: string) => {
    graphRef.value?.focusTask(taskId);
  };

  const goToTask = (taskId: string) => {
    preferencesStore.setTaskPrimaryView('all');
    router.push({ path: '/tasks', query: { task: taskId } });
  };
</script>
