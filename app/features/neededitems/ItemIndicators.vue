<template>
  <span class="inline-flex items-center gap-1">
    <template v-if="showCount">
      <span :class="countTextClasses">{{ currentCount }}/{{ neededCount }}</span>
    </template>
    <template v-if="showIcons">
      <span v-if="foundInRaid" v-tooltip="computedFoundInRaidTitle" class="inline-flex">
        <UIcon
          name="i-mdi-checkbox-marked-circle-outline"
          :class="[iconSizeClasses, firIconClass]"
        />
      </span>
      <button
        v-if="isCraftable"
        v-tooltip="craftableTitleText"
        type="button"
        class="inline-flex"
        :aria-label="craftableTitleText"
        @click.stop="emit('craft')"
      >
        <UIcon
          name="i-mdi-hammer-wrench"
          :class="[iconSizeClasses, craftableColorClass, craftableIconClass]"
        />
      </button>
      <span v-if="kappaRequired" v-tooltip="kappaTitleText" class="inline-flex">
        <UIcon
          name="i-mdi-trophy"
          :class="[iconSizeClasses, 'text-entity-kappa', kappaIconClass]"
        />
      </span>
    </template>
  </span>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  const { t } = useI18n({ useScope: 'global' });
  const props = withDefaults(
    defineProps<{
      size?: 'sm' | 'md' | 'lg';
      currentCount?: number;
      neededCount?: number;
      showCount?: boolean;
      isComplete?: boolean;
      showIcons?: boolean;
      foundInRaid: boolean;
      foundInRaidTitle?: string;
      firIconClass?: string;
      isCraftable: boolean;
      isCraftableAvailable?: boolean;
      craftableTitle?: string;
      craftableIconClass?: string;
      kappaRequired?: boolean;
      kappaTitle?: string;
      kappaIconClass?: string;
    }>(),
    {
      size: 'md',
      currentCount: 0,
      neededCount: 1,
      showCount: false,
      isComplete: false,
      showIcons: true,
      foundInRaidTitle: '',
      firIconClass: '',
      isCraftableAvailable: false,
      craftableTitle: '',
      craftableIconClass: '',
      kappaRequired: false,
      kappaTitle: '',
      kappaIconClass: '',
    }
  );
  const emit = defineEmits<{
    craft: [];
  }>();
  const iconSizeClasses = computed(() => {
    switch (props.size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      case 'md':
      default:
        return 'h-4 w-4';
    }
  });
  const craftableColorClass = computed(() => {
    return props.isCraftableAvailable
      ? 'text-success-600 dark:text-success-400'
      : 'text-surface-400';
  });
  const countTextClasses = computed(() => ({
    'text-content-primary': !props.isComplete,
    'text-success-600 dark:text-success-400 font-bold': props.isComplete,
  }));
  // Tooltip text with fallbacks to translations
  const craftableTitleText = computed(() => {
    return props.craftableTitle || t('page.neededitems.craftable', 'Craftable');
  });
  const computedFoundInRaidTitle = computed(() => {
    return props.foundInRaidTitle || t('page.neededitems.fir_required', 'Found in Raid required');
  });
  const kappaTitleText = computed(() => {
    return props.kappaTitle || t('task.kappa_req', 'Required for Kappa task');
  });
</script>
