<template>
  <div
    :class="[
      'relative overflow-hidden rounded-xl border p-6 transition-all',
      isAchieved ? achievedClasses : 'border-base bg-surface-elevated opacity-50 dark:bg-surface-900/50 dark:border-primary-700/30',
    ]"
  >
    <div class="relative z-10">
      <UIcon
        :name="isAchieved ? achievedIcon : unachievedIcon"
        :class="['mb-3 h-12 w-12', isAchieved ? iconColorClass : 'text-content-tertiary dark:text-surface-600']"
      />
      <div class="mb-1 text-3xl font-bold text-content-primary">{{ title }}</div>
      <div class="text-xs tracking-wider uppercase text-content-secondary dark:text-surface-400">{{ subtitle }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
  export type MilestoneColor = 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'purple' | 'kappa' | 'lightkeeper';
  const props = withDefaults(
    defineProps<{
      title: string;
      subtitle: string;
      isAchieved: boolean;
      achievedIcon: string;
      unachievedIcon: string;
      color?: MilestoneColor;
    }>(),
    {
      color: 'primary' as MilestoneColor,
    }
  );
  const colorClasses: Record<MilestoneColor, { achieved: string; icon: string }> = {
    primary: {
      achieved: [
        'bg-linear-to-br from-primary-50 to-white border-primary-200 dark:from-primary-900/40 dark:to-surface-900 dark:border-primary-600/50',
        'shadow-lg shadow-primary-100 dark:shadow-primary-900/20',
      ].join(' '),
      icon: 'text-primary-600 dark:text-primary-400',
    },
    accent: {
      achieved: [
        'bg-linear-to-br from-accent-50 to-white border-accent-200 dark:from-accent-900/40 dark:to-surface-900 dark:border-accent-600/50',
        'shadow-lg shadow-accent-100 dark:shadow-accent-900/20',
      ].join(' '),
      icon: 'text-accent-600 dark:text-accent-400',
    },
    info: {
      achieved: [
        'bg-linear-to-br from-info-50 to-white border-info-200 dark:from-info-900/40 dark:to-surface-900 dark:border-info-600/50',
        'shadow-lg shadow-info-100 dark:shadow-info-900/20',
      ].join(' '),
      icon: 'text-info-600 dark:text-info-400',
    },
    success: {
      achieved: [
        'bg-linear-to-br from-success-50 to-white border-success-200 dark:from-success-900/40 dark:to-surface-900 dark:border-success-600/50',
        'shadow-lg shadow-success-100 dark:shadow-success-900/20',
      ].join(' '),
      icon: 'text-success-600 dark:text-success-400',
    },
    warning: {
      achieved: [
        'bg-linear-to-br from-warning-50 to-white border-warning-200 dark:from-warning-900/40 dark:to-surface-900 dark:border-warning-600/50',
        'shadow-lg shadow-warning-100 dark:shadow-warning-900/20',
      ].join(' '),
      icon: 'text-warning-600 dark:text-warning-400',
    },
    purple: {
      achieved: [
        'bg-linear-to-br from-purple-50 to-white border-purple-200 dark:from-purple-900/40 dark:to-surface-900 dark:border-purple-600/50',
        'shadow-lg shadow-purple-100 dark:shadow-purple-900/20',
      ].join(' '),
      icon: 'text-purple-600 dark:text-purple-400',
    },
    kappa: {
      achieved: [
        'bg-linear-to-br from-[color-mix(in_srgb,var(--color-entity-kappa),white_90%)] to-white border-[color-mix(in_srgb,var(--color-entity-kappa),white_60%)]',
        'dark:from-[color-mix(in_srgb,var(--color-entity-kappa),transparent_85%)] dark:to-surface-900 dark:border-[color-mix(in_srgb,var(--color-entity-kappa),transparent_70%)]',
        'shadow-lg shadow-[color-mix(in_srgb,var(--color-entity-kappa),transparent_80%)] dark:shadow-[color-mix(in_srgb,var(--color-entity-kappa),transparent_90%)]',
      ].join(' '),
      icon: 'text-[var(--color-entity-kappa)]',
    },
    lightkeeper: {
      achieved: [
        'bg-linear-to-br from-[color-mix(in_srgb,var(--color-entity-lightkeeper),white_90%)] to-white border-[color-mix(in_srgb,var(--color-entity-lightkeeper),white_60%)]',
        'dark:from-[color-mix(in_srgb,var(--color-entity-lightkeeper),transparent_85%)] dark:to-surface-900 dark:border-[color-mix(in_srgb,var(--color-entity-lightkeeper),transparent_70%)]',
        'shadow-lg shadow-[color-mix(in_srgb,var(--color-entity-lightkeeper),transparent_80%)] dark:shadow-[color-mix(in_srgb,var(--color-entity-lightkeeper),transparent_90%)]',
      ].join(' '),
      icon: 'text-[var(--color-entity-lightkeeper)]',
    },
  };
  const achievedClasses = computed(() => colorClasses[props.color].achieved);
  const iconColorClass = computed(() => colorClasses[props.color].icon);
</script>
