<template>
  <GenericCard
    icon="mdi-trophy"
    highlight-color="tan"
    :fill-height="false"
    :title="$t('settings.prestige.title', 'Prestige Level')"
    title-classes="text-lg font-bold sm:text-xl"
  >
    <template #content>
      <div class="space-y-4 px-4 py-4">
        <!-- Prestige Level Selector -->
        <div
          v-tooltip="
            isPveMode
              ? $t('settings.prestige.pve_disabled', 'Prestige is not available in PVE mode')
              : undefined
          "
          class="space-y-2"
        >
          <p class="text-content-secondary text-sm font-semibold">
            {{ $t('settings.prestige.current_level', 'Current Prestige Level') }}
          </p>
          <USelectMenu
            v-model="currentPrestige"
            :items="prestigeOptions"
            value-key="value"
            :disabled="isPveMode"
            :popper="{ placement: 'bottom-start', strategy: 'fixed' }"
            :ui="selectUi"
            :ui-menu="selectMenuUi"
          >
            <template #leading>
              <UIcon
                name="i-mdi-trophy"
                class="text-gold-400 h-4 w-4"
                :class="{ 'opacity-50': isPveMode }"
              />
            </template>
          </USelectMenu>
        </div>
        <p class="text-content-tertiary text-xs">
          <template v-if="isPveMode">
            {{ $t('settings.prestige.pve_hint', 'Prestige is not available in PVE mode.') }}
          </template>
          <template v-else>
            {{
              $t(
                'settings.prestige.hint',
                'Select your current prestige level. This is display-only and does not affect game progression.'
              )
            }}
          </template>
        </p>
      </div>
    </template>
  </GenericCard>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { GAME_MODES } from '@/utils/constants';
  const tarkovStore = useTarkovStore();
  // Check if user is in PVE mode (prestige not available in PVE)
  const isPveMode = computed(() => tarkovStore.currentGameMode === GAME_MODES.PVE);
  // Prestige options for dropdown (0-6)
  const prestigeOptions = computed(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      label: i === 0 ? 'No Prestige' : `Prestige ${i}`,
      value: i,
    }));
  });
  // Current prestige level (two-way binding)
  const currentPrestige = computed({
    get(): number {
      return tarkovStore.getPrestigeLevel();
    },
    set(newValue: number) {
      tarkovStore.setPrestigeLevel(newValue);
    },
  });
  // Select menu UI configuration
  // Intentional placeholder
  const selectUi = {};
  const selectMenuUi = {
    container: 'z-[9999]',
    background: 'bg-surface-floating',
    shadow: 'shadow-xl',
    rounded: 'rounded-lg',
    ring: 'ring-1 ring-gray-200 dark:ring-white/10',
    padding: 'p-1',
    option: {
      base: 'px-3 py-2 text-sm cursor-pointer transition-colors rounded',
      inactive: 'hover-effect text-content-secondary',
      active: 'hover-effect bg-surface-elevated text-content-primary',
      selected: 'bg-primary-500/10 text-primary-500 ring-1 ring-primary-500',
    },
  };
</script>
