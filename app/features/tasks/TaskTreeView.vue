<template>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
    <div
      ref="canvasRef"
      class="min-h-[70vh] w-full overflow-auto rounded-2xl border border-white/10 bg-surface-900/70 p-4"
      :class="isPanning ? 'cursor-grabbing' : 'cursor-grab'"
      tabindex="0"
      @click="focusCanvas"
      @keydown="onKeyScroll"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <div class="relative" :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }">
        <svg
          class="pointer-events-none absolute inset-0"
          :width="canvasWidth"
          :height="canvasHeight"
          role="presentation"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="rgba(148,163,184,0.8)" />
            </marker>
          </defs>
          <path
            v-for="edge in edges"
            :key="edge.id"
            :d="edge.path"
            stroke="rgba(148,163,184,0.7)"
            stroke-width="1.5"
            fill="none"
            marker-end="url(#arrowhead)"
          />
        </svg>
        <div
          v-for="node in nodes"
          :key="node.key"
          class="absolute rounded-lg shadow-sm"
          :style="{
            left: `${node.x}px`,
            top: `${node.y}px`,
            width: `${NODE_WIDTH}px`,
            height: `${NODE_HEIGHT}px`,
          }"
        >
          <div
            class="relative flex h-full w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs text-white transition hover:brightness-110"
            :class="statusBgClass(node.taskId)"
          >
            <div
              v-if="isKappaTask(node.taskId)"
              class="absolute left-0 right-0 top-0 rounded-t-lg bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
            >
              Kappa
            </div>
            <div
              v-if="isLightkeeperTask(node.taskId)"
              class="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
            >
              Lightkeeper
            </div>
            <button
              type="button"
              class="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-white/70 bg-white/10"
              :class="validationSquareClass(node.taskId)"
              :aria-label="`Valider ${tasksById.get(node.taskId)?.name ?? 'Task'}`"
              @click.stop="completeTask(node.taskId)"
            />
            <button
              type="button"
              class="flex-1 text-left leading-tight"
              @click="goToTask(node.taskId)"
            >
              {{ tasksById.get(node.taskId)?.name ?? 'Task' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="rounded-2xl border border-white/10 bg-surface-900/70 p-4">
      <div class="mb-3 text-sm font-semibold text-gray-200">Quetes disponibles</div>
      <div v-if="userView === 'all'" class="text-xs text-gray-400">
        Selectionne un joueur pour valider les quetes.
      </div>
      <div v-else-if="availableTasks.length === 0" class="text-xs text-gray-400">
        Aucune quete disponible.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="task in availableTasks"
          :key="task.id"
          class="flex items-center justify-between gap-2"
        >
          <span class="text-xs text-gray-200">{{ task.name ?? 'Task' }}</span>
          <UButton size="xs" color="primary" variant="solid" @click="completeTask(task.id)">
            Valider
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useTaskActions } from '@/composables/useTaskActions';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import type { Task } from '@/types/tarkov';

  const props = defineProps<{
    tasks: Task[];
  }>();

  const emit = defineEmits<{
    'on-task-action': [
      event: {
        taskId: string;
        taskName: string;
        action: string;
        undoKey?: string;
        statusKey?: string;
      },
    ];
  }>();

  const preferencesStore = usePreferencesStore();
  const progressStore = useProgressStore();
  const metadataStore = useMetadataStore();
  const router = useRouter();
  const canvasRef = ref<HTMLElement | null>(null);
  const userView = computed(() => preferencesStore.getTaskUserView);
  const teamIds = computed(() => Object.keys(progressStore.visibleTeamStores || {}));
  const tasksById = computed(() => new Map(props.tasks.map((task) => [task.id, task])));
  const lightkeeperTraderId = computed(() => metadataStore.getTraderByName('lightkeeper')?.id);
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 52;
  const COLUMN_GAP = 160;
  const ROW_GAP = 40;
  const PADDING = 48;
  const isPanning = ref(false);
  const panStart = ref({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const actionTask = ref<Task | null>(null);
  const { markTaskComplete } = useTaskActions(
    () => actionTask.value as Task,
    (payload) => emit('on-task-action', payload)
  );

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

  const validationSquareClass = (taskId: string) => {
    const status = statusById.value.get(taskId);
    if (status === 'available') return 'bg-emerald-400/80';
    if (status === 'inprogress') return 'bg-gray-300/70';
    if (status === 'completed') return 'bg-gray-500/60';
    return 'bg-red-400/70';
  };

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

  type TreeNode = {
    key: string;
    taskId: string;
    children: TreeNode[];
    units?: number;
  };

  const roots = computed(() => {
    const rootIds: string[] = [];
    const allIds = new Set(props.tasks.map((task) => task.id));
    props.tasks.forEach((task) => {
      const parents = (task.parents ?? []).filter((parentId) => allIds.has(parentId));
      if (parents.length === 0) {
        rootIds.push(task.id);
      }
    });
    const reachable = new Set<string>();
    const walk = (taskId: string) => {
      if (reachable.has(taskId)) return;
      reachable.add(taskId);
      const children = childrenMap.value.get(taskId) ?? [];
      children.forEach((childId) => walk(childId));
    };
    rootIds.forEach((rootId) => walk(rootId));
    props.tasks.forEach((task) => {
      if (!reachable.has(task.id)) {
        rootIds.push(task.id);
      }
    });
    return rootIds;
  });

  const buildTree = (taskId: string, path: Set<string>, nextKey: () => string): TreeNode | null => {
    if (path.has(taskId)) return null;
    const node: TreeNode = { key: nextKey(), taskId, children: [] };
    const children = childrenMap.value.get(taskId) ?? [];
    const nextPath = new Set(path);
    nextPath.add(taskId);
    children.forEach((childId) => {
      const child = buildTree(childId, nextPath, nextKey);
      if (child) node.children.push(child);
    });
    return node;
  };

  const computeUnits = (node: TreeNode): number => {
    if (!node.children.length) {
      node.units = 1;
      return 1;
    }
    const total = node.children.reduce((sum, child) => sum + computeUnits(child), 0);
    node.units = total;
    return total;
  };

  const layout = computed(() => {
    const nodes: Array<{ key: string; taskId: string; x: number; y: number }> = [];
    const edges: Array<{ id: string; from: string; to: string }> = [];
    const unitHeight = NODE_HEIGHT + ROW_GAP;
    const TREE_GAP = 80;
    let yOffset = PADDING;
    let maxX = 0;
    let maxY = 0;
    let counter = 0;
    const nextKey = () => `node-${counter++}`;

    const layoutNode = (node: TreeNode, depth: number, yStart: number): number => {
      const units = node.units ?? 1;
      const blockHeight = units * unitHeight - ROW_GAP;
      const nodeY = yStart + Math.max(0, (blockHeight - NODE_HEIGHT) / 2);
      const x = PADDING + depth * (NODE_WIDTH + COLUMN_GAP);
      nodes.push({ key: node.key, taskId: node.taskId, x, y: nodeY });
      maxX = Math.max(maxX, x + NODE_WIDTH);
      maxY = Math.max(maxY, nodeY + NODE_HEIGHT);

      let childY = yStart;
      node.children.forEach((child) => {
        edges.push({ id: `${node.key}-${child.key}`, from: node.key, to: child.key });
        const childHeight = (child.units ?? 1) * unitHeight - ROW_GAP;
        layoutNode(child, depth + 1, childY);
        childY += childHeight + ROW_GAP;
      });
      return yStart + blockHeight;
    };

    roots.value.forEach((rootId) => {
      const tree = buildTree(rootId, new Set(), nextKey);
      if (!tree) return;
      computeUnits(tree);
      const treeBottom = layoutNode(tree, 0, yOffset);
      yOffset = treeBottom + TREE_GAP;
      maxY = Math.max(maxY, treeBottom);
    });

    return {
      nodes,
      edges,
      width: maxX + PADDING,
      height: maxY + PADDING,
    };
  });

  const nodes = computed(() => layout.value.nodes);
  const nodePositions = computed(() => {
    const map = new Map<string, { x: number; y: number }>();
    layout.value.nodes.forEach((node) => {
      map.set(node.key, { x: node.x, y: node.y });
    });
    return map;
  });
  const canvasWidth = computed(() => layout.value.width);
  const canvasHeight = computed(() => layout.value.height);

  const edges = computed(() => {
    const paths: Array<{ id: string; path: string }> = [];
    layout.value.edges.forEach((edge) => {
      const parent = nodePositions.value.get(edge.from);
      const child = nodePositions.value.get(edge.to);
      if (!parent || !child) return;
      const startX = parent.x + NODE_WIDTH;
      const startY = parent.y + NODE_HEIGHT / 2;
      const endX = child.x;
      const endY = child.y + NODE_HEIGHT / 2;
      const midX = startX + (endX - startX) / 2;
      const path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      paths.push({ id: edge.id, path });
    });
    return paths;
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

  const availableTasks = computed(() => {
    if (userView.value === 'all') return [];
    return props.tasks
      .filter((task) => {
        const status = statusById.value.get(task.id);
        return status === 'available' || status === 'inprogress';
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  });

  const completeTask = (taskId: string) => {
    if (userView.value === 'all') return;
    const status = statusById.value.get(taskId);
    if (status !== 'available' && status !== 'inprogress') return;
    const task = tasksById.value.get(taskId);
    if (!task) return;
    actionTask.value = task;
    markTaskComplete();
  };

  const onKeyScroll = (event: KeyboardEvent) => {
    if (!canvasRef.value) return;
    const step = 120;
    if (event.key === 'ArrowRight') {
      canvasRef.value.scrollBy({ left: step, behavior: 'smooth' });
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      canvasRef.value.scrollBy({ left: -step, behavior: 'smooth' });
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      canvasRef.value.scrollBy({ top: step, behavior: 'smooth' });
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      canvasRef.value.scrollBy({ top: -step, behavior: 'smooth' });
      event.preventDefault();
    }
  };

  const focusCanvas = () => {
    canvasRef.value?.focus();
  };

  const onMouseDown = (event: MouseEvent) => {
    if (!canvasRef.value || event.button !== 1) return;
    isPanning.value = true;
    panStart.value = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: canvasRef.value.scrollLeft,
      scrollTop: canvasRef.value.scrollTop,
    };
    event.preventDefault();
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!isPanning.value || !canvasRef.value) return;
    const dx = event.clientX - panStart.value.x;
    const dy = event.clientY - panStart.value.y;
    canvasRef.value.scrollLeft = panStart.value.scrollLeft - dx;
    canvasRef.value.scrollTop = panStart.value.scrollTop - dy;
  };

  const onMouseUp = () => {
    isPanning.value = false;
  };
</script>
