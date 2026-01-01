<template>
  <UCard
    :id="`task-${task.id}`"
    class="relative overflow-hidden border border-base bg-surface-elevated shadow-md dark:shadow-sm"
    :class="taskClasses"
    :ui="{ body: cardBodyClass }"
    @contextmenu.prevent="openOverflowMenu"
  >
    <div
      v-if="showBackgroundIcon"
      class="pointer-events-none absolute inset-0 z-0 flex rotate-12 transform items-center justify-center p-8 opacity-15"
      :class="backgroundIconColor"
    >
      <UIcon
        :name="backgroundIcon.startsWith('mdi-') ? `i-${backgroundIcon}` : backgroundIcon"
        aria-hidden="true"
        class="h-24 w-24"
      />
    </div>
    <div class="relative z-10 flex h-full flex-col" :class="isCompact ? 'gap-2' : 'gap-3'">
      <!--1) Header: identity + state -->
      <div class="flex flex-nowrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
            <router-link
              v-tooltip="task?.name"
              :to="`/tasks?task=${task.id}`"
              class="text-primary-700 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 flex min-w-0 items-center gap-2 no-underline"
              @click.stop
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
              <span class="min-w-0 truncate text-sm font-semibold text-content-primary sm:text-base">
                {{ task?.name }}
              </span>
            </router-link>
          <!-- External link icons -->
          <div class="ml-2 flex shrink-0 items-center gap-1.5">
              <a
                v-if="task.wikiLink"
                v-tooltip="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
                :href="task.wikiLink"
                target="_blank"
                rel="noopener noreferrer"
                class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 inline-flex items-center justify-center rounded p-1 text-gray-500 transition-colors hover:bg-surface-200 hover:text-content-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:text-gray-400"
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
                class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 inline-flex items-center justify-center rounded p-1 text-gray-500 transition-colors hover:bg-surface-200 hover:text-content-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:text-gray-400"
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
        </div>
        <div class="flex shrink-0 flex-nowrap items-center justify-end gap-2.5">
          <div class="flex items-center gap-1.5">
              <UBadge
                v-if="(task.minPlayerLevel ?? 0) > 0"
                v-tooltip="
                  t(
                    'page.tasks.questcard.levelBadgeTooltip',
                    { level: task.minPlayerLevel },
                    `Minimum player level ${task.minPlayerLevel} required to unlock this quest`
                  )
                "
                size="xs"
                :color="'gray' as any"
                variant="solid"
                class="cursor-help text-xs !text-white"
                :class="meetsLevelRequirement ? '!bg-success-600' : '!bg-error-600'"
              >
                {{ t('page.tasks.questcard.levelBadge', { count: task.minPlayerLevel }) }}
              </UBadge>
              <UBadge
                v-tooltip="task?.map?.name || t('page.tasks.questcard.anyMap', 'Any')"
                size="xs"
                :color="'gray' as any"
                variant="solid"
                class="inline-flex max-w-[10rem] items-center gap-1 text-xs !bg-gray-400 !text-white"
              >
                <UIcon
                  :name="task?.map?.name ? 'i-mdi-map-marker' : 'i-mdi-earth'"
                  aria-hidden="true"
                  class="h-3 w-3"
                />
                <span class="truncate">
                  {{ task?.map?.name || t('page.tasks.questcard.anyMap', 'Any') }}
                </span>
              </UBadge>
            <UBadge
              v-if="objectiveProgress.total > 0"
              size="xs"
              :color="'gray' as any"
              variant="solid"
              class="inline-flex items-center gap-1 text-xs !bg-gray-400 !text-white"
            >
              <UIcon name="i-mdi-progress-check" aria-hidden="true" class="h-3 w-3" />
              {{ t('page.tasks.questcard.progress', objectiveProgress) }}
            </UBadge>

            <UBadge
              v-if="isInvalid && !isFailed"
              v-tooltip="
                t(
                  'page.tasks.questcard.blockedTooltip',
                  'This quest is permanently blocked and can never be completed due to choices made in other quests'
                )
              "
              size="xs"
              :color="'gray' as any"
              variant="solid"
              class="cursor-help text-xs !bg-gray-400 !text-white"
            >
              {{ t('page.tasks.questcard.blocked', 'Blocked') }}
            </UBadge>
              <UBadge
                v-if="preferencesStore.getShowRequiredLabels && task.kappaRequired"
                v-tooltip="
                  t(
                    'page.tasks.questcard.kappaTooltip',
                    'This quest is required to obtain the Kappa Secure Container'
                  )
                "
                size="xs"
                color="error"
                variant="solid"
                class="cursor-help text-xs !bg-[var(--color-entity-kappa)] !text-white"
              >
                {{ t('page.tasks.questcard.kappa', 'Kappa') }}
              </UBadge>
              <UBadge
                v-if="preferencesStore.getShowRequiredLabels && task.lightkeeperRequired"
                v-tooltip="
                  t(
                    'page.tasks.questcard.lightkeeperTooltip',
                    'This quest is required to unlock the Lightkeeper trader'
                  )
                "
                size="xs"
                color="warning"
                variant="solid"
                class="cursor-help text-xs !bg-[var(--color-entity-lightkeeper)] !text-white"
              >
                {{ t('page.tasks.questcard.lightkeeper', 'Lightkeeper') }}
              </UBadge>
            <UBadge
              v-if="isFailed"
              size="xs"
              :color="'gray' as any"
              variant="solid"
              class="text-[11px] !bg-[var(--color-task-failed)] !text-white"
            >
               {{ t('page.dashboard.stats.failed.stat', 'Failed') }}
            </UBadge>
            <!-- XP display - moved to TaskCardRewards -->
          </div>
          <!-- Action buttons in header for consistent positioning -->
          <template v-if="isOurFaction">
            <!-- 1) Locked state: Green "UNLOCK" button -->
            <UButton
              v-if="isLocked"
              :size="actionButtonSize"
              icon="i-mdi-lock-open-variant"
              color="success"
              variant="solid"
              class="shrink-0 !bg-success-600 hover:!bg-success-700 !text-white shadow-sm"
              @click.stop="markTaskAvailable()"
            >
              {{ t('page.tasks.questcard.unlockbutton', 'Unlock').toUpperCase() }}
            </UButton>

            <!-- 2) Available state: Green "COMPLETE" button -->
            <UButton
              v-else-if="!isComplete"
              :size="actionButtonSize"
              icon="i-mdi-check-circle"
              color="success"
              :ui="completeButtonUi"
              class="shrink-0"
              @click.stop="markTaskComplete()"
            >
              {{ t('page.tasks.questcard.completebutton', 'Complete').toUpperCase() }}
            </UButton>

            <!-- 3) Completed state: Primary "AVAILABLE" button -->
            <UButton
              v-else
              :size="actionButtonSize"
              icon="i-mdi-clipboard-text"
              color="primary"
              variant="solid"
              class="shrink-0 shadow-sm"
              @click.stop="markTaskUncomplete()"
            >
              {{ t('page.tasks.questcard.availablebutton', 'Available').toUpperCase() }}
            </UButton>
          </template>
          <!-- Menu button -->
            <UButton
              v-if="isOurFaction"
              v-tooltip="t('page.tasks.questcard.more', 'More')"
              size="xs"
              color="neutral"
              variant="ghost"
              class="shrink-0"
              :aria-label="t('page.tasks.questcard.more', 'More')"
              @click.stop="openOverflowMenu"
            >
              <UIcon name="i-mdi-dots-horizontal" aria-hidden="true" class="h-5 w-5" />
            </UButton>
        </div>
      </div>
      <TaskRequiresRow
        v-if="isLocked && pendingParentTasks.length > 0"
        :parents="pendingParentTasks"
        class="mt-1"
      />
      <!-- Failed because section -->
      <div v-if="isFailed" class="text-xs text-error-700 dark:text-error-300">
        <span class="text-error-600/90 dark:text-error-200/70">
          {{ t('page.tasks.questcard.failedbecause', 'Failed because') }}:
        </span>
        <template v-if="failureSources.length > 0">
          <span class="ml-2 inline-flex flex-wrap items-center gap-1.5">
            <router-link
              v-for="source in failureSources"
              :key="source.id"
              :to="`/tasks?task=${source.id}`"
              class="inline-flex max-w-[16rem] items-center rounded-md border border-error-500/30 bg-error-500/10 px-2 py-0.5 text-[11px] text-error-800 hover:bg-error-500/20 dark:text-error-200"
            >
              {{ source.name }}
            </router-link>
          </span>
        </template>
        <span v-else class="ml-2 text-error-700/80 dark:text-error-200/80">
          {{ t('page.tasks.questcard.failedbecauseunknown', 'Failed manually or data missing') }}
        </span>
      </div>
      <!-- 3) Body: objectives -->
      <div :class="isCompact ? 'space-y-3' : 'space-y-4'">
        <QuestKeys v-if="task?.neededKeys?.length" :needed-keys="task.neededKeys" />
        <QuestObjectives
          :objectives="relevantViewObjectives"
          :irrelevant-count="irrelevantObjectives.length"
          :uncompleted-irrelevant="uncompletedIrrelevantObjectives.length"
        />
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
      <div 
        v-if="!isNested && childTasks.length > 0"
        class="rounded-md border border-gray-200 p-2 transition-colors dark:border-white/5"
        :class="{ 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/5': true }"
        @click.stop="toggleExpanded('children')"
      >
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
                <UIcon 
                :name="expandedTasks.has('children') ? 'i-mdi-chevron-down' : 'i-mdi-chevron-right'" 
                  class="h-4 w-4 text-gray-400 dark:text-gray-500"
                />
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                {{ t('page.tasks.questcard.nextQuests', 'Next Quests') }}:
                </span>
                <UBadge size="xs" color="neutral" variant="soft" class="flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-xs font-medium !text-gray-700 dark:!text-gray-300">
                  {{ childTasks.length }}
                </UBadge>
          </div>
          <!-- Stats: Remaining -->
          <div 
            v-if="impactCount > 0" 
            v-tooltip="{ content: t('page.tasks.questcard.remainingTooltip', 'Tasks blocked by this task, but not unlocked by completing it'), placement: 'top-end' }"
            class="flex cursor-help items-center text-xs text-content-tertiary"
          >
              <span>
                {{ t('page.tasks.questcard.remainingLabel', 'Remaining') }}: {{ impactCount }}
              </span>
          </div>
        </div>
          <div 
            v-if="expandedTasks.has('children')" 
            class="mt-2 flex flex-col gap-2"
          >
            <TaskCard
              v-for="child in childTasks"
              :key="`nested-child-${child.id}`"
              :task="child"
              :is-nested="true"
              @on-task-action="$emit('on-task-action', $event)"
            />
        </div>
      </div>

      <!-- Previous Quests Toggle -->
      <div 
        v-if="!isNested && parentTasks.length > 0"
        class="rounded-md border border-gray-200 p-2 transition-colors dark:border-white/5"
        :class="{ 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/5': true }"
        @click.stop="toggleExpanded('parents')"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
              <UIcon 
                :name="expandedTasks.has('parents') ? 'i-mdi-chevron-down' : 'i-mdi-chevron-right'" 
                class="h-4 w-4 text-gray-400 dark:text-gray-500"
              />
              <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {{ t('page.tasks.questcard.previousQuests', 'Previous Quests') }}:
              </span>
                <UBadge size="xs" :color="'gray' as any" variant="soft" class="flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-xs font-medium !text-gray-700 dark:!text-gray-300">
                {{ parentTasks.length }}
              </UBadge>
          </div>
        </div>
        <div 
          v-if="expandedTasks.has('parents')" 
          class="mt-2 flex flex-col gap-2"
        >
            <TaskCard
              v-for="parent in parentTasks"
              :key="`nested-parent-${parent.id}`"
              :task="parent"
              :is-nested="true"
              @on-task-action="$emit('on-task-action', $event)"
            />
        </div>
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
  const TaskRequiresRow = defineAsyncComponent(
    () => import('@/features/tasks/TaskRequiresRow.vue')
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
  const formatNumber = useLocaleNumberFormatter();
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
    if (isComplete.value && !isFailed.value) return 'border-success-500/25 bg-success-500/10';
    if (isFailed.value) return 'border-error-500/25 bg-error-500/10'; // Red for failed
    if (isInvalid.value) return 'border-neutral-500/25 bg-neutral-500/10 opacity-60'; // Gray for blocked
    if (isLocked.value) return 'border-warning-500/25 bg-warning-500/10'; // Amber/orange for locked
    return 'border-base';
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
    if (isFailed.value) return 'text-error-400';
    if (isComplete.value) return 'text-success-400';
    if (isInvalid.value) return 'text-neutral-400';
    if (isLocked.value) return 'text-warning-400';
    return 'text-brand-200';
  });
  const lockedBehind = computed(() => {
    return props.task.successors?.filter((s) => !isTaskSuccessful(s)).length || 0;
  });
  const lockedBefore = computed(() => {
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
    const sources = new Map<string, { id: string; name: string }>();
    (props.task.failConditions ?? [])
      .filter(
        (objective) => objective?.task?.id && hasStatus(objective.status, ['complete', 'completed'])
      )
      .filter((objective) => isTaskSuccessful(objective.task!.id))
      .forEach((objective) => {
        const id = objective.task!.id;
        sources.set(id, { id, name: objective.task!.name ?? id });
      });
    tasks.value.forEach((task) => {
      if (!task.alternatives?.includes(props.task.id)) return;
      if (!isTaskSuccessful(task.id)) return;
      sources.set(task.id, { id: task.id, name: task.name ?? task.id });
    });
    return Array.from(sources.values());
  });
  const pendingParentTasks = computed(() => {
    return parentTasks.value.filter((parent) => !isTaskSuccessful(parent.id));
  });
  const childTasks = computed(() => {
    if (!props.task.children?.length) return [];
    return props.task.children
      .map((id) => tasks.value.find((task) => task.id === id))
      .filter((task): task is Task => task !== undefined);
  });
  const unlocksNextCount = computed(() => childTasks.value.length);
  const impactCount = computed(() => lockedBehind.value);
  const afterHasContent = computed(() => unlocksNextCount.value > 0 || impactCount.value > 0);
  const traderStandingRewards = computed(() => props.task.finishRewards?.traderStanding ?? []);
  const skillRewards = computed(() => props.task.finishRewards?.skillLevelReward ?? []);
  const traderUnlockReward = computed(() => props.task.finishRewards?.traderUnlock);
  const itemRewards = computed(() => props.task.finishRewards?.items ?? []);
  const offerUnlockRewards = computed(() => props.task.finishRewards?.offerUnlock ?? []);
  const completeButtonUi = {
    base: 'bg-success-500 hover:bg-success-600 active:bg-success-700 text-white border border-success-700',
  };
  const actionButtonSize = computed(() => (xs.value ? 'xs' : 'sm'));
  const isHotWheelsTask = computed(() => props.task.id === HOT_WHEELS_TASK_ID);
  const showHotWheelsFail = computed(
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
    const href = router.resolve(`/tasks?task=${props.task.id}`).href;
    return copyTextToClipboard(`${window.location.origin}${href}`);
  };
  const openTaskWiki = () => {
    if (props.task.wikiLink) {
      window.open(props.task.wikiLink, '_blank');
    }
  };

  // Expanded state for recursive cards
  const expandedTasks = ref<Set<string>>(new Set());
  
  const toggleExpanded = (section: 'parents' | 'children') => {
    if (expandedTasks.value.has(section)) {
      expandedTasks.value.delete(section);
    } else {
      expandedTasks.value.add(section);
    }
  };
</script>
