<template>
  <div 
    ref="container" 
    class="flex min-w-0 flex-col overflow-hidden"
    :class="[
      expandable ? 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-md border border-gray-300 dark:border-white/20 p-2 transition-colors' : 'py-0.5',
      expanded ? 'bg-surface-50 dark:bg-surface-900 shadow-inner' : '',
      intent === 'error' ? 'bg-error-50 dark:bg-error-900/10' : ''
    ]"
    @click="onRowClick"
  >
    <div class="flex min-w-0 items-center overflow-hidden whitespace-nowrap">
      <!-- Hidden measurement span -->
      <span
        ref="measureSpan"
        class="invisible absolute whitespace-nowrap text-xs font-medium"
        aria-hidden="true"
      ></span>
      <!-- Icon support (expand arrow) -->
      <UIcon 
        v-if="expandable"
        :name="icon || 'i-mdi-chevron-right'"
        class="mr-1 h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200"
        :class="expanded ? 'rotate-90' : ''" 
      />
      <!-- Label -->
      <span 
        class="mr-2 shrink-0 text-sm font-medium"
        :class="intent === 'error' ? 'text-error-700 dark:text-error-400' : 'text-gray-700 dark:text-gray-200'"
      >
        {{ label }}:
      </span>
      <!-- Badges Container -->
      <div class="flex flex-1 flex-nowrap items-center gap-1.5 overflow-hidden">
        <span
          v-for="task in visibleTasks"
          :key="task.id"
          v-tooltip="task.name"
          class="inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs transition-colors hover:opacity-90 no-underline"
          :class="getBadgeClass(task)"
        >
          <span class="truncate">{{ task.name }}</span>
        </span>
        <span v-if="remainingCount > 0" class="shrink-0 text-xs text-gray-500 font-medium">
          +{{ remainingCount }}{{ hasSuffix ? ',' : '' }}
        </span>
        <span ref="suffixRef" class="shrink-0 text-xs">
          <slot name="suffix" />
        </span>
      </div>
      <button 
          v-if="expandable"
          type="button" 
          class="sr-only"
          :aria-expanded="expanded"
          @click.stop="toggle"
        >
          {{ expanded ? 'Collapse' : 'Expand' }}
        </button>
    </div>
    <div v-if="expanded" ref="bodyRef" class="mt-2 w-full min-w-0">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { computed, nextTick, onMounted, ref, watch, useSlots } from 'vue';
