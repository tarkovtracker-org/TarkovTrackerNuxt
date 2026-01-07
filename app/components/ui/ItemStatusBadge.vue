<template>
  <div v-if="hasContent" class="peer/indicators absolute top-0 left-0 z-40">
    <div
      class="bg-surface-elevated flex items-center gap-1 rounded-tl rounded-br-lg bg-clip-padding px-2 py-1 shadow-lg"
      :class="[sizeClasses]"
    >
      <template v-if="showCount">
        <span :class="countTextClasses">{{ currentCount }}/{{ neededCount }}</span>
      </template>
      <ItemIndicators
        :size="size"
        :found-in-raid="foundInRaid"
        :is-craftable="isCraftable"
        :is-craftable-available="isCraftableAvailable"
        :craftable-title="craftableTitle"
        :kappa-required="isKappaRequired"
        :kappa-title="kappaTitle"
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
    isCraftableAvailable?: boolean;
    craftableTitle?: string;
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
    isCraftableAvailable: false,
    craftableTitle: 'Craftable',
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
    return 'text-sm font-bold';
  });
</script>
