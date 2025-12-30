<template>
  <div class="space-y-4">
    <div
      class="quest-tree-header flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-surface-900/70 px-5 py-4"
    >
      <div>
        <p class="text-sm font-semibold uppercase tracking-wider text-white/70">
          {{ t('page.tasks.questtree.title', 'Quest Tree') }}
        </p>
        <p class="text-xs text-white/60">
          {{ t('page.tasks.questtree.legend_context', 'Dependencies and progress overview.') }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="status-pill bg-green-500/20 text-green-300">
          {{ t('page.tasks.questtree.legend_available', 'Available') }}
        </span>
        <span class="status-pill bg-red-500/20 text-red-300">
          {{ t('page.tasks.questtree.legend_locked', 'Locked') }}
        </span>
        <span class="status-pill bg-primary-500/20 text-primary-200">
          {{ t('page.tasks.questtree.legend_completed', 'Completed') }}
        </span>
      </div>
    </div>
    <div class="quest-tree-canvas rounded-3xl border border-white/5 bg-surface-900/70 p-6">
      <div v-if="!hasNodes" class="flex flex-col items-center gap-3 py-12 text-center text-white/60">
        <UIcon name="i-mdi-source-branch-off" class="h-10 w-10 text-white/30" />
        <p>{{ t('page.tasks.questtree.empty', 'No quest data available.') }}</p>
      </div>
      <div v-else class="quest-tree-scroll relative overflow-auto">
        <div
          class="quest-tree-stage relative"
          :style="{
            width: `${graphWidth}px`,
            height: `${graphHeight}px`,
          }"
        >
          <svg
            class="pointer-events-none absolute inset-0"
            :width="graphWidth"
            :height="graphHeight"
            fill="none"
          >
            <path
              v-for="edge in edges"
              :key="edge.key"
              :d="edge.path"
              stroke="rgba(255,255,255,0.25)"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <QuestTreeNodeCard
            v-for="node in positionedNodes"
            :key="node.key"
            :task="node.task"
            :status="taskStatus(node.task.id)"
            :node-style="node.style"
            @finish="emit('finish', $event)"
            @cancel="emit('cancel', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import QuestTreeNodeCard from '@/features/tasks/QuestTreeNodeCard.vue';
  import type { TaskTreeNode } from '@/composables/useQuestTree';
  import type { Task } from '@/types/tarkov';

  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 120;
  const H_SPACING = 160;
  const V_SPACING = 120;
  const CANVAS_PADDING = 80;

  interface PositionedNode {
    key: string;
    task: Task;
    x: number;
    y: number;
    style: Record<string, string>;
  }

  interface EdgePath {
    key: string;
    path: string;
  }

  const emit = defineEmits(['finish', 'cancel']);

  const props = defineProps<{
    nodes: TaskTreeNode[];
    taskStatuses: Record<string, 'available' | 'locked' | 'completed'>;
  }>();

  const { t } = useI18n({ useScope: 'global' });

  const hasNodes = computed(() => props.nodes.length > 0);
  const taskStatus = (id: string) => props.taskStatuses[id] ?? 'locked';

  const layout = computed(() => buildLayout(props.nodes));
  const positionedNodes = computed(() => layout.value.nodes);
  const edges = computed(() => layout.value.edges);
  const graphWidth = computed(() => layout.value.width);
  const graphHeight = computed(() => layout.value.height);

  function buildLayout(nodes: TaskTreeNode[]) {
    const nodeDepth = new WeakMap<TaskTreeNode, number>();
    const nodeOrder = new WeakMap<TaskTreeNode, number>();
    let currentOrder = 0;
    let maxDepth = 0;
    let maxOrder = 0;

    const assignOrder = (node: TaskTreeNode, depth: number, lineage: Set<TaskTreeNode>) => {
      if (lineage.has(node)) {
        const existingOrder = nodeOrder.get(node);
        if (existingOrder !== undefined) return existingOrder;
        nodeOrder.set(node, currentOrder);
        return currentOrder;
      }
      nodeDepth.set(node, depth);
      maxDepth = Math.max(maxDepth, depth);
      const childLineage = new Set(lineage);
      childLineage.add(node);

      if (!node.children.length) {
        const order = currentOrder++;
        nodeOrder.set(node, order);
        maxOrder = Math.max(maxOrder, order);
        return order;
      }
      const childOrders = node.children.map((child) => assignOrder(child, depth + 1, childLineage));
      if (childOrders.length === 0) {
        const order = currentOrder++;
        nodeOrder.set(node, order);
        maxOrder = Math.max(maxOrder, order);
        return order;
      }
      const minOrder = Math.min(...childOrders);
      const maxChildOrder = Math.max(...childOrders);
      const order = (minOrder + maxChildOrder) / 2;
      nodeOrder.set(node, order);
      maxOrder = Math.max(maxOrder, order);
      return order;
    };

    nodes.forEach((node) => assignOrder(node, 0, new Set()));

    const positioned: PositionedNode[] = [];
    const edgePaths: EdgePath[] = [];

    const toCoords = (node: TaskTreeNode) => {
      const depth = nodeDepth.get(node) ?? 0;
      const order = nodeOrder.get(node) ?? 0;
      const x = depth * (NODE_WIDTH + H_SPACING) + CANVAS_PADDING;
      const y = order * (NODE_HEIGHT + V_SPACING) + CANVAS_PADDING;
      return { x, y };
    };

    const traverse = (node: TaskTreeNode, keyPrefix: string) => {
      const coords = toCoords(node);
      positioned.push({
        key: `${keyPrefix}-${node.task.id}`,
        task: node.task,
        x: coords.x,
        y: coords.y,
        style: {
          transform: `translate3d(${coords.x}px, ${coords.y}px, 0)`,
        },
      });
      node.children.forEach((child, index) => {
        const childCoords = toCoords(child);
        const path = buildEdgePath(coords, childCoords);
        edgePaths.push({
          key: `${node.task.id}-${child.task.id}-${index}-${keyPrefix}`,
          path,
        });
        traverse(child, `${keyPrefix}-${index}`);
      });
    };

    nodes.forEach((node, index) => traverse(node, `root-${index}`));

    const width = (maxDepth + 1) * (NODE_WIDTH + H_SPACING) + CANVAS_PADDING * 2;
    const height = (maxOrder + 1) * (NODE_HEIGHT + V_SPACING) + CANVAS_PADDING * 2;

    return { nodes: positioned, edges: edgePaths, width, height };
  }

  function buildEdgePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
    const startX = from.x + NODE_WIDTH;
    const startY = from.y + NODE_HEIGHT / 2;
    const endX = to.x;
    const endY = to.y + NODE_HEIGHT / 2;
    const offset = (endX - startX) / 2;
    return `M ${startX} ${startY} C ${startX + offset} ${startY}, ${endX - offset} ${endY}, ${endX} ${endY}`;
  }
</script>
<style scoped>
.quest-tree-header {
  border-color: rgba(255, 255, 255, 0.08);
}
.quest-tree-canvas {
  border-color: rgba(255, 255, 255, 0.08);
  min-height: 520px;
}
.quest-tree-scroll {
  max-height: 70vh;
  padding: 0.5rem;
}
.quest-tree-stage {
  min-width: 100%;
  min-height: 100%;
  padding-bottom: 2rem;
}
.quest-tree-stage ::v-deep(.quest-node) {
  will-change: transform;
  transition: transform 0.2s ease;
}
.status-pill {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.15rem 0.75rem;
}
</style>
