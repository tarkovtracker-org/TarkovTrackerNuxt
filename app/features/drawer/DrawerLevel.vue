<template>
  <div class="flex items-center justify-center px-3 py-2">
    <template v-if="isCollapsed">
      <div class="text-center">
        <div class="mb-1 text-[0.7em] text-gray-400">
          {{ t('navigation_drawer.level') }}
        </div>
        <h1 class="text-center text-2xl leading-tight font-bold">
          {{ displayedLevel }}
        </h1>
      </div>
    </template>
    <template v-else>
      <!-- Card container for expanded state -->
      <div
        class="w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 backdrop-blur-sm"
      >
        <div class="flex min-w-0 items-center gap-1">
          <span class="mr-1 shrink-0 leading-none">
            <div class="group relative h-12 w-12 overflow-hidden">
              <template v-if="isDataReady && groupIcon">
                <NuxtImg
                  v-if="!factionImageLoadFailed"
                  :src="pmcFactionIcon"
                  class="absolute top-0 left-0 z-20 mt-1 max-w-12 px-1 opacity-0 invert transition-opacity duration-1000 ease-in-out group-hover:opacity-100"
                  width="48"
                  height="48"
                  @error="handleFactionImageError"
                />
                <NuxtImg
                  v-if="!groupImageLoadFailed"
                  :src="groupIcon"
                  class="absolute top-0 left-0 z-10 max-w-12 opacity-100 transition-opacity duration-1000 ease-in-out group-hover:opacity-0"
                  width="48"
                  height="48"
                  @error="handleGroupImageError"
                />
                <!-- Final fallback if both fail -->
                <div
                  v-if="factionImageLoadFailed && groupImageLoadFailed"
                  class="flex h-12 w-12 items-center justify-center rounded bg-white/5"
                >
                  <UIcon name="i-heroicons-photo" class="h-6 w-6 text-gray-600" />
                </div>
              </template>
              <template v-else>
                <!-- Loading placeholder -->
                <div class="flex h-12 w-12 items-center justify-center rounded bg-white/5">
                  <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-500" />
                </div>
              </template>
            </div>
          </span>
          <span class="mx-0.5 min-w-0 flex-1">
            <div class="mb-0.5 text-center text-[0.65rem] text-gray-300">
              {{ t('navigation_drawer.level') }}
            </div>
            <div class="text-center">
              <AppTooltip
                v-if="!editingLevel || useAutomaticLevel"
                :text="
                  useAutomaticLevel
                    ? t(
                        'navigation_drawer.auto_level_enabled',
                        'Automatic level calculation is enabled'
                      )
                    : ''
                "
              >
                <h1
                  :class="
                    useAutomaticLevel
                      ? 'mx-auto w-11 text-[2rem] leading-[0.85]'
                      : 'hover:text-primary mx-auto w-11 cursor-pointer text-[2rem] leading-[0.85] transition-colors'
                  "
                  :tabindex="useAutomaticLevel ? '-1' : '0'"
                  :role="useAutomaticLevel ? undefined : 'button'"
                  :aria-disabled="useAutomaticLevel ? 'true' : undefined"
                  :aria-label="
                    useAutomaticLevel
                      ? t(
                          'navigation_drawer.level_display_auto',
                          'Level {level} (automatic calculation enabled)',
                          { level: displayedLevel }
                        )
                      : t(
                          'navigation_drawer.level_display_editable',
                          'Level {level}, click or press Enter to edit',
                          { level: displayedLevel }
                        )
                  "
                  @click="!useAutomaticLevel && startEditingLevel()"
                  @keydown.enter="!useAutomaticLevel && startEditingLevel()"
                  @keydown.space.prevent="!useAutomaticLevel && startEditingLevel()"
                >
                  {{ displayedLevel }}
                </h1>
              </AppTooltip>
              <input
                v-else
                ref="levelInput"
                v-model.number="levelInputValue"
                type="number"
                :min="minPlayerLevel"
                :max="maxPlayerLevel"
                class="mx-auto w-11 appearance-none border-0 bg-transparent p-0 text-center text-[2rem] leading-[0.85] outline-none focus:ring-0 focus:outline-none"
                @input="enforceMaxLevel"
                @blur="saveLevel"
                @keyup.enter="saveLevel"
              />
            </div>
          </span>
          <span class="ml-0.5 flex shrink-0 flex-col items-center gap-0.5">
            <AppTooltip
              :text="
                useAutomaticLevel
                  ? t(
                      'navigation_drawer.manual_disabled',
                      'Manual level editing is disabled when automatic calculation is enabled'
                    )
                  : ''
              "
            >
              <button
                class="flex h-6 w-6 cursor-pointer items-center justify-center p-0 text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="useAutomaticLevel || displayedLevel >= maxPlayerLevel"
                @click="incrementLevel"
              >
                <UIcon name="i-mdi-chevron-up" class="h-5 w-5" />
              </button>
            </AppTooltip>
            <AppTooltip
              :text="
                useAutomaticLevel
                  ? t(
                      'navigation_drawer.manual_disabled',
                      'Manual level editing is disabled when automatic calculation is enabled'
                    )
                  : ''
              "
            >
              <button
                class="flex h-6 w-6 cursor-pointer items-center justify-center p-0 text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="useAutomaticLevel || displayedLevel <= minPlayerLevel"
                @click="decrementLevel"
              >
                <UIcon name="i-mdi-chevron-down" class="h-5 w-5" />
              </button>
            </AppTooltip>
          </span>
        </div>
        <!-- XP Progress Display -->
        <div
          class="hover:border-primary/30 mt-1.5 cursor-pointer rounded border border-white/5 bg-white/2 px-2 py-1 transition-all hover:bg-white/4"
          @click="navigateToSettings"
        >
          <div class="mb-0.5 flex items-center justify-between text-[0.6rem]">
            <span class="text-gray-400">{{ formatNumber(xpCalculation.totalXP.value) }} XP</span>
            <span class="text-gray-500">
              {{ formatNumber(xpCalculation.xpToNextLevel.value) }} needed
            </span>
          </div>
          <div class="h-1 overflow-hidden rounded-full bg-gray-800">
            <div
              class="bg-primary-500 h-full transition-all duration-300"
              :style="{ width: `${xpCalculation.xpProgress.value}%` }"
            ></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
  import { computed, nextTick, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { useXpCalculation } from '@/composables/useXpCalculation';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  const { t } = useI18n({ useScope: 'global' });
  const router = useRouter();
  // Create formatter that uses current locale
  const formatNumber = useLocaleNumberFormatter();
  defineProps({
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  const xpCalculation = useXpCalculation();
  const minPlayerLevel = computed(() => metadataStore.minPlayerLevel);
  const maxPlayerLevel = computed(() => metadataStore.maxPlayerLevel);
  const playerLevels = computed(() => metadataStore.playerLevels);
  // Check if automatic level calculation is enabled
  const useAutomaticLevel = computed(() => preferencesStore.getUseAutomaticLevelCalculation);
  // Computed level that respects the automatic calculation preference
  const displayedLevel = computed(() => {
    return useAutomaticLevel.value ? xpCalculation.derivedLevel.value : tarkovStore.playerLevel();
  });
  // Check if data is ready to prevent broken images
  const isDataReady = computed(() => {
    return (
      !metadataStore.loading && metadataStore.playerLevels.length > 0 && tarkovStore.getPMCFaction()
    );
  });
  const pmcFactionIcon = computed(() => {
    return `/img/factions/${tarkovStore.getPMCFaction()}.webp`;
  });
  const groupIcon = computed(() => {
    const level = displayedLevel.value;
    const entry = playerLevels.value.find((pl) => pl.level === level);
    return entry?.levelBadgeImageLink ?? '';
  });
  const factionImageLoadFailed = ref(false);
  const groupImageLoadFailed = ref(false);
  // Manual level editing logic
  const editingLevel = ref(false);
  const levelInputValue = ref(tarkovStore.playerLevel());
  const levelInput = ref(null);
  function startEditingLevel() {
    editingLevel.value = true;
    levelInputValue.value = tarkovStore.playerLevel();
    nextTick(() => {
      if (levelInput.value) levelInput.value.focus();
    });
  }
  function enforceMaxLevel() {
    const currentValue = parseInt(levelInputValue.value, 10);
    if (!isNaN(currentValue) && currentValue > maxPlayerLevel.value) {
      levelInputValue.value = maxPlayerLevel.value;
    }
  }
  function saveLevel() {
    let newLevel = parseInt(levelInputValue.value, 10);
    if (isNaN(newLevel)) newLevel = minPlayerLevel.value;
    newLevel = Math.max(minPlayerLevel.value, Math.min(maxPlayerLevel.value, newLevel));
    tarkovStore.setLevel(newLevel);
    editingLevel.value = false;
  }
  function incrementLevel() {
    if (tarkovStore.playerLevel() < maxPlayerLevel.value) {
      tarkovStore.setLevel(tarkovStore.playerLevel() + 1);
    }
  }
  function decrementLevel() {
    if (tarkovStore.playerLevel() > minPlayerLevel.value) {
      tarkovStore.setLevel(tarkovStore.playerLevel() - 1);
    }
  }
  // Navigate to settings page
  function navigateToSettings() {
    router.push('/settings');
  }
  // Reset failure flags if icons change (retry)
  watch(pmcFactionIcon, () => {
    factionImageLoadFailed.value = false;
  });
  watch(groupIcon, () => {
    groupImageLoadFailed.value = false;
  });
  /**
   * Log image load failure and flip a flag to hide the specific failing image.
   * This is a fallback in case an image file is missing from the server or assets.
   */
  function handleFactionImageError(event) {
    console.warn('Failed to load faction image:', event.target?.src);
    factionImageLoadFailed.value = true;
  }
  function handleGroupImageError(event) {
    console.warn('Failed to load group image:', event.target?.src);
    groupImageLoadFailed.value = true;
  }
</script>
<style>
  /* Hide spin buttons for number input */
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none !important;
    margin: 0;
  }
  input[type='number'] {
    appearance: textfield !important;
    -moz-appearance: textfield !important;
  }
</style>
