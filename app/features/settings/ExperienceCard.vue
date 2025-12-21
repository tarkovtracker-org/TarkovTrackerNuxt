<template>
  <GenericCard
    icon="mdi-star-circle"
    icon-color="primary-400"
    highlight-color="accent"
    :fill-height="false"
    :title="$t('settings.experience.title', 'Experience & Level')"
    title-classes="text-lg font-semibold"
  >
    <template #content>
      <div class="space-y-4 px-4 py-4">
        <!-- Explanation -->
        <UAlert icon="i-mdi-information" color="info" variant="soft" class="text-sm">
          <template #description>
            {{
              $t(
                'settings.experience.explanation',
                'Quest XP is auto-calculated. Use the offset to add XP from daily quests, kills, and other gameplay.'
              )
            }}
          </template>
        </UAlert>
        <!-- Automatic Level Calculation Toggle -->
        <div class="border-surface-700 bg-surface-800/30 rounded-lg border p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="text-surface-200 mb-1 text-sm font-semibold">
                {{ $t('settings.experience.auto_level_title', 'Automatic Level Calculation') }}
              </div>
              <p class="text-surface-400 text-xs">
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
        <div class="border-surface-700 bg-surface-800/30 rounded-lg border p-4">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-surface-200 text-sm font-semibold">
              {{ $t('settings.experience.current_level', 'Current Level') }}
            </span>
            <span class="text-primary-400 text-2xl font-bold">
              {{ xpCalculation.derivedLevel.value }}
            </span>
          </div>
          <!-- XP Progress Bar -->
          <div class="space-y-1">
            <div class="text-surface-400 flex justify-between text-xs">
              <span>{{ formatNumber(xpCalculation.totalXP.value) }} XP</span>
              <span>{{ formatNumber(xpCalculation.xpToNextLevel.value) }} to next</span>
            </div>
            <div class="bg-surface-700 h-2 overflow-hidden rounded-full">
              <div
                class="bg-primary-500 h-full transition-all duration-300"
                :style="{ width: `${xpCalculation.xpProgress.value}%` }"
              ></div>
            </div>
            <div class="text-surface-500 flex justify-between text-xs">
              <span>{{ formatNumber(xpCalculation.xpForCurrentLevel.value) }}</span>
              <span>{{ formatNumber(xpCalculation.xpForNextLevel.value) }}</span>
            </div>
          </div>
        </div>
        <!-- XP Breakdown -->
        <div class="border-surface-700 bg-surface-800/30 rounded-lg border p-3">
          <div class="text-surface-200 mb-2 text-sm font-semibold">
            {{ $t('settings.experience.breakdown', 'XP Breakdown') }}
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="text-surface-400">
              Quest XP:
              <span class="text-surface-200 ml-1">
                {{ formatNumber(xpCalculation.calculatedQuestXP.value) }}
              </span>
            </div>
            <div class="text-surface-400">
              Manual Offset:
              <span
                class="ml-1"
                :class="tarkovStore.getXpOffset() >= 0 ? 'text-green-400' : 'text-red-400'"
              >
                {{ tarkovStore.getXpOffset() >= 0 ? '+' : ''
                }}{{ formatNumber(tarkovStore.getXpOffset()) }}
              </span>
            </div>
            <div class="border-surface-700 text-surface-400 col-span-2 border-t pt-2">
              Total XP:
              <span class="text-primary-400 ml-1 font-bold">
                {{ formatNumber(xpCalculation.totalXP.value) }}
              </span>
            </div>
          </div>
        </div>
        <!-- Manual XP Offset Input -->
        <div class="space-y-2">
          <label class="text-surface-200 text-sm font-semibold">
            {{ $t('settings.experience.set_total_xp', 'Set Total XP') }}
          </label>
          <div class="flex items-center gap-2">
            <UInput
              v-model.number="manualXPInput"
              type="number"
              :min="0"
              :placeholder="xpCalculation.totalXP.value.toString()"
              size="sm"
              class="flex-1"
            />
            <UButton
              icon="i-mdi-check"
              size="sm"
              color="primary"
              :disabled="!isValidXPInput"
              @click="applyManualXP"
            >
              Apply
            </UButton>
          </div>
          <p class="text-surface-400 text-xs">
            {{
              $t(
                'settings.experience.manual_hint',
                'Enter your actual total XP to adjust the offset automatically.'
              )
            }}
          </p>
        </div>
        <!-- Reset Button -->
        <UButton
          icon="i-mdi-refresh"
          block
          variant="soft"
          color="neutral"
          :disabled="tarkovStore.getXpOffset() === 0"
          @click="resetOffset"
        >
          {{ $t('settings.experience.reset_offset', 'Reset XP Offset') }}
        </UButton>
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
  const tarkovStore = useTarkovStore();
  const preferencesStore = usePreferencesStore();
  const xpCalculation = useXpCalculation();
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
  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };
</script>
