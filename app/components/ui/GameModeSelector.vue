```html
<template>
  <div class="w-full">
    <div class="flex justify-center">
      <div class="w-full">
        <USelectMenu
          v-model="selectedGameMode"
          :items="gameModeOptions as any"
          option-attribute="label"
          value-attribute="value"
          class="w-full"
        >
          <template #leading>
            <UIcon
              :name="currentModeIcon.startsWith('mdi-') ? `i-${currentModeIcon}` : currentModeIcon"
              class="h-4 w-4"
            />
          </template>
          <template #item="{ item }">
            <div class="flex items-center gap-2">
              <UIcon
                :name="item.icon.startsWith('mdi-') ? `i-${item.icon}` : item.icon"
                class="h-4 w-4"
              />
              <span>{{ item.label }}</span>
            </div>
          </template>
        </USelectMenu>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { GAME_MODE_OPTIONS, type GameMode } from '@/utils/constants';
  const store = useTarkovStore();
  const gameModeOptions = GAME_MODE_OPTIONS;
  const selectedGameMode = computed({
    get() {
      return store.getCurrentGameMode();
    },
    set(newMode: GameMode) {
      store.switchGameMode(newMode);
    },
  });
  const currentModeIcon = computed(() => {
    const currentMode = store.getCurrentGameMode();
    return (
      gameModeOptions.find((option) => option.value === currentMode)?.icon || 'mdi-sword-cross'
    );
  });
</script>
