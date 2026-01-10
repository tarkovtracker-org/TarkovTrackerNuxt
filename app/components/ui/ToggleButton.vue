<template>
  <button
    v-tooltip="props.tooltip"
    type="button"
    :disabled="props.disabled"
    :aria-pressed="props.isActive"
    :aria-label="props.ariaLabel"
    class="focus-ring flex items-center justify-center rounded-md border transition-colors"
    :class="[sizeClass, stateClass]"
    @click="emit('toggle')"
  >
    <UIcon :name="iconName" aria-hidden="true" :class="iconSizeClass" />
  </button>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  const props = withDefaults(
    defineProps<{
      /** Whether the toggle is in active/complete state */
      isActive: boolean;
      /** Disable interaction */
      disabled?: boolean;
      /** Styling variant */
      variant?: 'complete' | 'collect' | 'custom';
      /** Button size */
      size?: 'sm' | 'md' | 'lg';
      /** Icon for active state */
      activeIcon?: string;
      /** Icon for inactive state */
      inactiveIcon?: string;
      /** Tooltip text */
      tooltip?: string;
      /** Accessibility label (required) */
      ariaLabel?: string;
      /** Custom class for active state (when variant="custom") */
      activeClass?: string;
      /** Custom class for inactive state (when variant="custom") */
      inactiveClass?: string;
    }>(),
    {
      disabled: false,
      variant: 'complete',
      size: 'md',
      activeIcon: 'i-mdi-check',
      inactiveIcon: 'i-mdi-circle-outline',
      tooltip: undefined,
      ariaLabel: '',
      activeClass: undefined,
      inactiveClass: undefined,
    }
  );
  const emit = defineEmits<{
    toggle: [];
  }>();
  const iconName = computed(() => {
    return props.isActive ? props.activeIcon : props.inactiveIcon;
  });
  const sizeClass = computed(() => {
    switch (props.size) {
      case 'sm':
        return 'h-6 w-6';
      case 'lg':
        return 'h-12 w-12';
      default:
        return 'h-7 w-7';
    }
  });
  const iconSizeClass = computed(() => {
    switch (props.size) {
      case 'sm':
        return 'h-3.5 w-3.5';
      case 'lg':
        return 'h-8 w-8';
      default:
        return 'h-4 w-4';
    }
  });
  const stateClass = computed(() => {
    if (props.variant === 'custom') {
      return (props.isActive ? props.activeClass : props.inactiveClass) || '';
    }
    if (props.variant === 'complete') {
      return props.isActive
        ? 'badge-soft-task-complete'
        : 'clickable border-gray-300 bg-white text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300';
    }
    // variant === 'collect'
    return props.isActive
      ? 'badge-soft-task-complete'
      : 'clickable bg-surface-elevated text-content-secondary border-base hover:text-content-primary';
  });
</script>
