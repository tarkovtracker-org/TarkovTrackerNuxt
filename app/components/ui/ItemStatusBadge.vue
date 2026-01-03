<template>
  <div v-if="hasContent" class="peer/indicators absolute top-0 left-0 z-40">
    <div
      class="flex items-center gap-1 px-2 py-1 shadow-lg bg-surface-elevated bg-clip-padding rounded-tl rounded-br-lg"
      :class="[sizeClasses]"
    >
      <template v-if="showCount">
        <span :class="countTextClasses">{{ currentCount }}/{{ neededCount }}</span>
      </template>
      <ItemIndicators
        :found-in-raid="foundInRaid"
        :fir-icon-class="indicatorIconClass"
        :is-craftable="isCraftable"
        :craftable-title="craftableTitle"
        :craftable-icon-base-class="indicatorIconClass"
        :craftable-icon-class="craftableIconClass"
        :kappa-required="isKappaRequired"
        :kappa-title="kappaTitle"
        :kappa-icon-class="kappaKappaIconClass"
        @craft="emit('craft')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import ItemIndicators from '@/features/neededitems/ItemIndicators.vue';

  interface Props {
    currentCount?: number;
    neededCount?: number;
    showCount?: boolean;
    isComplete?: boolean;
    foundInRaid?: boolean;
    isCraftable?: boolean;
    craftableTitle?: string;
    craftableIconClass?: string;
    isKappaRequired?: boolean;
    kappaTitle?: string;
    size?: 'sm' | 'md';
  }

  const props = withDefaults(defineProps<Props>(), {
    currentCount: 0,
    neededCount: 1,
    showCount: true,
    isComplete: false,
    foundInRaid: false,
    isCraftable: false,
    craftableTitle: 'Craftable',
    craftableIconClass: '',
    isKappaRequired: false,
    kappaTitle: 'Required for Kappa quest',
    size: 'md',
  });

  const emit = defineEmits<{
    craft: [];
  }>();

  // Hide badge entirely if nothing to show
  const hasContent = computed(() => {
    return props.showCount || props.foundInRaid || props.isCraftable || props.isKappaRequired;
  });

  const countTextClasses = computed(() => ({
    'text-content-primary': !props.isComplete,
    'text-success-600 dark:text-success-400 font-bold': props.isComplete,
  }));

  const sizeClasses = computed(() => {
    if (props.size === 'sm') {
      return 'text-xs font-semibold';
    }
    return 'text-sm font-bold';
  });

  const indicatorIconClass = computed(() => {
    if (props.size === 'sm') {
      return 'h-3 w-3';
    }
    return 'h-4 w-4';
  });

  const kappaKappaIconClass = computed(() => {
    const baseSize = props.size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    return `${baseSize} text-entity-kappa`;
  });
</script>