import { useProgressStore } from '@/stores/useProgress';
import { useTarkovStore } from '@/stores/useTarkov';
import type { Task } from '@/types/tarkov'; // Extra safety margin for suffix
const props = defineProps<{
  tasks: Task[];
  label: string;
  icon?: string;
  expandable?: boolean;
  expanded?: boolean;
  intent?: 'primary' | 'error' | 'gray' | 'warning';
}>();
const emit = defineEmits<{
  (e: 'toggle'): void;
}>();
const container = ref<HTMLElement | null>(null);
const measureSpan = ref<HTMLElement | null>(null);
const suffixRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const visibleCount = ref(1); 
const GAP_WIDTH = 6; 
const REMAINING_BADGE_WIDTH = 45; 
const PADDING_X_PER_BADGE = 16; 
const ICON_WIDTH = 20;
const LABEL_MARGIN = 8;
const CONTAINER_PADDING = props.expandable ? 16 : 0; // px-2 * 2 if expandable
const SUFFIX_MARGIN = 8;
// ... (existing imports)
const tarkovStore = useTarkovStore();
const progressStore = useProgressStore();
const slots = useSlots();
// Helper to determine status classes per task
const getBadgeClass = (task: Task) => {
  const isComplete = tarkovStore.isTaskComplete(task.id);
  const isFailed = tarkovStore.isTaskFailed(task.id);
  const isUnlocked = progressStore.unlockedTasks[task.id]?.self === true;
  const isBlocked = progressStore.invalidTasks?.[task.id]?.self === true;
  if (isComplete && !isFailed) return 'badge-soft-task-complete';
  if (isFailed) return 'badge-soft-task-failed';
  // Blocked -> Blocked color
  if (isBlocked) return 'badge-soft-task-blocked';
  // Available (Unlocked & Not Complete) -> Primary
  if (isUnlocked && !isComplete) return 'badge-soft-task-available';
  // Locked -> Locked color
  if (!isUnlocked) return 'badge-soft-task-locked';
  // Default fallback
  switch (props.intent) {
    case 'error': return 'badge-soft-task-failed';
    case 'warning': return 'badge-soft-task-locked'; // Locked
    case 'gray': return 'badge-soft-task-blocked'; // Blocked
    default: return 'badge-soft-task-available';
  }
};
const hasSuffix = computed(() => !!slots.suffix);
const onRowClick = (e: MouseEvent) => {
  if (props.expandable) {
    // Otherwise, this is a header interaction: stop bubbling (so we don't toggle parent rows) and toggle
    e.preventDefault();
    e.stopPropagation();
    toggle();
  }
};
const toggle = () => {
    emit('toggle');
};
// --- Measurement Logic ---
const calculateVisibleItems = () => {
  if (!container.value || !measureSpan.value) return;
  if (props.tasks.length === 0) {
      visibleCount.value = 0;
      return;
  }
  // Get font styles
  const style = window.getComputedStyle(measureSpan.value);
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  context.font = font;
  const measureText = (t: string) => context.measureText(t).width;
  const iconWidth = props.expandable ? ICON_WIDTH : 0;
  const labelTextWidth = measureText(props.label + ': '); 
  const labelTotalWidth = labelTextWidth + LABEL_MARGIN + iconWidth;
  const suffixWidth = suffixRef.value?.offsetWidth ? suffixRef.value.offsetWidth + SUFFIX_MARGIN : 0;
  const availableWidth = Math.max(0, containerWidth.value - labelTotalWidth - CONTAINER_PADDING - suffixWidth);
  let currentWidth = 0;
  let count = 0;
  for (let i = 0; i < props.tasks.length; i++) {
    const task = props.tasks[i];
    if (!task) continue;
    const textWidth = measureText(task.name ?? '');
    // Badge width = text + padding. Max width 192px (12rem)
    const badgeWidth = Math.min(192, textWidth + PADDING_X_PER_BADGE);
    const nextGap = i > 0 ? GAP_WIDTH : 0;
    if (currentWidth + nextGap + badgeWidth <= availableWidth) {
      currentWidth += nextGap + badgeWidth;
      count++;
    } else {
      break;
    }
  }
  // Check +N space if needed
  if (count < props.tasks.length) {
    const spaceNeeded = REMAINING_BADGE_WIDTH + GAP_WIDTH;
    while (count > 0 && (currentWidth + spaceNeeded > availableWidth)) {
        const lastIndex = count - 1;
        const lastTask = props.tasks[lastIndex];
        if (!lastTask) continue;
        const textWidth = measureText(lastTask.name ?? '');
        const badgeWidth = Math.min(192, textWidth + PADDING_X_PER_BADGE);
        const gap = lastIndex > 0 ? GAP_WIDTH : 0;
        currentWidth -= (badgeWidth + gap);
        count--;
    }
  }
  visibleCount.value = count;
};
useResizeObserver(container, (entries) => {
  const entry = entries[0];
  if (!entry) return;
  containerWidth.value = entry.contentRect.width;
  calculateVisibleItems();
});
watch(() => props.tasks, () => {
    calculateVisibleItems();
}, { deep: true });
onMounted(() => {
    nextTick(calculateVisibleItems);
});
const visibleTasks = computed(() => {
  return props.tasks.slice(0, visibleCount.value);
});
const remainingCount = computed(() => {
  return Math.max(0, props.tasks.length - visibleCount.value);
});
const bodyRef = ref<HTMLElement | null>(null);
</script>
