<template>
  <button
    type="button"
    :class="[
      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
      'focus:ring-accent-500 focus:ring-1 focus:outline-none',
      active
        ? 'bg-accent-100 text-accent-900 shadow-sm dark:bg-accent-500/20 dark:text-accent-100 dark:shadow-none'
        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5',
    ]"
    v-bind="$attrs"
  >
    <!-- Icon Slot or Prop -->
    <UIcon v-if="icon" :name="icon" class="h-4 w-4" />
    <slot name="icon" />
    <!-- Label -->
    <span :class="labelClass">
      <slot>{{ label }}</slot>
    </span>
    <!-- Count Badge -->
    <span
      v-if="count !== undefined || $slots.count"
      :class="[
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ml-0.5',
        countColorClass
      ]"
    >
      <slot name="count">{{ count }}</slot>
    </span>
    <!-- Optional Badge/Extra slot -->
    <slot name="badge" />
  </button>
</template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  label?: string;
  active?: boolean;
  count?: number;
  icon?: string;
  countColor?: string; // Optional override for badge color
  labelClass?: string; // Optional class for label span to handle responsiveness (hidden sm:inline etc)
}>();
const countColorClass = computed(() => {
    if (props.countColor) return props.countColor;
    return (props.count && props.count > 0) || props.active 
      ? 'badge-soft-accent' 
      : 'badge-soft-surface';
});
</script>

