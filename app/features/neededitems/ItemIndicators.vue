<template>
  <span v-if="foundInRaid" v-tooltip="computedFoundInRaidTitle" class="inline-flex">
    <UIcon name="i-mdi-checkbox-marked-circle-outline" :class="firIconClass" />
  </span>
  <button
    v-if="isCraftable"
    v-tooltip="craftableTitleText"
    type="button"
    class="inline-flex"
    :aria-label="craftableTitleText"
    @click.stop="emit('craft')"
  >
    <UIcon name="i-mdi-hammer-wrench" :class="[craftableIconBaseClass, craftableIconClass]" />
  </button>
  <span v-if="kappaRequired" v-tooltip="kappaTitleText" class="inline-flex">
    <UIcon name="i-mdi-trophy" :class="kappaIconClass" />
  </span>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  const { t } = useI18n({ useScope: 'global' });
  const props = withDefaults(
    defineProps<{
      craftableIconBaseClass?: string;
      craftableIconClass?: string;
      craftableTitle?: string;
      firIconClass?: string;
      foundInRaid: boolean;
      foundInRaidTitle?: string;
      isCraftable: boolean;
      kappaIconClass?: string;
      kappaRequired?: boolean;
      kappaTitle?: string;
    }>(),
    {
      craftableIconBaseClass: 'ml-1 h-5 w-5',
      craftableIconClass: '',
      craftableTitle: '',
      firIconClass: 'ml-1 h-5 w-5',
      foundInRaidTitle: '',
      kappaIconClass: 'ml-1 h-5 w-5 text-entity-kappa',
      kappaRequired: false,
      kappaTitle: '',
    }
  );
  const emit = defineEmits<{
    craft: [];
  }>();
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
