<template>
  <UCard
    :id="`task-${task.id}`"
    class="relative overflow-hidden border border-base bg-surface-elevated shadow-md dark:shadow-sm"
    :class="taskClasses"
    :ui="{ body: cardBodyClass }"
    @contextmenu.prevent="openOverflowMenu"
  >
    <div class="relative z-10 flex h-full flex-col" :class="isCompact ? 'gap-2' : 'gap-3'">
      <!--1) Header: identity + state -->
      <div class="flex flex-nowrap items-center justify-between gap-3">
        <!-- Left side: Task identity + badges -->
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span v-tooltip="task?.name">
            <a
              href="#"
              class="text-accent-700 hover:text-accent-600 dark:text-accent-400 dark:hover:text-accent-300 flex min-w-0 items-center gap-2 no-underline"
              @click.stop.prevent="navigateToTask"
            >
              <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-800">
                <img
                  v-if="task?.trader?.imageLink"
                  :src="task.trader.imageLink"
                  :alt="task?.trader?.name || 'Trader'"
                  class="h-full w-full object-cover"
                />
                <UIcon v-else name="i-mdi-account-circle" class="h-full w-full text-gray-400 dark:text-gray-400" />
              </div>
              <img
                v-if="isFactionTask"
                :src="factionImage"
                :alt="task?.factionName"
                class="h-6 w-6 shrink-0 object-contain invert dark:invert-0"
              />
              <span class="min-w-0 truncate font-semibold">
                {{ task?.name }}
              </span>
            </a>
          </span>
          <!-- External link icons -->
          <div class="flex shrink-0 items-center gap-1.5">
            <a
              v-if="task.wikiLink"
              v-tooltip="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
              :href="task.wikiLink"
              target="_blank"
              rel="noopener noreferrer"
              class="focus-visible:ring-accent-500 focus-visible:ring-offset-surface-900 inline-flex items-center justify-center rounded p-1 text-gray-500 transition-colors hover:bg-surface-200 hover:text-content-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:text-gray-400"
              :aria-label="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
              @click.stop
            >
              <img src="/img/logos/wikilogo.webp" alt="Wiki" aria-hidden="true" class="h-5 w-5" />
            </a>
            <a
              v-tooltip="t('page.tasks.questcard.viewOnTarkovDev', 'View on tarkov.dev')"
              :href="tarkovDevTaskUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="focus-visible:ring-accent-500 focus-visible:ring-offset-surface-900 inline-flex items-center justify-center rounded p-1 text-gray-500 transition-colors hover:bg-surface-200 hover:text-content-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:text-gray-400"
              :aria-label="t('page.tasks.questcard.viewOnTarkovDev', 'View on tarkov.dev')"
              @click.stop
            >
              <img
                src="/img/logos/tarkovdevlogo.webp"
                alt="tarkov.dev"
                aria-hidden="true"
                class="h-5 w-5"
              />
            </a>
          </div>
          <!-- Info badges (left-aligned, after task name) -->
          <div class="flex flex-wrap items-center gap-1.5">
            <!-- Level Badge -->
            <GameBadge
              v-if="(task.minPlayerLevel ?? 0) > 0"
              variant="solid"
              color="gray"
              :tooltip="
                t(
                  'page.tasks.questcard.levelBadgeTooltip',
                  { level: task.minPlayerLevel },
                  `Minimum player level ${task.minPlayerLevel} required to unlock this quest`
                )
              "
              :badge-class="[
                'cursor-help text-xs',
                meetsLevelRequirement ? 'badge-soft-success' : 'badge-soft-error'
              ]"
              :label="t('page.tasks.questcard.levelBadge', { count: task.minPlayerLevel })"
            />
            <!-- Map Badge -->
            <GameBadge
              variant="solid"
              color="gray"
              :tooltip="task?.map?.name || t('page.tasks.questcard.anyMap', 'Any')"
              badge-class="badge-soft-map inline-flex max-w-[10rem] items-center gap-1 text-xs"
            >
              <UIcon 
                :name="task?.map?.name ? 'i-mdi-map-marker' : 'i-mdi-earth'" 
                class="h-3 w-3" 
                aria-hidden="true" 
              />
              <span class="truncate">
                {{ task?.map?.name || t('page.tasks.questcard.anyMap', 'Any') }}
              </span>
            </GameBadge>
            <!-- Kappa Badge -->
            <GameBadge
              v-if="preferencesStore.getShowRequiredLabels && task.kappaRequired"
              variant="solid"
              color="error"
              icon="i-mdi-trophy"
              :tooltip="
                t(
                  'page.tasks.questcard.kappaTooltip',
                  'This quest is required to obtain the Kappa Secure Container'
                )
              "
              badge-class="badge-soft-kappa cursor-help text-xs"
              :label="t('page.tasks.questcard.kappa', 'Kappa')"
            />
            <!-- Lightkeeper Badge -->
            <GameBadge
              v-if="preferencesStore.getShowRequiredLabels && task.lightkeeperRequired"
              variant="solid"
              color="warning"
              icon="i-mdi-lighthouse"
              :tooltip="
                t(
                  'page.tasks.questcard.lightkeeperTooltip',
                  'This quest is required to unlock the Lightkeeper trader'
                )
              "
              badge-class="badge-soft-lightkeeper cursor-help text-xs"
              :label="t('page.tasks.questcard.lightkeeper', 'Lightkeeper')"
            />
            <!-- Failed Badge -->
            <GameBadge
              v-if="isFailed"
              variant="solid"
              color="gray"
              badge-class="badge-soft-error text-[11px]"
              :label="t('page.dashboard.stats.failed.stat', 'Failed')"
            />
            <!-- Blocked Badge -->
            <GameBadge
              v-if="isInvalid && !isFailed"
              variant="solid"
              color="gray"
              :tooltip="
                t(
                  'page.tasks.questcard.blockedTooltip',
                  'This quest is permanently blocked and can never be completed due to choices made in other quests'
                )
              "
              badge-class="badge-soft-surface cursor-help text-xs"
              :label="t('page.tasks.questcard.blocked', 'Blocked')"
            />
            <!-- Progress Badge (only on available tasks) -->
            <GameBadge
              v-if="objectiveProgress.total > 0 && !isLocked && !isComplete && !isFailed && !isInvalid"
              variant="solid"
              color="gray"
              :badge-class="[
                'inline-flex items-center gap-1 text-xs',
                objectiveProgress.done === objectiveProgress.total
                  ? 'badge-soft-task-complete'
                  : 'badge-soft-reward-item'
              ]"
              icon="i-mdi-progress-check"
              :label="t('page.tasks.questcard.progress', objectiveProgress)"
            />
          </div>
        </div>
        <!-- Right side: Action buttons -->
        <div class="flex shrink-0 flex-nowrap items-center justify-end gap-2.5">
          <template v-if="isOurFaction">
            <!-- 1) Locked state: Primary "AVAILABLE" button -->
            <UButton
              v-if="isLocked && !isInvalid"
              :size="actionButtonSize"
              icon="i-mdi-clipboard-text"
              color="neutral"
              variant="soft"
              class="shrink-0 badge-soft-task-available font-semibold hover:opacity-90"
              @click.stop="markTaskAvailable()"
            >
              {{ t('page.tasks.questcard.availablebutton', 'Available').toUpperCase() }}
            </UButton>
            <!-- 2) Available state: Green "COMPLETE" button -->
            <UButton
              v-else-if="!isComplete && !isInvalid"
              :size="actionButtonSize"
              icon="i-mdi-check-circle"
              color="neutral"
              variant="soft"
              class="shrink-0 badge-soft-success font-semibold hover:opacity-90"
              @click.stop="markTaskComplete()"
            >
              {{ t('page.tasks.questcard.completebutton', 'Complete').toUpperCase() }}
            </UButton>
            <!-- 3) Completed state: Primary "AVAILABLE" button -->
            <UButton
              v-else
              :size="actionButtonSize"
              icon="i-mdi-clipboard-text"
              color="neutral"
              variant="soft"
              class="shrink-0 badge-soft-task-available font-semibold hover:opacity-90"
              @click.stop="markTaskUncomplete()"
            >
              {{ t('page.tasks.questcard.availablebutton', 'Available').toUpperCase() }}
            </UButton>
          </template>
          <!-- Menu button -->
          <span v-if="isOurFaction" v-tooltip="t('page.tasks.questcard.more', 'More')">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              class="shrink-0"
              :aria-label="t('page.tasks.questcard.more', 'More')"
              @click.stop="openOverflowMenu"
            >
              <UIcon name="i-mdi-dots-horizontal" aria-hidden="true" class="h-5 w-5" />
            </UButton>
          </span>
        </div>
      </div>
      <RelatedTasksRow
        v-if="isLocked && pendingParentTasks.length > 0"
        :tasks="pendingParentTasks"
        :label="$t('page.tasks.questcard.requires', 'Requires')"
        class="mt-1"
        expandable
        :expanded="expandedTasks.has('requires')"
        intent="warning"
        @toggle="toggleExpanded('requires')"
      >
        <div class="flex flex-col gap-2">
          <TaskCard
            v-for="req in pendingParentTasks"
            :key="`nested-req-${req.id}`"
            :task="req"
            :is-nested="true"
            @on-task-action="$emit('on-task-action', $event)"
          />
        </div>
      </RelatedTasksRow>
      <!-- Failed because section -->
      <RelatedTasksRow
        v-if="isFailed && failureSources.length > 0"
        :tasks="failureSources"
        :label="$t('page.tasks.questcard.failedbecause', 'Failed because')"
        intent="error"
        class="mt-1"
        expandable
        :expanded="expandedTasks.has('failed')"
        @toggle="toggleExpanded('failed')"
      >
        <div class="flex flex-col gap-2">
          <TaskCard
            v-for="fail in failureSources"
            :key="`nested-fail-${fail.id}`"
            :task="fail"
            :is-nested="true"
            @on-task-action="$emit('on-task-action', $event)"
          />
        </div>
      </RelatedTasksRow>
      <div v-else-if="isFailed" class="mt-1 text-xs text-error-700 dark:text-error-300">
         <span class="text-error-600/90 dark:text-error-200/70">
           {{ t('page.tasks.questcard.failedbecause', 'Failed because') }}:
         </span>
         <span class="ml-2 text-error-700/80 dark:text-error-200/80">
           {{ t('page.tasks.questcard.failedbecauseunknown', 'Failed manually or data missing') }}
         </span>
      </div>
      <!-- 3) Body: objectives (Secondary Body) -->
      <div class="relative -mx-1 -my-1 overflow-hidden p-1">
        <!-- Background Icon (The Background) -->
        <div
          v-if="showBackgroundIcon"
          class="pointer-events-none absolute inset-0 z-0 flex transform items-center justify-center opacity-80 rotate-12"
          :class="[backgroundIconColor]"
        >
          <UIcon
            :name="backgroundIcon.startsWith('mdi-') ? `i-${backgroundIcon}` : backgroundIcon"
            aria-hidden="true"
            class="h-12 w-12"
          />
        </div>
        <!-- Objective Content (The Existing Body) -->
        <div 
          class="relative z-10"
          :class="[
            isCompact ? 'space-y-3' : 'space-y-4',
            !isInteractive ? 'cursor-not-allowed opacity-60' : ''
          ]"
        >
          <QuestKeys v-if="task?.neededKeys?.length" :needed-keys="task.neededKeys" />
          <QuestObjectives
            :objectives="relevantViewObjectives"
            :irrelevant-count="irrelevantObjectives.length"
            :uncompleted-irrelevant="uncompletedIrrelevantObjectives.length"
          />
        </div>
      </div>
      <!--5) Rewards Summary Section -->
      <TaskCardRewards
        :task-id="task.id"
        :experience="task.experience || 0"
        :trader-standing-rewards="traderStandingRewards"
        :skill-rewards="skillRewards"
        :trader-unlock-reward="traderUnlockReward"
        :item-rewards="itemRewards"
        :offer-unlock-rewards="offerUnlockRewards"
        :parent-tasks="parentTasks"
        :child-tasks="childTasks"
        :unlocks-next-count="unlocksNextCount"
        :impact-count="impactCount"
        @item-context-menu="openItemContextMenu"
      />
      <!-- Next Quests Toggle -->
      <div v-if="childTasks.length > 0">
        <RelatedTasksRow
          :tasks="childTasks"
          :label="t('page.tasks.questcard.nextQuests', 'Next Quests')"
          expandable
          :expanded="expandedTasks.has('children')"
          intent="gray"
          @toggle="toggleExpanded('children')"
        >
          <template #suffix>
            <!-- Stats: Remaining -->
            <div 
              v-if="impactCount > 0" 
              v-tooltip="{ content: t('page.tasks.questcard.remainingTooltip', 'Tasks blocked by this task, but not unlocked by completing it'), placement: 'top-end' }"
              class="flex cursor-help items-center text-xs font-medium text-gray-500"
            >
                <span>
                  {{ t('page.tasks.questcard.remainingLabel', 'Remaining') }}: {{ impactCount }}
                </span>
            </div>
          </template>
          <div class="flex flex-col gap-2">
            <TaskCard
              v-for="child in childTasks"
              :key="`nested-child-${child.id}`"
              :task="child"
              :is-nested="true"
              @on-task-action="$emit('on-task-action', $event)"
            />
          </div>
        </RelatedTasksRow>
      </div>
      <!-- Previous Quests Toggle -->
      <div v-if="filteredPreviousTasks.length > 0">
        <RelatedTasksRow
          :tasks="filteredPreviousTasks"
          :label="t('page.tasks.questcard.previousQuests', 'Previous Quests')"
          expandable
          :expanded="expandedTasks.has('parents')"
          intent="gray"
          @toggle="toggleExpanded('parents')"
        >
          <div class="flex flex-col gap-2">
            <TaskCard
              v-for="parent in filteredPreviousTasks"
              :key="`nested-parent-${parent.id}`"
              :task="parent"
              :is-nested="true"
              @on-task-action="$emit('on-task-action', $event)"
            />
          </div>
        </RelatedTasksRow>
      </div>
    </div>
    <ContextMenu ref="taskContextMenu">
      <template #default="{ close }">
        <ContextMenuItem
          icon="i-mdi-content-copy"
          :label="t('page.tasks.questcard.copyTaskId', 'Copy task ID')"
          @click="
            copyTaskId();
            close();
          "
        />
        <ContextMenuItem
          icon="i-mdi-link-variant"
          :label="t('page.tasks.questcard.copyTaskLink', 'Copy task link')"
          @click="
            copyTaskLink();
            close();
          "
        />
        <ContextMenuItem
          v-if="task.wikiLink"
          icon="/img/logos/wikilogo.webp"
          :label="t('page.tasks.questcard.viewTaskOnWiki', 'View task on Wiki')"
          @click="
            openTaskWiki();
            close();
          "
        />
        <ContextMenuItem
          v-if="preferencesStore.getEnableManualTaskFail && isOurFaction && !isFailed"
          icon="i-mdi-close-circle"
          :label="t('page.tasks.questcard.markfailed', 'Mark Failed')"
          @click="
            confirmMarkFailed();
            close();
          "
        />
      </template>
    </ContextMenu>
    <!-- Item Context Menu -->
    <ContextMenu ref="itemContextMenu">
      <template #default="{ close }">
        <ContextMenuItem
          icon="/img/logos/tarkovdevlogo.webp"
          :label="t('page.tasks.questcard.viewOnTarkovDev', 'View on tarkov.dev')"
          @click="
            openItemOnTarkovDev();
            close();
          "
        />
        <ContextMenuItem
          icon="/img/logos/wikilogo.webp"
          :label="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
          @click="
            openItemOnWiki();
            close();
          "
        />
      </template>
    </ContextMenu>
  </UCard>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import ContextMenu from '@/components/ui/ContextMenu.vue';
  import ContextMenuItem from '@/components/ui/ContextMenuItem.vue';
  import GameBadge from '@/components/ui/GameBadge.vue';
  import { useSharedBreakpoints } from '@/composables/useSharedBreakpoints';
  import { useTaskActions, type TaskActionPayload } from '@/composables/useTaskActions';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { Task } from '@/types/tarkov';
  import { HOT_WHEELS_TASK_ID } from '@/utils/constants';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  type ContextMenuRef = {
    open: (
      event: MouseEvent,
      options?: { align?: 'left' | 'right'; trigger?: HTMLElement }
    ) => void;
  };
  const QuestKeys = defineAsyncComponent(() => import('@/features/tasks/QuestKeys.vue'));
  const QuestObjectives = defineAsyncComponent(
    () => import('@/features/tasks/QuestObjectives.vue')
  );
  const TaskCardRewards = defineAsyncComponent(
    () => import('@/features/tasks/TaskCardRewards.vue')
  );
  const RelatedTasksRow = defineAsyncComponent(
    () => import('@/features/tasks/RelatedTasksRow.vue')
  );
  const props = defineProps<{
    task: Task;
    isNested?: boolean;
  }>();
  const emit = defineEmits<{
    'on-task-action': [payload: TaskActionPayload];
  }>();
  const { t } = useI18n({ useScope: 'global' });
  const router = useRouter();
  const { xs } = useSharedBreakpoints();
  const tarkovStore = useTarkovStore();
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const _formatNumber = useLocaleNumberFormatter();
  const tasks = computed(() => metadataStore.tasks);
  const taskContextMenu = ref<ContextMenuRef | null>(null);
  const itemContextMenu = ref<ContextMenuRef | null>(null);
  const selectedItem = ref<{ id: string; wikiLink?: string } | null>(null);
  // Use extracted task actions composable
  const { markTaskComplete, markTaskUncomplete, markTaskAvailable, markTaskFailed } =
    useTaskActions(
      () => props.task,
      (payload) => emit('on-task-action', payload)
    );
  const isComplete = computed(() => tarkovStore.isTaskComplete(props.task.id));
  const isFailed = computed(() => tarkovStore.isTaskFailed(props.task.id));
  const isInteractive = computed(
    () => !isLocked.value && !isComplete.value && !isFailed.value && !isInvalid.value
  );
  const isTaskSuccessful = (taskId: string) =>
    tarkovStore.isTaskComplete(taskId) && !tarkovStore.isTaskFailed(taskId);
  const hasStatus = (status: string[] | undefined, statuses: string[]) => {
    const normalized = (status ?? []).map((entry) => entry.toLowerCase());
    return statuses.some((value) => normalized.includes(value));
  };
  const isLocked = computed(() => {
    return progressStore.unlockedTasks[props.task.id]?.self !== true && !isComplete.value;
  });
  const isInvalid = computed(() => {
    // Check if task is permanently blocked (can never be completed)
    return progressStore.invalidTasks[props.task.id]?.self === true && !isComplete.value;
  });
  const isOurFaction = computed(() => {
    const taskFaction = props.task.factionName;
    return taskFaction === 'Any' || taskFaction === tarkovStore.getPMCFaction();
  });
  const meetsLevelRequirement = computed(() => {
    const minLevel = props.task.minPlayerLevel ?? 0;
    return minLevel <= 0 || tarkovStore.playerLevel() >= minLevel;
  });
  const taskClasses = computed(() => {
    const cursor = props.isNested ? 'cursor-pointer' : 'cursor-default';
    if (isComplete.value && !isFailed.value) return `border-success-500/25 bg-success-500/10 ${cursor}`;
    if (isFailed.value) return `border-error-500/25 bg-error-500/10 ${cursor}`; // Red for failed
    if (isInvalid.value) return `border-[var(--color-task-blocked)]/25 bg-[var(--color-task-blocked)]/10 ${cursor}`; // Gray for blocked
    if (isLocked.value) return `border-[var(--color-task-locked)]/25 bg-[var(--color-task-locked)]/10 ${cursor}`; // Amber/orange for locked
    return `border-base ${cursor}`;
  });
  const isCompact = computed(() => preferencesStore.getTaskCardDensity === 'compact');
  const cardBodyClass = computed(() => {
    return isCompact.value ? 'p-3 flex flex-col' : 'p-4 flex flex-col';
  });
  const showBackgroundIcon = computed(
    () => isLocked.value || isFailed.value || isComplete.value || isInvalid.value
  );
  const backgroundIcon = computed(() => {
    if (isFailed.value) return 'mdi-close-octagon';
    if (isComplete.value) return 'mdi-check';
    if (isInvalid.value) return 'mdi-cancel';
    if (isLocked.value) return 'mdi-lock';
    return '';
  });
  const backgroundIconColor = computed(() => {
    if (isFailed.value) return 'text-error-600';
    if (isComplete.value) return 'text-success-600';
    if (isInvalid.value) return 'text-neutral-600';
    if (isLocked.value) return 'text-[var(--color-task-locked)]';
    return 'text-brand-600';
  });
  const lockedBehind = computed(() => {
    return props.task.successors?.filter((s) => !isTaskSuccessful(s)).length || 0;
  });
  const _lockedBefore = computed(() => {
    return props.task.predecessors?.filter((s) => !isTaskSuccessful(s)).length || 0;
  });
  const isFactionTask = computed(() => props.task.factionName !== 'Any');
  const factionImage = computed(() => `/img/factions/${props.task.factionName}.webp`);
  const parentTasks = computed(() => {
    if (!props.task.parents?.length) return [];
    return props.task.parents
      .map((id) => tasks.value.find((task) => task.id === id))
      .filter((task): task is Task => task !== undefined);
  });
  const failureSources = computed(() => {
    if (!isFailed.value) return [];
    const sourceIds = new Set<string>();
    (props.task.failConditions ?? [])
      .filter(
        (objective) => objective?.task?.id && hasStatus(objective.status, ['complete', 'completed'])
      )
      .filter((objective) => isTaskSuccessful(objective.task!.id))
      .forEach((objective) => {
        sourceIds.add(objective.task!.id);
      });
    tasks.value.forEach((task) => {
      if (!task.alternatives?.includes(props.task.id)) return;
      if (!isTaskSuccessful(task.id)) return;
      sourceIds.add(task.id);
    });
    return Array.from(sourceIds)
      .map(id => tasks.value.find(t => t.id === id))
      .filter((t): t is Task => t !== undefined);
  });
  const pendingParentTasks = computed(() => {
    return parentTasks.value.filter((parent) => !isTaskSuccessful(parent.id));
  });
  const filteredPreviousTasks = computed(() => {
    // If the "Requires" row is visible (isLocked and has pending requirements),
    // exclude those requirements from the "Previous Quests" list to avoid duplication.
    if (isLocked.value && pendingParentTasks.value.length > 0) {
      const requiredIds = new Set(pendingParentTasks.value.map((t) => t.id));
      return parentTasks.value.filter((t) => !requiredIds.has(t.id));
    }
    return parentTasks.value;
  });
  const childTasks = computed(() => {
    if (!props.task.children?.length) return [];
    return props.task.children
      .map((id) => tasks.value.find((task) => task.id === id))
      .filter((task): task is Task => task !== undefined);
  });
  const unlocksNextCount = computed(() => childTasks.value.length);
  const impactCount = computed(() => lockedBehind.value);
  const _afterHasContent = computed(() => unlocksNextCount.value > 0 || impactCount.value > 0);
  const traderStandingRewards = computed(() => props.task.finishRewards?.traderStanding ?? []);
  const skillRewards = computed(() => props.task.finishRewards?.skillLevelReward ?? []);
  const traderUnlockReward = computed(() => props.task.finishRewards?.traderUnlock);
  const itemRewards = computed(() => props.task.finishRewards?.items ?? []);
  const offerUnlockRewards = computed(() => props.task.finishRewards?.offerUnlock ?? []);
  const _completeButtonUi = {
    base: 'bg-success-500 hover:bg-success-600 active:bg-success-700 text-white border border-success-700',
  };
  const actionButtonSize = computed(() => (xs.value ? 'xs' : 'sm'));
  const isHotWheelsTask = computed(() => props.task.id === HOT_WHEELS_TASK_ID);
  const _showHotWheelsFail = computed(
    () => isHotWheelsTask.value && !isComplete.value && !isLocked.value
  );
  const mapObjectiveTypes = [
    'mark',
    'zone',
    'extract',
    'visit',
    'findItem',
    'findQuestItem',
    'plantItem',
    'plantQuestItem',
    'shoot',
  ];
  const onMapView = computed(() => preferencesStore.getTaskPrimaryView === 'maps');
  const relevantViewObjectives = computed(() => {
    if (!onMapView.value) return props.task.objectives ?? [];
    return (props.task.objectives ?? []).filter((objective) => {
      if (!Array.isArray(objective.maps) || !objective.maps.length) return true;
      return (
        objective.maps.some((map) => map.id === preferencesStore.getTaskMapView) &&
        mapObjectiveTypes.includes(objective.type ?? '')
      );
    });
  });
  const irrelevantObjectives = computed(() => {
    if (!onMapView.value) return [];
    return (props.task.objectives ?? []).filter((objective) => {
      if (!Array.isArray(objective.maps) || !objective.maps.length) return false;
      const onSelectedMap = objective.maps.some(
        (map) => map.id === preferencesStore.getTaskMapView
      );
      const isMapType = mapObjectiveTypes.includes(objective.type ?? '');
      return !(onSelectedMap && isMapType);
    });
  });
  const uncompletedIrrelevantObjectives = computed(() => {
    return (props.task.objectives ?? [])
      .filter((objective) => {
        const onCorrectMap = objective.maps?.some(
          (map) => map.id === preferencesStore.getTaskMapView
        );
        const isMapObjectiveType = mapObjectiveTypes.includes(objective.type ?? '');
        return !onCorrectMap || !isMapObjectiveType;
      })
      .filter((objective) => !tarkovStore.isTaskObjectiveComplete(objective.id));
  });
  const objectiveProgress = computed(() => {
    const total = relevantViewObjectives.value.length;
    const done = relevantViewObjectives.value.filter((objective) => {
      return tarkovStore.isTaskObjectiveComplete(objective.id);
    }).length;
    return { done, total };
  });
  const tarkovDevTaskUrl = computed(() => `https://tarkov.dev/task/${props.task.id}`);
  const openOverflowMenu = (event: MouseEvent) => {
    const isClick = event.type === 'click';
    taskContextMenu.value?.open(event, {
      align: isClick ? 'right' : undefined,
      trigger: isClick ? (event.currentTarget as HTMLElement) : undefined,
    });
  };
  const openItemContextMenu = (
    event: MouseEvent,
    item: { id: string; wikiLink?: string } | undefined
  ) => {
    if (!item) return;
    selectedItem.value = item;
    itemContextMenu.value?.open(event);
  };
  const openItemOnTarkovDev = () => {
    if (!selectedItem.value) return;
    window.open(`https://tarkov.dev/item/${selectedItem.value.id}`, '_blank');
  };
  const openItemOnWiki = () => {
    if (selectedItem.value?.wikiLink) {
      window.open(selectedItem.value.wikiLink, '_blank');
      return;
    }
    if (!selectedItem.value) return;
    window.open(
      `https://escapefromtarkov.fandom.com/wiki/Special:Search?query=${selectedItem.value.id}`,
      '_blank'
    );
  };
  const confirmMarkFailed = () => {
    const confirmed = window.confirm(
      t(
        'page.tasks.questcard.markfailedconfirm',
        "Mark this task as failed? This is only for data issues, isn't recommended, and may block questlines."
      )
    );
    if (!confirmed) return;
    markTaskFailed();
  };
  const copyTextToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // ignore and fall back
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };
  const copyTaskId = () => copyTextToClipboard(props.task.id);
  const copyTaskLink = () => {
    const href = router.resolve(`/tasks?task=${props.task.id}&status=all`).href;
    return copyTextToClipboard(`${window.location.origin}${href}`);
  };
  const openTaskWiki = () => {
    if (props.task.wikiLink) {
      window.open(props.task.wikiLink, '_blank');
    }
  };

  /**
   * Navigate to single-task view with status=all to ensure task is visible.
   */
  const navigateToTask = () => {
    router.push(`/tasks?task=${props.task.id}&status=all`);
  };
  // Expanded state for recursive cards
  const expandedTasks = ref<Set<string>>(new Set());
  const toggleExpanded = (section: 'parents' | 'children' | 'requires' | 'failed') => {
    if (expandedTasks.value.has(section)) {
      expandedTasks.value.delete(section);
    } else {
      expandedTasks.value.add(section);
    }
  };
</script>
