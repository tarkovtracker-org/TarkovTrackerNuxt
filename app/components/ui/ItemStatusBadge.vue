<template>
  <div v-if="hasContent" class="peer/indicators pointer-events-auto absolute top-0 left-0 z-50">
    <div
      class="bg-surface-elevated flex items-center rounded-tl rounded-br-lg bg-clip-padding shadow-lg"
      :class="[sizeClasses]"
    >
      <ItemIndicators
        :size="size"
        :current-count="currentCount"
        :needed-count="neededCount"
        :show-count="showCount"
        :is-complete="isComplete"
        :show-icons="showIcons"
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
    size?: 'sm' | 'md' | 'lg';
    showIcons?: boolean;
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
    kappaTitle: 'Required for Kappa task',
    size: 'md',
    showIcons: true,
  });
  const emit = defineEmits<{
    craft: [];
  }>();
  // Hide badge entirely if nothing to show
  const hasContent = computed(() => {
    return (
      props.showCount ||
      (props.showIcons && (props.foundInRaid || props.isCraftable || props.isKappaRequired))
    );
  });
  const sizeClasses = computed(() => {
    if (props.size === 'sm') {
      return 'text-xs font-semibold px-1 py-0.5 gap-1';
    }
    if (props.size === 'lg') {
      return 'text-base font-bold px-3 py-1.5 gap-2';
    }
    return 'text-sm font-bold px-2 py-1 gap-1';
  });
</script>
