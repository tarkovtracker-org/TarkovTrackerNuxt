<template>
  <button
    v-bind="attrs"
    type="button"
    :aria-pressed="props.isCollected"
    :aria-label="resolvedAriaLabel"
    @click="emit('toggle')"
  >
    <UIcon :name="resolvedIconName" :class="[props.iconClass, resolvedIconStateClass]" />
  </button>
</template>
<script setup lang="ts">
  defineOptions({ inheritAttrs: false });
  import { useI18n } from 'vue-i18n';
  const { t } = useI18n();
  const props = withDefaults(
    defineProps<{
      iconName?: string;
      iconNameUnchecked?: string;
      iconClass?: string;
      isCollected: boolean;
    }>(),
    {
      iconName: 'i-mdi-check-circle',
      iconNameUnchecked: 'i-mdi-check-circle-outline',
      iconClass: 'h-5 w-5',
    }
  );
  const emit = defineEmits<{
    toggle: [];
  }>();
  const attrs = useAttrs();
  const resolvedIconName = computed(() => {
    return props.isCollected ? props.iconName : props.iconNameUnchecked;
  });
  const resolvedIconStateClass = computed(() => {
    return props.isCollected ? 'opacity-100' : 'opacity-60';
  });
  const resolvedAriaLabel = computed(() => {
    const ariaLabel = attrs['aria-label'];
    if (typeof ariaLabel === 'string' && ariaLabel.length > 0) {
      return ariaLabel;
    }
    if (typeof title === 'string' && title.length > 0) {
      return title;
    }
    return t('common.toggle_collected');
  });
</script>
