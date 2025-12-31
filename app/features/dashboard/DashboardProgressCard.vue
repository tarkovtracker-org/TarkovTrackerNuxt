<template>
  <div
    :class="[
      'cursor-pointer rounded-xl border border-base bg-surface-elevated p-6 shadow-lg dark:bg-surface-900 dark:border-primary-700/30',
      'transition-colors',
      hoverBorderClass,
    ]"
    role="button"
    tabindex="0"
    :aria-label="buttonAriaLabel"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center">
        <div
          class="mr-3 flex h-10 w-10 items-center justify-center rounded-lg"
          :class="iconBgClass"
        >
          <UIcon :name="icon" class="h-5 w-5" :class="iconColorClass" />
        </div>
        <div>
          <div class="text-sm tracking-wider uppercase text-content-secondary dark:text-surface-400">
            {{ label }}
          </div>
          <div class="text-2xl font-bold text-content-primary">{{ completed }}/{{ total }}</div>
        </div>
      </div>
      <div class="text-3xl font-bold" :class="percentageColorClass">{{ percentageDisplay }}%</div>
    </div>
    <div class="relative h-3 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
      <div
        class="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
        :class="holidayEffectsEnabled ? 'candy-cane' : barGradientClass"
        :style="{ width: `${percentage}%` }"
        role="progressbar"
        :aria-label="progressAriaLabel"
        :aria-valuenow="percentage"
        aria-valuemin="0"
        aria-valuemax="100"
      ></div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { usePreferencesStore } from '@/stores/usePreferences';
  export type ProgressCardColor = 'primary' | 'info' | 'success' | 'warning' | 'purple';
  const props = defineProps<{
    icon: string;
    label: string;
    completed: number;
    total: number;
    percentage: number;
    color: ProgressCardColor;
  }>();
  defineEmits<{
    click: [];
  }>();
  const preferencesStore = usePreferencesStore();
  const holidayEffectsEnabled = computed(() => preferencesStore.getEnableHolidayEffects);
  // Normalize the label to avoid awkward fallback phrases
  const normalizedLabel = computed(() => {
    const trimmed = props.label.trim();
    return trimmed || 'unlabeled progress';
  });
  // Computed aria-labels for accessibility
  const buttonAriaLabel = computed(() => `View details for ${normalizedLabel.value}`);
  const progressAriaLabel = computed(() => `${normalizedLabel.value} progress`);
  const colorClasses: Record<
    ProgressCardColor,
    { hover: string; iconBg: string; icon: string; percentage: string; bar: string }
  > = {
    primary: {
      hover: 'hover:border-primary-500/50 dark:hover:border-primary-700/50',
      iconBg: 'bg-primary-50 dark:bg-primary-600/15',
      icon: 'text-primary-600 dark:text-primary-400',
      percentage: 'text-primary-600 dark:text-primary-400',
      bar: 'from-primary-500 to-primary-400 bg-gradient-to-r',
    },
    info: {
      hover: 'hover:border-info-500/50 dark:hover:border-info-700/50',
      iconBg: 'bg-info-50 dark:bg-info-600/15',
      icon: 'text-info-600 dark:text-info-400',
      percentage: 'text-info-600 dark:text-info-400',
      bar: 'from-info-500 to-info-400 bg-gradient-to-r',
    },
    success: {
      hover: 'hover:border-success-500/50 dark:hover:border-success-700/50',
      iconBg: 'bg-success-50 dark:bg-success-600/15',
      icon: 'text-success-600 dark:text-success-400',
      percentage: 'text-success-600 dark:text-success-400',
      bar: 'from-success-500 to-success-400 bg-gradient-to-r',
    },
    warning: {
      hover: 'hover:border-warning-500/50 dark:hover:border-warning-700/50',
      iconBg: 'bg-warning-50 dark:bg-warning-600/15',
      icon: 'text-warning-600 dark:text-warning-400',
      percentage: 'text-warning-600 dark:text-warning-400',
      bar: 'from-warning-500 to-warning-400 bg-gradient-to-r',
    },
    purple: {
      hover: 'hover:border-purple-500/50 dark:hover:border-purple-700/50',
      iconBg: 'bg-purple-50 dark:bg-purple-600/15',
      icon: 'text-purple-600 dark:text-purple-400',
      percentage: 'text-purple-600 dark:text-purple-400',
      bar: 'from-purple-500 to-purple-400 bg-gradient-to-r',
    },
  };
  const hoverBorderClass = computed(() => colorClasses[props.color].hover);
  const iconBgClass = computed(() => colorClasses[props.color].iconBg);
  const iconColorClass = computed(() => colorClasses[props.color].icon);
  const percentageColorClass = computed(() => colorClasses[props.color].percentage);
  const barGradientClass = computed(() => colorClasses[props.color].bar);
  const percentageDisplay = computed(() => props.percentage.toFixed(2));
</script>
