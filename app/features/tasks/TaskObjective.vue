<template>
  <div
    class="group focus-within:ring-primary-500 focus-within:ring-offset-surface-900 flex w-full items-start gap-4 rounded-md px-2 py-2 transition-colors focus-within:ring-2 focus-within:ring-offset-2"
    :class="[
      isComplete ? 'bg-success-500/10' : 'hover:bg-surface-200 dark:hover:bg-white/5',
      isParentTaskLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
    ]"
    @click="handleRowClick"
    @mouseenter="objectiveMouseEnter()"
    @mouseleave="objectiveMouseLeave()"
  >
    <UIcon
      :name="objectiveIcon.startsWith('mdi-') ? `i-${objectiveIcon}` : objectiveIcon"
      aria-hidden="true"
      class="h-5 w-5 shrink-0"
      :class="
        isComplete
          ? 'text-success-500 dark:text-success-300'
          : 'text-gray-500 group-hover:text-gray-700 dark:text-content-tertiary dark:group-hover:text-content-secondary'
      "
    />
    <div class="flex flex-1 flex-wrap items-center gap-2">
      <div class="min-w-0">
        <div class="text-sm leading-5 text-content-primary">
          {{ props.objective?.description }}
        </div>
          <div
            v-if="userHasTeam && activeUserView === 'all' && userNeeds.length > 0"
            v-tooltip="userNeedsTitle"
            class="mt-1 inline-flex items-center gap-1 text-[11px] text-content-tertiary"
          >
            <UIcon name="i-mdi-account-multiple-outline" aria-hidden="true" class="h-3.5 w-3.5" />
            <span>{{ userNeeds.length }}</span>
          </div>
      </div>
      <div class="flex items-center gap-2" @click.stop>
        <ObjectiveCountControls
          v-if="neededCount > 1"
          :current-count="currentObjectiveCount"
          :needed-count="neededCount"
          :disabled="isParentTaskLocked"
          @decrease="decreaseCount"
          @increase="increaseCount"
          @toggle="toggleCount"
          @set-count="setCount"
        />
          <button
            v-else
            v-tooltip="
              isComplete
                ? t('page.tasks.questcard.uncomplete', 'Uncomplete')
                : t('page.tasks.questcard.complete', 'Complete')
            "
            type="button"
            class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            :aria-label="toggleObjectiveLabel"
            :aria-pressed="isComplete"
            :disabled="isParentTaskLocked"
            :class="[
              isParentTaskLocked
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer',
              isComplete
                ? 'bg-success-600 border-success-500 hover:bg-success-500 text-white'
                : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10',
            ]"
            @click="toggleObjectiveCompletion()"
          >
            <UIcon
              :name="isComplete ? 'i-mdi-check' : 'i-mdi-circle-outline'"
              aria-hidden="true"
              class="h-4 w-4"
            />
          </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import ObjectiveCountControls from '@/features/tasks/ObjectiveCountControls.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useSystemStoreWithSupabase } from '@/stores/useSystemStore';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { TaskObjective } from '@/types/tarkov';
  const { t } = useI18n({ useScope: 'global' });
  const { systemStore } = useSystemStoreWithSupabase();
  // Define the props for the component
  const props = defineProps<{
    objective: TaskObjective;
  }>();
  const metadataStore = useMetadataStore();
  const objectives = computed(() => metadataStore.objectives);
  const tarkovStore = useTarkovStore();
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const activeUserView = computed(() => preferencesStore.getTaskUserView);
  // Computed property to check if user has a team (for reactivity)
  const userHasTeam = computed(() => {
    return !!systemStore.userTeam;
  });
  const isComplete = computed(() => {
    return tarkovStore.isTaskObjectiveComplete(props.objective.id);
  });
  const isTaskUnavailable = computed(() => {
    const taskId = props.objective.taskId;
    if (!taskId) return false;
    // Task is unavailable if it's NOT unlocked AND NOT complete
    const isUnlocked = progressStore.unlockedTasks[taskId]?.self === true;
    const isTaskComplete = tarkovStore.isTaskComplete(taskId);
    return !isUnlocked && !isTaskComplete;
  });
  const objectiveLabel = computed(() => {
    return props.objective.description || t('page.tasks.questcard.objective', 'Objective');
  });
  const toggleObjectiveLabel = computed(() => {
    const actionLabel = isComplete.value
      ? t('page.tasks.questcard.uncomplete', 'Uncomplete')
      : t('page.tasks.questcard.complete', 'Complete');
    return `${actionLabel}: ${objectiveLabel.value}`;
  });
  const fullObjective = computed(() => {
    return objectives.value.find((o) => o.id == props.objective.id);
  });
  const parentTaskId = computed(() => {
    return fullObjective.value?.taskId ?? props.objective.taskId;
  });
  const isParentTaskComplete = computed(() => {
    const taskId = parentTaskId.value;
    if (!taskId) return false;
    return tarkovStore.isTaskComplete(taskId) && !tarkovStore.isTaskFailed(taskId);
  });
  const isParentTaskFailed = computed(() => {
    const taskId = parentTaskId.value;
    if (!taskId) return false;
    return tarkovStore.isTaskFailed(taskId);
  });
  const isParentTaskLocked = computed(() => {
    return isParentTaskComplete.value || isParentTaskFailed.value;
  });
  const userNeeds = computed(() => {
    const needingUsers: string[] = [];
    if (fullObjective.value == undefined) {
      return needingUsers;
    }
    const taskId = fullObjective.value.taskId;
    if (!taskId) return needingUsers;
    const unlocked = progressStore.unlockedTasks[taskId];
    if (!unlocked) return needingUsers;
    Object.entries(unlocked).forEach(([teamId, isUnlocked]) => {
      if (
        isUnlocked &&
        progressStore.objectiveCompletions?.[props.objective.id]?.[teamId] === false
      ) {
        needingUsers.push(teamId);
      }
    });
    return needingUsers;
  });
  const userNeedsTitle = computed(() => {
    return userNeeds.value
      .map((id) => progressStore.getDisplayName(id))
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
      .join(', ');
  });
  const isHovered = ref(false);
  const objectiveMouseEnter = () => {
    if (isParentTaskLocked.value) return;
    isHovered.value = true;
  };
  const objectiveMouseLeave = () => {
    isHovered.value = false;
  };
  const objectiveIcon = computed(() => {
    if (isHovered.value) {
      if (isComplete.value) {
        return 'mdi-close-circle';
      } else {
        return 'mdi-check-circle';
      }
    }
    const iconMap: Record<string, string> = {
      key: 'mdi-key',
      shoot: 'mdi-target-account',
      giveItem: 'mdi-close-circle-outline',
      findItem: 'mdi-checkbox-marked-circle-outline',
      findQuestItem: 'mdi-alert-circle-outline',
      giveQuestItem: 'mdi-alert-circle-check-outline',
      plantQuestItem: 'mdi-arrow-down-thin-circle-outline',
      plantItem: 'mdi-arrow-down-thin-circle-outline',
      taskStatus: 'mdi-account-child-circle',
      extract: 'mdi-heart-circle-outline',
      mark: 'mdi-remote',
      place: 'mdi-arrow-down-drop-circle-outline',
      traderLevel: 'mdi-thumb-up',
      traderStanding: 'mdi-thumb-up',
      skill: 'mdi-dumbbell',
      visit: 'mdi-crosshairs-gps',
      buildWeapon: 'mdi-progress-wrench',
      playerLevel: 'mdi-crown-circle-outline',
      experience: 'mdi-eye-circle-outline',
      warning: 'mdi-alert-circle',
    };
    return iconMap[props.objective.type ?? ''] || 'mdi-help-circle';
  });
  const neededCount = computed(() => fullObjective.value?.count ?? props.objective.count ?? 1);
  const handleRowClick = () => {
    if (isParentTaskLocked.value) return;
    if (neededCount.value > 1) {
      toggleCount();
      return;
    }
    toggleObjectiveCompletion();
  };
  const toggleObjectiveCompletion = () => {
    if (isParentTaskLocked.value) return;
    if (isComplete.value) {
      const currentCount = currentObjectiveCount.value;
      const requiredCount = neededCount.value;
      if (currentCount >= requiredCount) {
        tarkovStore.setObjectiveCount(props.objective.id, Math.max(0, requiredCount - 1));
      }
    }
    tarkovStore.toggleTaskObjectiveComplete(props.objective.id);
  };
  const currentObjectiveCount = computed(() => {
    return tarkovStore.getObjectiveCount(props.objective.id);
  });
  // Watch for objective completion to auto-complete item collection
  watch(isComplete, (newVal) => {
    if (newVal) {
      const requiredCount = neededCount.value;
      if (requiredCount > 1) {
        tarkovStore.setObjectiveCount(props.objective.id, requiredCount);
      }
    }
  });
  const decreaseCount = () => {
    if (isParentTaskLocked.value) return;
    const currentCount = currentObjectiveCount.value;
    if (currentCount > 0) {
      const newCount = currentCount - 1;
      tarkovStore.setObjectiveCount(props.objective.id, newCount);
      // If we drop below needed count and objective was complete, uncomplete it
      const requiredCount = neededCount.value;
      if (newCount < requiredCount && isComplete.value) {
        tarkovStore.setTaskObjectiveUncomplete(props.objective.id);
      }
    }
  };
  const increaseCount = () => {
    if (isParentTaskLocked.value) return;
    const currentCount = currentObjectiveCount.value;
    const requiredCount = neededCount.value;
    if (currentCount < requiredCount) {
      const newCount = currentCount + 1;
      tarkovStore.setObjectiveCount(props.objective.id, newCount);
      if (newCount >= requiredCount && !isComplete.value) {
        tarkovStore.setTaskObjectiveComplete(props.objective.id);
      }
    }
  };
  const toggleCount = () => {
    if (isParentTaskLocked.value) return;
    const currentCount = currentObjectiveCount.value;
    const requiredCount = neededCount.value;
    if (currentCount >= requiredCount) {
      tarkovStore.setObjectiveCount(props.objective.id, Math.max(0, requiredCount - 1));
      if (isComplete.value) {
        tarkovStore.setTaskObjectiveUncomplete(props.objective.id);
      }
    } else {
      tarkovStore.setObjectiveCount(props.objective.id, requiredCount);
      if (!isComplete.value) {
        tarkovStore.setTaskObjectiveComplete(props.objective.id);
      }
    }
  };
  /**
   * Set count to a specific value (from direct input)
   */
  const setCount = (newCount: number) => {
    if (isParentTaskLocked.value) return;
    const requiredCount = neededCount.value;
    // Value is already clamped by the component, but ensure it's valid
    const clampedCount = Math.max(0, Math.min(requiredCount, newCount));
    tarkovStore.setObjectiveCount(props.objective.id, clampedCount);
    // Update completion status based on new count
    if (clampedCount >= requiredCount && !isComplete.value) {
      tarkovStore.setTaskObjectiveComplete(props.objective.id);
    } else if (clampedCount < requiredCount && isComplete.value) {
      tarkovStore.setTaskObjectiveUncomplete(props.objective.id);
    }
  };
</script>
