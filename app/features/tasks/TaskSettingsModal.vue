<template>
  <UModal
    v-model:open="isOpen"
    :title="t('page.tasks.settings.title', 'Task Settings')"
    :description="t('page.tasks.settings.description', 'Configure task filters and appearance')"
  >
    <UButton variant="ghost" color="neutral" size="sm" class="text-gray-400" @click="isOpen = true">
      <UIcon name="i-mdi-tune" class="h-4 w-4 sm:mr-1.5" />
      <span class="hidden text-xs sm:inline">SETTINGS</span>
    </UButton>
    <template #content>
      <UCard
        class="bg-contentbackground"
        :ui="{
          root: 'max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] flex flex-col',
          body: 'min-h-0 overflow-y-auto',
        }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold">
                {{ t('page.tasks.settings.title', 'Task Settings') }}
              </h3>
            </div>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-mdi-close"
              size="sm"
              :aria-label="t('page.tasks.filters.close', 'Close')"
              @click="isOpen = false"
            />
          </div>
        </template>
        <div class="space-y-6">
          <!-- TASK FILTERS Section -->
          <section class="space-y-2">
            <div>
              <p class="text-primary-400 text-xs font-semibold tracking-wide uppercase">
                {{ t('page.tasks.settings.tabs.filters', 'TASK FILTERS') }}
              </p>
              <p class="mt-1 text-xs text-gray-500">
                {{ t('page.tasks.settings.filters.hint', 'Control which tasks appear.') }}
              </p>
            </div>
            <SettingsToggle
              v-model="showNonSpecialTasks"
              :label="labelShowNonSpecialTasks"
              :tooltip="tooltipShowNonSpecialTasks"
            />
            <SettingsToggle
              :model-value="showKappaTasks"
              :label="labelShowKappaTasks"
              :tooltip="tooltipShowKappaTasks"
              @update:model-value="preferencesStore.setHideNonKappaTasks(!$event)"
            />
            <SettingsToggle
              v-model="showLightkeeperTasks"
              :label="labelShowLightkeeperTasks"
              :tooltip="tooltipShowLightkeeperTasks"
            />
            <SettingsToggle
              v-model="sharedByAllOnly"
              :label="labelSharedByAllOnly"
              :tooltip="tooltipSharedByAllOnly"
            />
          </section>
          <!-- APPEARANCE Section -->
          <section class="space-y-2">
            <div>
              <p class="text-primary-400 text-xs font-semibold tracking-wide uppercase">
                {{ t('page.tasks.settings.tabs.appearance', 'APPEARANCE') }}
              </p>
              <p class="mt-1 text-xs text-gray-500">
                {{ t('page.tasks.settings.appearance.hint', 'Tune how task cards look.') }}
              </p>
            </div>
            <SettingsToggle
              v-model="showRequiredLabels"
              :label="labelShowRequiredLabels"
              :tooltip="tooltipShowRequiredLabels"
            />
            <SettingsToggle
              v-model="showNotRequiredLabels"
              :label="labelShowNotRequiredLabels"
              :tooltip="tooltipShowNotRequiredLabels"
            />
            <SettingsToggle
              v-model="showExperienceRewards"
              :label="labelShowExperienceRewards"
              :tooltip="tooltipShowExperienceRewards"
            />
            <SettingsToggle
              v-model="showTaskIds"
              :label="labelShowTaskIds"
              :tooltip="tooltipShowTaskIds"
            />
            <SettingsToggle
              v-model="showNextQuests"
              :label="labelShowNextQuests"
              :tooltip="tooltipShowNextQuests"
            />
            <SettingsToggle
              v-model="showPreviousQuests"
              :label="labelShowPreviousQuests"
              :tooltip="tooltipShowPreviousQuests"
            />
          </section>
          <!-- ADVANCED Section -->
          <section class="space-y-2">
            <div>
              <p class="text-primary-400 text-xs font-semibold tracking-wide uppercase">
                {{ t('page.tasks.settings.tabs.advanced', 'ADVANCED') }}
              </p>
              <p class="mt-1 text-xs text-gray-500">
                {{
                  t(
                    'page.tasks.settings.advanced.hint',
                    'Use with care. Manual overrides can make debugging harder.'
                  )
                }}
              </p>
            </div>
            <SettingsToggle
              v-model="enableManualTaskFail"
              :label="labelEnableManualTaskFail"
              :tooltip="tooltipEnableManualTaskFail"
            />
            <div
              class="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p class="text-xs text-gray-300">
                  {{
                    t(
                      'page.tasks.settings.advanced.repairFailedHint',
                      'Clears failed flags that are not supported by current fail conditions.'
                    )
                  }}
                </p>
                <p class="text-[11px] text-gray-500">
                  {{
                    t(
                      'page.tasks.settings.advanced.repairFailedCount',
                      { count: failedTasksCount },
                      'Failed tasks detected: {count}'
                    )
                  }}
                </p>
              </div>
              <UButton
                color="warning"
                variant="soft"
                size="sm"
                :disabled="failedTasksCount === 0"
                :title="tooltipRepairFailedTasks"
                @click="repairFailedTasks"
              >
                {{ labelRepairFailedTasks }}
              </UButton>
            </div>
          </section>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import SettingsToggle from '@/features/tasks/SettingsToggle.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { MANUAL_FAIL_TASK_IDS } from '@/utils/constants';
  const { t } = useI18n({ useScope: 'global' });
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const tarkovStore = useTarkovStore();
  const isOpen = ref(false);
  // Labels and tooltips (defined in script to avoid template quoting issues)
  const labelShowNonSpecialTasks = computed(() =>
    t(
      'page.tasks.settings.filters.showNonSpecialTasks',
      'Show tasks without Lightkeeper or Kappa requirement'
    )
  );
  const tooltipShowNonSpecialTasks = computed(() =>
    t(
      'page.tasks.settings.filters.showNonSpecialTasksTooltip',
      'Show regular tasks that do not require Kappa or Lightkeeper'
    )
  );
  const labelShowKappaTasks = computed(() =>
    t('page.tasks.settings.filters.showKappaTasks', 'Show "Kappa Required" tasks')
  );
  const tooltipShowKappaTasks = computed(() =>
    t(
      'page.tasks.settings.filters.showKappaTasksTooltip',
      'Show tasks required for Kappa container'
    )
  );
  const labelShowLightkeeperTasks = computed(() =>
    t(
      'page.tasks.settings.filters.showLightkeeperTasks',
      'Show Lightkeeper Tasks and Lightkeeper-required Tasks'
    )
  );
  const tooltipShowLightkeeperTasks = computed(() =>
    t(
      'page.tasks.settings.filters.showLightkeeperTasksTooltip',
      'Show tasks from Lightkeeper trader and tasks required for Lightkeeper'
    )
  );
  const labelSharedByAllOnly = computed(() =>
    t(
      'page.tasks.settings.filters.sharedByAllOnly',
      'Only show tasks available to all visible teammates'
    )
  );
  const tooltipSharedByAllOnly = computed(() =>
    t(
      'page.tasks.settings.filters.sharedByAllOnlyTooltip',
      'Filters the list to tasks that every visible teammate has available'
    )
  );
  const labelShowRequiredLabels = computed(() =>
    t('page.tasks.settings.appearance.showRequiredLabels', 'Show "Required" labels')
  );
  const tooltipShowRequiredLabels = computed(() =>
    t(
      'page.tasks.settings.appearance.showRequiredLabelsTooltip',
      'Show labels indicating Kappa or Lightkeeper requirements'
    )
  );
  const labelShowNotRequiredLabels = computed(() =>
    t('page.tasks.settings.appearance.showNotRequiredLabels', 'Show "Not Required" labels')
  );
  const tooltipShowNotRequiredLabels = computed(() =>
    t(
      'page.tasks.settings.appearance.showNotRequiredLabelsTooltip',
      'Show Non-Kappa labels on tasks not required for Kappa'
    )
  );
  const labelShowExperienceRewards = computed(() =>
    t('page.tasks.settings.appearance.showExperienceRewards', 'Show experience rewards')
  );
  const tooltipShowExperienceRewards = computed(() =>
    t(
      'page.tasks.settings.appearance.showExperienceRewardsTooltip',
      'Display experience points rewarded for completing tasks'
    )
  );
  const labelShowTaskIds = computed(() =>
    t('page.tasks.settings.appearance.showTaskIds', 'Show task IDs')
  );
  const tooltipShowTaskIds = computed(() =>
    t(
      'page.tasks.settings.appearance.showTaskIdsTooltip',
      'Display internal task ID at the bottom of each task card'
    )
  );
  const labelShowNextQuests = computed(() =>
    t('page.tasks.settings.appearance.showNextQuests', 'Show next quests')
  );
  const tooltipShowNextQuests = computed(() =>
    t(
      'page.tasks.settings.appearance.showNextQuestsTooltip',
      'Display tasks that will be unlocked after completing this task'
    )
  );
  const labelShowPreviousQuests = computed(() =>
    t('page.tasks.settings.appearance.showPreviousQuests', 'Show previous quests')
  );
  const tooltipShowPreviousQuests = computed(() =>
    t(
      'page.tasks.settings.appearance.showPreviousQuestsTooltip',
      'Display tasks that must be completed before this task'
    )
  );
  const labelEnableManualTaskFail = computed(() =>
    t('page.tasks.settings.advanced.manualFail', 'Enable manual task fail actions')
  );
  const tooltipEnableManualTaskFail = computed(() =>
    t(
      'page.tasks.settings.advanced.manualFailTooltip',
      'Allows marking tasks as failed from the overflow menu (use for recovery only)'
    )
  );
  const labelRepairFailedTasks = computed(() =>
    t('page.tasks.settings.advanced.repairFailed', 'Repair failed tasks')
  );
  const tooltipRepairFailedTasks = computed(() =>
    t(
      'page.tasks.settings.advanced.repairFailedTooltip',
      'Clears failed flags that no longer match fail conditions'
    )
  );
  // Task filter preferences (inverted for show/hide semantics)
  const showKappaTasks = computed(() => !preferencesStore.getHideNonKappaTasks);
  // New filter preferences with two-way binding
  const showNonSpecialTasks = computed({
    get: () => preferencesStore.getShowNonSpecialTasks,
    set: (value) => preferencesStore.setShowNonSpecialTasks(value),
  });
  const showLightkeeperTasks = computed({
    get: () => preferencesStore.getShowLightkeeperTasks,
    set: (value) => preferencesStore.setShowLightkeeperTasks(value),
  });
  const sharedByAllOnly = computed({
    get: () => preferencesStore.getTaskSharedByAllOnly,
    set: (value) => preferencesStore.setTaskSharedByAllOnly(value),
  });
  // Appearance preferences
  const showRequiredLabels = computed({
    get: () => preferencesStore.getShowRequiredLabels,
    set: (value) => preferencesStore.setShowRequiredLabels(value),
  });
  const showNotRequiredLabels = computed({
    get: () => preferencesStore.getShowNotRequiredLabels,
    set: (value) => preferencesStore.setShowNotRequiredLabels(value),
  });
  const showExperienceRewards = computed({
    get: () => preferencesStore.getShowExperienceRewards,
    set: (value) => preferencesStore.setShowExperienceRewards(value),
  });
  const showTaskIds = computed({
    get: () => preferencesStore.getShowTaskIds,
    set: (value) => preferencesStore.setShowTaskIds(value),
  });
  const showNextQuests = computed({
    get: () => preferencesStore.getShowNextQuests,
    set: (value) => preferencesStore.setShowNextQuests(value),
  });
  const showPreviousQuests = computed({
    get: () => preferencesStore.getShowPreviousQuests,
    set: (value) => preferencesStore.setShowPreviousQuests(value),
  });
  const enableManualTaskFail = computed({
    get: () => preferencesStore.getEnableManualTaskFail,
    set: (value) => preferencesStore.setEnableManualTaskFail(value),
  });
  const failedTasksCount = computed(
    () => metadataStore.tasks.filter((task) => tarkovStore.isTaskFailed(task.id)).length
  );
  const isTaskSuccessful = (taskId: string) =>
    tarkovStore.isTaskComplete(taskId) && !tarkovStore.isTaskFailed(taskId);
  const hasStatus = (status: string[] | undefined, statuses: string[]) => {
    const normalized = (status ?? []).map((entry) => entry.toLowerCase());
    return statuses.some((value) => normalized.includes(value));
  };
  const buildAlternativeSources = () => {
    const sourcesByTask = new Map<string, string[]>();
    metadataStore.tasks.forEach((task) => {
      (task.alternatives ?? []).forEach((alternativeId) => {
        const sources = sourcesByTask.get(alternativeId) ?? [];
        if (!sources.includes(task.id)) {
          sources.push(task.id);
          sourcesByTask.set(alternativeId, sources);
        }
      });
    });
    return sourcesByTask;
  };
  const shouldTaskBeFailed = (
    task: {
      id: string;
      failConditions?: Array<{ task?: { id?: string }; status?: string[] }>;
    },
    alternativeSources: Map<string, string[]>
  ) => {
    if (MANUAL_FAIL_TASK_IDS.includes(task.id)) return true;
    const failConditions = task.failConditions ?? [];
    const failedByCondition = failConditions.some((objective) => {
      if (!objective?.task?.id) return false;
      if (!hasStatus(objective.status, ['complete', 'completed'])) return false;
      return isTaskSuccessful(objective.task.id);
    });
    if (failedByCondition) return true;
    const sources = alternativeSources.get(task.id);
    if (!sources?.length) return false;
    return sources.some((sourceId) => isTaskSuccessful(sourceId));
  };
  const repairFailedTasks = () => {
    if (failedTasksCount.value === 0) return;
    const confirmed = window.confirm(
      t(
        'page.tasks.settings.advanced.repairFailedConfirm',
        'Repair failed tasks by clearing failed flags that are not supported by current fail conditions?'
      )
    );
    if (!confirmed) return;
    const alternativeSources = buildAlternativeSources();
    let repaired = 0;
    metadataStore.tasks.forEach((task) => {
      if (!tarkovStore.isTaskFailed(task.id)) return;
      if (shouldTaskBeFailed(task, alternativeSources)) return;
      tarkovStore.setTaskUncompleted(task.id);
      task.objectives?.forEach((objective) => {
        if (objective?.id) {
          tarkovStore.setTaskObjectiveUncomplete(objective.id);
        }
      });
      repaired += 1;
    });
    window.alert(
      t(
        'page.tasks.settings.advanced.repairFailedDone',
        { count: repaired },
        'Cleared failed status for {count} tasks.'
      )
    );
  };
</script>
