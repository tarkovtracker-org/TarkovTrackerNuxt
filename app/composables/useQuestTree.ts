import type { Task } from '@/types/tarkov';

export interface TaskTreeNode {
  task: Task;
  children: TaskTreeNode[];
  isVisible: boolean;
}

/**
 * Build a quest tree forest using the complete task list while
 * preserving filter visibility by only rendering nodes that match
 * the filtered subset or contain descendants that do.
 */
export function buildQuestTree(allTasks: Task[], visibleTasks: Task[]): TaskTreeNode[] {
  if (!Array.isArray(allTasks) || allTasks.length === 0) return [];
  if (!Array.isArray(visibleTasks) || visibleTasks.length === 0) return [];

  const taskMap = new Map<string, Task>();
  allTasks.forEach((task) => taskMap.set(task.id, task));

  const visibleTaskMap = new Map<string, Task>();
  visibleTasks.forEach((task) => visibleTaskMap.set(task.id, task));
  const visibleIds = new Set(visibleTaskMap.keys());

  const hasParentWithinList = new Set<string>();
  allTasks.forEach((task) => {
    (task.parents || []).forEach((parentId) => {
      if (taskMap.has(parentId)) {
        hasParentWithinList.add(task.id);
      }
    });
  });

  const visitedIds = new Set<string>();
  const forest: TaskTreeNode[] = [];

  const buildNode = (task: Task | undefined, lineage: Set<string>): TaskTreeNode | null => {
    if (!task) return null;
    if (lineage.has(task.id)) {
      return null;
    }
    const updatedLineage = new Set(lineage);
    updatedLineage.add(task.id);
    const children =
      task.children
        ?.map((childId) => buildNode(taskMap.get(childId), updatedLineage))
        .filter((childNode): childNode is TaskTreeNode => !!childNode) ?? [];
    const isVisible = visibleIds.has(task.id);
    if (!isVisible && children.length === 0) {
      return null;
    }
    const hydratedTask = visibleTaskMap.get(task.id) ?? task;
    return { task: hydratedTask, children, isVisible };
  };

  const collectIds = (node: TaskTreeNode) => {
    visitedIds.add(node.task.id);
    node.children.forEach(collectIds);
  };

  for (const task of allTasks) {
    if (!hasParentWithinList.has(task.id) && !visitedIds.has(task.id)) {
      const node = buildNode(task, new Set());
      if (node) {
        forest.push(node);
        collectIds(node);
      }
    }
  }

  for (const task of allTasks) {
    if (visitedIds.has(task.id)) continue;
    const node = buildNode(task, new Set());
    if (node) {
      forest.push(node);
      collectIds(node);
    }
  }

  return forest;
}

export function treeContainsTask(node: TaskTreeNode, targetTaskId: string): boolean {
  if (!node) return false;
  if (node.task.id === targetTaskId) return true;
  return node.children.some((child) => treeContainsTask(child, targetTaskId));
}
