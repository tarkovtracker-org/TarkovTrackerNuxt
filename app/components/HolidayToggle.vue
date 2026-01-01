<template>
  <div class="fixed right-4 bottom-4 z-[200]">
      <button
        type="button"
        v-tooltip.left="enabled ? $t('holiday.disable') : $t('holiday.enable')"
        class="group flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        :class="
          enabled
            ? 'bg-gradient-to-br from-red-600 to-green-600 ring-2 ring-white/30'
            : 'bg-surface-800 hover:bg-surface-700 ring-1 ring-white/10'
        "
        :aria-label="enabled ? $t('holiday.disable') : $t('holiday.enable')"
        @click="toggle"
      >
        <UIcon
          :name="enabled ? 'i-mdi-snowflake' : 'i-mdi-snowflake-off'"
          class="h-6 w-6 transition-all duration-300"
          :class="
            enabled
              ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] group-hover:rotate-45'
              : 'text-surface-400 group-hover:text-surface-200'
          "
        />
      </button>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { usePreferencesStore } from '@/stores/usePreferences';
  const preferencesStore = usePreferencesStore();
  const enabled = computed(() => preferencesStore.getEnableHolidayEffects);
  function toggle() {
    preferencesStore.setEnableHolidayEffects(!enabled.value);
  }
</script>
