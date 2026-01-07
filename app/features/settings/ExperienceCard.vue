<template>
  <GenericCard
    icon="mdi-star-circle"
    highlight-color="accent"
    :fill-height="false"
    :title="$t('settings.experience.title', 'Experience & Level')"
    title-classes="text-lg font-bold sm:text-xl"
  >
    <template #content>
      <div class="space-y-4 px-4 py-4">
        <!-- Explanation -->
        <UAlert icon="i-mdi-information" color="primary" variant="soft" class="text-sm">
          <template #description>
            {{
              $t(
                'settings.experience.explanation',
                'Task XP is auto-calculated. Use the offset to add XP from daily tasks, kills, and other gameplay.'
              )
            }}
          </template>
        </UAlert>
        <!-- Automatic Level Calculation Toggle -->
        <div
          class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="text-content-primary mb-1 text-sm font-semibold">
                {{ $t('settings.experience.auto_level_title', 'Automatic Level Calculation') }}
              </div>
              <p class="text-content-tertiary text-xs">
                {{
                  $t(
                    'settings.experience.auto_level_description',
                    'When enabled, your level will be automatically calculated based on total XP. When disabled, you can manually set your level independently of XP calculations.'
                  )
                }}
              </p>
            </div>
            <USwitch
              :model-value="preferencesStore.getUseAutomaticLevelCalculation"
              @update:model-value="handleAutoLevelToggle"
            />
          </div>
          <UAlert
            v-if="!preferencesStore.getUseAutomaticLevelCalculation"
            icon="i-mdi-alert"
            color="warning"
            variant="soft"
            class="mt-3 text-xs"
          >
            <template #description>
              {{
                $t(
                  'settings.experience.manual_level_warning',
                  'Manual level mode is active. This allows you to set your level independently of your calculated XP, which can be useful if your in-game level differs due to Arena, raids, or other XP sources not tracked here.'
                )
              }}
            </template>
          </UAlert>
        </div>
        <!-- Current Level Display -->
        <div
          class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-4"
        >
          <div class="mb-3 flex items-center justify-between">
            <span class="text-content-primary text-sm font-semibold">
              {{ $t('settings.experience.current_level', 'Current Level') }}
            </span>
            <span class="text-accent-600 dark:text-accent-400 text-2xl font-bold">
              {{ xpCalculation.derivedLevel.value }}
            </span>
          </div>
          <!-- XP Progress Bar -->
          <div class="space-y-1">
            <div class="text-content-tertiary flex justify-between text-xs">
              <span>{{ formatNumber(xpCalculation.totalXP.value) }} XP</span>
              <span>{{ formatNumber(xpCalculation.xpToNextLevel.value) }} to next</span>
            </div>
            <div class="bg-surface-400 dark:bg-surface-700 h-2 overflow-hidden rounded-full">
              <div
                class="bg-accent-500 h-full transition-all duration-300"
                :style="{ width: `${xpCalculation.xpProgress.value}%` }"
              ></div>
            </div>
            <div class="text-content-tertiary flex justify-between text-xs">
              <span>{{ formatNumber(xpCalculation.xpForCurrentLevel.value) }}</span>
              <span>{{ formatNumber(xpCalculation.xpForNextLevel.value) }}</span>
            </div>
          </div>
        </div>
        <!-- Unified XP Management (Math Style) -->
        <div
          class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-4"
        >
          <div class="grid grid-cols-[70%_30%] items-center gap-y-4">
            <!-- Row 1: Task XP -->
            <span class="text-content-secondary text-sm font-medium">
              {{ $t('settings.experience.task_xp', 'Task XP') }}
            </span>
            <div class="text-content-primary font-mono text-xl font-semibold pr-2 text-right sm:pr-4">
              {{ formatNumber(xpCalculation.calculatedQuestXP.value) }}
            </div>
            <!-- Row 2: Manual Offset -->
            <div class="flex items-center gap-2">
              <span class="text-content-secondary text-sm font-medium">
                {{ $t('settings.experience.manual_offset', 'Manual Offset') }}
              </span>
              <UButton
                v-if="tarkovStore.getXpOffset() !== 0"
                icon="i-mdi-undo"
                variant="link"
                color="gray"
                size="xs"
                class="h-4 p-0 opacity-50 hover:opacity-100"
                :title="$t('settings.experience.reset_offset', 'Reset XP Offset')"
                @click="resetOffset"
              >
                {{ $t('settings.experience.reset', 'Reset') }}
              </UButton>
            </div>
            <div
              class="font-mono text-xl font-semibold pr-2 text-right sm:pr-4"
              :class="
                tarkovStore.getXpOffset() >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-500 dark:text-red-400'
              "
            >
              <span class="opacity-50 mr-1">{{ tarkovStore.getXpOffset() >= 0 ? '+' : '' }}</span>
              {{ formatNumber(tarkovStore.getXpOffset()) }}
            </div>
            <!-- Math Divider -->
            <div class="border-base col-span-2 my-2 border-b-2"></div>
            <!-- Row 3: Total XP Input -->
            <label class="text-content-primary text-sm font-bold uppercase tracking-wider">
              {{ $t('settings.experience.total_xp', 'Total XP') }}
            </label>
            <UInput
              v-model.number="manualXPInput"
              type="number"
              :min="0"
              class="xp-input w-full"
              input-class="font-mono font-bold text-accent-600 dark:text-accent-400"
              :placeholder="xpCalculation.totalXP.value.toString()"
              @keyup.enter="applyManualXP"
            />
            <!-- Row 4: Info & Apply -->
            <div class="pr-4">
              <p class="text-content-tertiary text-xs leading-tight">
                {{
                  $t(
                    'settings.experience.sync_description',
                    'Set your in-game Total XP to automatically update the offset.'
                  )
                }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span
                v-if="!isValidXPInput && manualXPInput !== null"
                class="text-accent-500 text-[10px] font-bold uppercase tracking-tighter"
              >
                {{ $t('settings.experience.unsaved_changes', 'Unsaved Changes') }}
              </span>
              <UButton
                icon="i-mdi-check"
                color="primary"
                variant="solid"
                size="md"
                class="shadow-sm w-full justify-center"
                :disabled="!isValidXPInput"
                @click="applyManualXP"
              >
                {{ $t('page.tasks.filters.apply') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </GenericCard>
</template>
<script setup lang="ts">
  import { ref, computed } from 'vue';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import { useXpCalculation } from '@/composables/useXpCalculation';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  const tarkovStore = useTarkovStore();
  const preferencesStore = usePreferencesStore();
  const xpCalculation = useXpCalculation();
  const formatNumber = useLocaleNumberFormatter();
  // Manual XP input
  const manualXPInput = ref<number | null>(null);
  // Check if input is valid
  const isValidXPInput = computed(() => {
    return (
      manualXPInput.value !== null &&
      !isNaN(manualXPInput.value) &&
      manualXPInput.value >= 0 &&
      manualXPInput.value !== xpCalculation.totalXP.value
    );
  });
  // Apply manual XP
  const applyManualXP = () => {
    if (isValidXPInput.value && manualXPInput.value !== null) {
      xpCalculation.setTotalXP(manualXPInput.value);
      manualXPInput.value = null;
    }
  };
  // Reset offset to 0
  const resetOffset = () => {
    tarkovStore.setXpOffset(0);
    manualXPInput.value = null;
  };
  // Handle automatic level calculation toggle
  const handleAutoLevelToggle = (value: boolean) => {
    preferencesStore.setUseAutomaticLevelCalculation(value);
    // If enabling automatic calculation, sync the manual level with derived level
    if (value) {
      tarkovStore.setLevel(xpCalculation.derivedLevel.value);
    }
  };
</script>
<style scoped>
  /* Hide number input spinners */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type='number'] {
    -moz-appearance: textfield;
  }
  .xp-input :deep(input) {
    text-align: right !important;
  }
</style>
