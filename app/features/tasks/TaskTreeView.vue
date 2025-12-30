<template>
  <div class="min-h-[70vh] w-full overflow-x-auto rounded-2xl border border-white/10 bg-surface-900/70 p-6">
    <div class="flex min-w-max items-start gap-6">
      <div
        v-for="column in columns"
        :key="column.depth"
        class="flex min-w-[220px] flex-col gap-3"
      >
        <div v-for="taskId in column.taskIds" :key="taskId">
          <button
            type="button"
            class="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs text-white shadow-sm transition hover:brightness-110"
            :class="statusBgClass(taskId)"
            @click="goToTask(taskId)"
          >
            <span class="relative mt-0.5 h-4 w-4 shrink-0 rounded-sm border" :class="statusColorClass(taskId)">
              <span
                v-if="isLightkeeperTask(taskId)"
                class="absolute -left-1 -top-1 rounded-sm bg-white px-0.5 text-[9px] font-bold text-black"
              >
                K
              </span>
              <span
                v-if="isKappaTask(taskId)"
                class="absolute -right-1 -top-1 rounded-sm bg-white px-0.5 text-[9px] font-bold text-black"
              >
                K
              </span>
            </span>
            <span class="leading-tight">
              {{ tasksById.get(taskId)?.name ?? 'Task' }}
            </span>
          </button>
          <div v-if="childrenMap.get(taskId)?.length" class="mt-2 text-[11px] text-gray-400">
            <span class="mr-1 text-gray-500">-></span>
            <span>{{ formatChildren(taskId) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import type { Task } from '@/types/tarkov';

  const props = defineProps<{
    tasks: Task[];
  }>();

  const preferencesStore = usePreferencesStore();
  const progressStore = useProgressStore();
  const metadataStore = useMetadataStore();
  const router = useRouter();
  const userView = computed(() => preferencesStore.getTaskUserView);
  const teamIds = computed(() => Object.keys(progressStore.visibleTeamStores || {}));
  const tasksById = computed(() => new Map(props.tasks.map((task) => [task.id, task])));
  const lightkeeperTraderId = computed(() => metadataStore.getTraderByName('lightkeeper')?.id);

  const statusById = computed(() => {
    const statuses = new Map<string, 'locked' | 'available' | 'inprogress' | 'completed'>();
    props.tasks.forEach((task) => {
      const taskFaction = task.factionName;
      if (userView.value === 'all') {
        const relevantTeamIds = teamIds.value.filter((teamId) => {
          const teamFaction = progressStore.playerFaction[teamId];
          return taskFaction === 'Any' || taskFaction === teamFaction;
        });
        if (relevantTeamIds.length === 0) {
          statuses.set(task.id, 'locked');
          return;
        }
        const isCompletedByAll = relevantTeamIds.every(
          (teamId) => progressStore.tasksCompletions?.[task.id]?.[teamId] === true
        );
        if (isCompletedByAll) {
          statuses.set(task.id, 'completed');
          return;
        }
        const isAvailableForAny = relevantTeamIds.some((teamId) => {
          const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[teamId] === true;
          const isCompleted = progressStore.tasksCompletions?.[task.id]?.[teamId] === true;
          return isUnlocked && !isCompleted;
        });
        if (!isAvailableForAny) {
          statuses.set(task.id, 'locked');
          return;
        }
        const isInProgress = relevantTeamIds.some((teamId) =>
          isTaskInProgress(task, teamId)
        );
        statuses.set(task.id, isInProgress ? 'inprogress' : 'available');
        return;
      }
      const userFaction = progressStore.playerFaction[userView.value];
      if (taskFaction !== 'Any' && taskFaction !== userFaction) {
        statuses.set(task.id, 'locked');
        return;
      }
      const isCompleted = progressStore.tasksCompletions?.[task.id]?.[userView.value] === true;
      if (isCompleted) {
        statuses.set(task.id, 'completed');
        return;
      }
      const isUnlocked = progressStore.unlockedTasks?.[task.id]?.[userView.value] === true;
      if (!isUnlocked) {
        statuses.set(task.id, 'locked');
        return;
      }
      const isInProgress = isTaskInProgress(task, userView.value);
      statuses.set(task.id, isInProgress ? 'inprogress' : 'available');
    });
    return statuses;
  });

  const statusColorClass = (taskId: string) => {
    const status = statusById.value.get(taskId);
    if (status === 'available') return 'bg-emerald-500 border-emerald-300';
    if (status === 'inprogress' || status === 'completed') return 'bg-gray-500 border-gray-300';
    return 'bg-red-500 border-red-300';
  };

  const statusBgClass = (taskId: string) => {
    const status = statusById.value.get(taskId);
    if (status === 'available') return 'bg-emerald-700/60';
    if (status === 'inprogress' || status === 'completed') return 'bg-gray-700/60';
    return 'bg-red-700/60';
  };

  const depthMap = computed(() => {
    const depth = new Map<string, number>();
    const parentMap = new Map<string, string[]>();
    props.tasks.forEach((task) => {
      const parents = (task.parents ?? []).filter((parentId) => tasksById.value.has(parentId));
      parentMap.set(task.id, parents);
      if (parents.length === 0) {
        depth.set(task.id, 0);
      }
    });
    let progress = true;
    let safety = 0;
    while (progress && safety < props.tasks.length) {
      progress = false;
      safety += 1;
      props.tasks.forEach((task) => {
        if (depth.has(task.id)) return;
        const parents = parentMap.get(task.id) ?? [];
        if (parents.length === 0) {
          depth.set(task.id, 0);
          progress = true;
          return;
        }
        const parentDepths = parents.map((parentId) => depth.get(parentId));
        if (parentDepths.some((value) => value === undefined)) return;
        const maxDepth = Math.max(...(parentDepths as number[]));
        depth.set(task.id, maxDepth + 1);
        progress = true;
      });
    }
    props.tasks.forEach((task) => {
      if (!depth.has(task.id)) depth.set(task.id, 0);
    });
    return depth;
  });

  const childrenMap = computed(() => {
    const childMap = new Map<string, string[]>();
    props.tasks.forEach((task) => {
      const children = (task.children ?? []).filter((childId) => tasksById.value.has(childId));
      children.sort((a, b) => (tasksById.value.get(a)?.name ?? '').localeCompare(
        tasksById.value.get(b)?.name ?? ''
      ));
      childMap.set(task.id, children);
    });
    return childMap;
  });

  const columns = computed(() => {
    const columnsMap = new Map<number, string[]>();
    const taskName = (taskId: string) => tasksById.value.get(taskId)?.name ?? '';
    props.tasks.forEach((task) => {
      const depth = depthMap.value.get(task.id) ?? 0;
      const list = columnsMap.get(depth) ?? [];
      list.push(task.id);
      columnsMap.set(depth, list);
    });
    return [...columnsMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([depth, taskIds]) => ({
        depth,
        taskIds: taskIds.sort((a, b) => taskName(a).localeCompare(taskName(b))),
      }));
  });

  const isTaskInProgress = (task: Task, teamId: string) => {
    if (!task.objectives?.length) return false;
    return task.objectives.some(
      (objective) => progressStore.objectiveCompletions?.[objective.id]?.[teamId] === true
    );
  };

  const isKappaTask = (taskId: string) => {
    return tasksById.value.get(taskId)?.kappaRequired === true;
  };

  const isLightkeeperTask = (taskId: string) => {
    const task = tasksById.value.get(taskId);
    if (!task) return false;
    if (task.lightkeeperRequired === true) return true;
    if (lightkeeperTraderId.value) {
      return task.trader?.id === lightkeeperTraderId.value;
    }
    return task.trader?.name?.toLowerCase() === 'lightkeeper';
  };

  const goToTask = (taskId: string) => {
    preferencesStore.setTaskPrimaryView('all');
    router.push({ path: '/tasks', query: { task: taskId } });
  };

  const formatChildren = (taskId: string) => {
    const children = childrenMap.value.get(taskId) ?? [];
    return children
      .map((childId) => tasksById.value.get(childId)?.name ?? 'Task')
      .join(', ');
  };
</script>
