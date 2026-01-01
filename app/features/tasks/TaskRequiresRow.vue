<template>
  <div ref="container" class="flex min-w-0 flex-1 items-center overflow-hidden">
    <!-- Hidden measurement span -->
    <span
      ref="measureSpan"
      class="invisible absolute whitespace-nowrap text-[11px] font-medium"
      aria-hidden="true"
    ></span>

    <span class="mr-2 shrink-0 text-gray-700 dark:text-gray-200">
      {{ $t('page.tasks.questcard.requires', 'Requires') }}:
    </span>
    
    <div class="flex flex-1 flex-nowrap items-center gap-1.5 overflow-hidden">
      <router-link
        v-for="parent in visibleParents"
        :key="parent.id"
        v-tooltip="parent.name"
        :to="`/tasks?task=${parent.id}`"
        class="inline-flex max-w-[12rem] shrink-0 items-center rounded-md bg-primary-600! px-2 py-0.5 text-[11px] text-white! hover:bg-primary-700!"
        @click.stop
      >
        <span class="truncate">{{ parent.name }}</span>
      </router-link>
      
      <span v-if="remainingCount > 0" class="shrink-0 text-gray-500 text-xs">
        +{{ remainingCount }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { Task } from '@/types/tarkov';

const props = defineProps<{
  parents: Task[];
}>();

const container = ref<HTMLElement | null>(null);
const measureSpan = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const visibleCount = ref(1); // Default to showing at least 1 if possible
const GAP_WIDTH = 6; // gap-1.5 is 6px
const REMAINING_Badge_WIDTH = 30; // Approx width for "+N"
const PADDING_X = 16; // px-2 * 2 = 16px (approx padding for badge)

// Helper to estimate text width using canvas
// We use a canvas created once to avoid overhead
let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;

const getTextWidth = (text: string, font: string) => {
  if (!canvas) {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
  }
  if (!context) return 0;
  context.font = font;
  return context.measureText(text).width;
};

const calculateVisibleItems = () => {
  if (!container.value || !measureSpan.value || props.parents.length === 0) return;

  // Get available width for badges
  // Container width - Label width ("Requires:") - Label margin
  // We can approximate or measure the flex container's available content box
  // Since the structure is: Label | [Badges Container]
  // We should measure the container wrapping the badges, OR measure the parent and subtract the label.
  // The logic below assumes 'container' ref is the whole row. 
  // Let's refine: The badges are in the inner div. Let's rely on `containerWidth` monitoring the *whole* row
  // and subtracting the label's width.
  
  // Actually, standardizing on a simpler approach:
  // Render invisible span to get font styles
  const style = window.getComputedStyle(measureSpan.value);
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  // Get the label width
  // We can assume the label is roughly static or measure it. 
  // "Requires: " is about 55-60px.
  // Let's rely on the container width passed by ResizeObserver
  // But wait, the container includes the label.
  // A better approach is to put the ref on the badge list container? 
  // No, the label is fixed. Let's just deduct it.
  const labelWidth = 65; // Approximate width for "Requires: " + margin
  const availableWidth = Math.max(0, containerWidth.value - labelWidth);

  let currentWidth = 0;
  let count = 0;

  for (let i = 0; i < props.parents.length; i++) {
    const parent = props.parents[i];
    const textWidth = getTextWidth(parent.name, font);
    // Badge width = text + padding + border/handling. Max width 192px (12rem)
    const badgeWidth = Math.min(192, textWidth + PADDING_X);
    
    // Check if adding this badge fits
    // We need to account for GAP if it's not the first item
    const nextGap = i > 0 ? GAP_WIDTH : 0;
    
    // If this is the LAST item, it just needs to fit.
    // If it's NOT the last item, adding it means we might need space for "+N" if the NEXT one doesn't fit.
    // So we check: fit this badge + gap?
    
    if (currentWidth + nextGap + badgeWidth <= availableWidth) {
      currentWidth += nextGap + badgeWidth;
      count++;
    } else {
      // It doesn't fit. 
      // Do we need to backtrack to make room for "+N"?
      // If we are cutting off items, we need to show +N.
      // Does "+N" fit in the remaining space?
      // If currentWidth + remainingBadge > availableWidth, we might need to remove the previous item.
      
      // Let's simplify:
      // If we stop here, we have `count` items. We need to check if `count` items + "+N" fits.
      // If count < total, we need space for +N.
      
      const spaceNeededForPlusN = GAP_WIDTH + REMAINING_Badge_WIDTH;
      
      // If we are already over budget, we definitely stop.
      // But we might need to remove the *last successfully added* item to make room for +N
      // if we are truly out of space.
      
      // Actually, let's just break loop.
      break;
    }
  }
  
  // Post-loop check: If we didn't fit all items, we need to ensure we have space for the "+N" badge.
  if (count < props.parents.length) {
    const spaceNeeded = REMAINING_Badge_WIDTH + GAP_WIDTH; // Gap + badge
    // We calculated `currentWidth` for `count` items.
    // Does `currentWidth + spaceNeeded` exceed `availableWidth`?
    // If yes, remove items until it fits.
    while (count > 0 && (currentWidth + spaceNeeded > availableWidth)) {
        // Remove last added item
        const lastIndex = count - 1;
        const lastParent = props.parents[lastIndex];
        const textWidth = getTextWidth(lastParent.name, font);
        const badgeWidth = Math.min(192, textWidth + PADDING_X);
        const gap = lastIndex > 0 ? GAP_WIDTH : 0;
        
        currentWidth -= (badgeWidth + gap);
        count--;
    }
  }

  visibleCount.value = Math.max(0, count);
};

// Re-calculate when width changes
useResizeObserver(container, (entries) => {
  const entry = entries[0];
  containerWidth.value = entry.contentRect.width;
  calculateVisibleItems();
});

// Re-calculate when data changes
watch(() => props.parents, () => {
    calculateVisibleItems();
}, { deep: true });

onMounted(() => {
    nextTick(calculateVisibleItems);
});

const visibleParents = computed(() => {
  return props.parents.slice(0, visibleCount.value);
});

const remainingCount = computed(() => {
  return Math.max(0, props.parents.length - visibleCount.value);
});
</script>
