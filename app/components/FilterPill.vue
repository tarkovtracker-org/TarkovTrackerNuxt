<template>
  <button
    type="button"
    :class="[
      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
      active
        ? 'bg-accent-100 text-accent-900 dark:bg-accent-500/20 dark:text-accent-100 shadow-sm dark:shadow-none'
        : 'hover-effect text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
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
        'ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
        countColorClass,
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
    if (props.countColor === 'plain') return 'bg-transparent text-current px-0 min-w-4';
    if (props.countColor) return props.countColor;
    return (props.count && props.count > 0) || props.active
      ? 'badge-soft-accent'
      : 'badge-soft-surface';
  });
</script>
