<template>
  <UCard
    :id="`task-${task.id}`"
    class="relative overflow-hidden border border-white/10 bg-[hsl(240_5%_7%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_30px_rgba(0,0,0,0.35)]"
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
    <div class="relative z-10 flex h-full flex-col" :class="isCompact ? 'gap-3' : 'gap-4'">
      <!--1) Header: identity + state -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <AppTooltip :text="task?.name">
            <router-link
              :to="`/tasks?task=${task.id}`"
              class="text-primary-400 hover:text-primary-300 flex min-w-0 items-center gap-2 no-underline"
            >
              <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-800">
                <img
                  v-if="task?.trader?.imageLink"
                  :src="task.trader.imageLink"
                  :alt="task?.trader?.name || 'Trader'"
                  class="h-full w-full object-cover"
                />
                <UIcon v-else name="i-mdi-account-circle" class="h-full w-full text-gray-400" />
              </div>
              <img
                v-if="isFactionTask"
                :src="factionImage"
                :alt="task?.factionName"
                class="h-6 w-6 shrink-0 object-contain invert"
              />
              <span class="min-w-0 truncate text-sm font-semibold text-gray-100 sm:text-base">
                {{ task?.name }}
              </span>
            </router-link>
          </AppTooltip>
          <!-- External link icons -->
          <div class="ml-2 flex shrink-0 items-center gap-1.5">
            <AppTooltip
              v-if="task.wikiLink"
              :text="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
            >
              <a
                :href="task.wikiLink"
                target="_blank"
                rel="noopener noreferrer"
                class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 inline-flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                :aria-label="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
                @click.stop
              >
                <img src="/img/logos/wikilogo.webp" alt="Wiki" aria-hidden="true" class="h-5 w-5" />
              </a>
            </AppTooltip>
            <AppTooltip :text="t('page.tasks.questcard.viewOnTarkovDev', 'View on tarkov.dev')">
              <a
                :href="tarkovDevTaskUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 inline-flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
            </AppTooltip>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-1.5">
          <AppTooltip
            v-if="(task.minPlayerLevel ?? 0) > 0"
            :text="
              t(
                'page.tasks.questcard.levelBadgeTooltip',
                { level: task.minPlayerLevel },
                `Minimum player level ${task.minPlayerLevel} required to unlock this quest`
              )
            "
          >
            <UBadge size="xs" color="neutral" variant="soft" class="cursor-help text-[11px]">
              {{ t('page.tasks.questcard.levelBadge', { count: task.minPlayerLevel }) }}
            </UBadge>
          </AppTooltip>
          <AppTooltip :text="task?.map?.name || t('page.tasks.questcard.anyMap', 'Any')">
            <UBadge
              size="xs"
              color="neutral"
              variant="soft"
              class="inline-flex max-w-[10rem] items-center gap-1 text-[11px]"
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
          </AppTooltip>
          <UBadge
            v-if="objectiveProgress.total > 0"
            size="xs"
            color="neutral"
            variant="soft"
            class="inline-flex items-center gap-1 text-[11px]"
          >
            <UIcon name="i-mdi-progress-check" aria-hidden="true" class="h-3 w-3" />
            {{ t('page.tasks.questcard.progress', objectiveProgress) }}
          </UBadge>
          <UBadge v-if="isFailed" size="xs" color="error" variant="soft" class="text-[11px]">
            {{ t('page.dashboard.stats.failed.stat', 'Failed') }}
          </UBadge>
          <AppTooltip
            v-if="isInvalid && !isFailed"
            :text="
              t(
                'page.tasks.questcard.blockedTooltip',
                'This quest is permanently blocked and can never be completed due to choices made in other quests'
              )
            "
          >
            <UBadge size="xs" color="neutral" variant="soft" class="cursor-help text-[11px]">
              {{ t('page.tasks.questcard.blocked', 'Blocked') }}
            </UBadge>
          </AppTooltip>
          <AppTooltip
            v-if="preferencesStore.getShowRequiredLabels && task.kappaRequired"
            :text="
              t(
                'page.tasks.questcard.kappaTooltip',
                'This quest is required to obtain the Kappa Secure Container'
              )
            "
          >
            <UBadge size="xs" color="error" variant="soft" class="cursor-help text-[11px]">
              {{ t('page.tasks.questcard.kappa', 'Kappa') }}
            </UBadge>
          </AppTooltip>
          <AppTooltip
            v-if="preferencesStore.getShowRequiredLabels && task.lightkeeperRequired"
            :text="
              t(
                'page.tasks.questcard.lightkeeperTooltip',
                'This quest is required to unlock the Lightkeeper trader'
              )
            "
          >
            <UBadge size="xs" color="warning" variant="soft" class="cursor-help text-[11px]">
              {{ t('page.tasks.questcard.lightkeeper', 'Lightkeeper') }}
            </UBadge>
          </AppTooltip>
          <!-- XP display - shown for all task statuses when setting is enabled -->
          <div
            v-if="preferencesStore.getShowExperienceRewards && task.experience"
            class="flex items-center gap-1 text-xs text-gray-400"
          >
            <UIcon name="i-mdi-star" aria-hidden="true" class="h-4 w-4 shrink-0 text-yellow-500" />
            <span>{{ formatNumber(task.experience) }} XP</span>
          </div>
          <!-- Action buttons in header for consistent positioning -->
          <template v-if="isOurFaction">
            <UButton
              v-if="isLocked"
              :size="actionButtonSize"
              color="primary"
              variant="soft"
              class="shrink-0"
              @click.stop="markTaskAvailable()"
            >
              {{ t('page.tasks.questcard.availablebutton', 'Mark Available') }}
            </UButton>
            <UButton
              v-if="isComplete"
              :size="actionButtonSize"
              color="primary"
              variant="soft"
              class="shrink-0"
              @click.stop="markTaskUncomplete()"
            >
              {{
                isFailed
                  ? t('page.tasks.questcard.resetfailed', 'Reset Failed')
                  : t('page.tasks.questcard.uncompletebutton', 'Mark Uncompleted')
              }}
            </UButton>
            <UButton
              v-if="!isComplete && !isLocked"
              :size="actionButtonSize"
              color="success"
              :ui="completeButtonUi"
              class="shrink-0"
              @click.stop="markTaskComplete()"
            >
              {{ t('page.tasks.questcard.completebutton', 'Complete').toUpperCase() }}
            </UButton>
          </template>
          <!-- Menu button -->
          <AppTooltip v-if="isOurFaction" :text="t('page.tasks.questcard.more', 'More')">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              class="shrink-0"
              :aria-label="t('page.tasks.questcard.more', 'More')"
              @click="openOverflowMenu"
            >
              <UIcon name="i-mdi-dots-horizontal" aria-hidden="true" class="h-5 w-5" />
            </UButton>
          </AppTooltip>
        </div>
      </div>
      <!-- 2) Top strip: Before (only show when there are pending prerequisites) -->
      <div v-if="lockedBefore > 0" class="text-xs text-gray-400">
        <span class="text-gray-500">{{ t('page.tasks.questcard.requires', 'Requires') }}:</span>
        <template v-if="pendingParentTasks.length">
          <span class="ml-2 inline-flex flex-wrap items-center gap-1.5">
            <AppTooltip
              v-for="parent in displayedPendingParents"
              :key="parent.id"
              :text="parent.name"
            >
              <router-link
                :to="`/tasks?task=${parent.id}`"
                class="inline-flex max-w-[16rem] items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-200 hover:bg-white/10"
              >
                <span class="truncate">{{ parent.name }}</span>
              </router-link>
            </AppTooltip>
            <span v-if="extraPendingParentsCount > 0" class="text-gray-500">
              +{{ extraPendingParentsCount }}
            </span>
          </span>
        </template>
        <template v-else>
          <span class="ml-2 text-gray-300">{{ lockedBefore }}</span>
        </template>
      </div>
      <div v-if="isFailed" class="text-xs text-red-300">
        <span class="text-red-200/70">
          {{ t('page.tasks.questcard.failedbecause', 'Failed because') }}:
        </span>
        <template v-if="failureSources.length > 0">
          <span class="ml-2 inline-flex flex-wrap items-center gap-1.5">
            <router-link
              v-for="source in failureSources"
              :key="source.id"
              :to="`/tasks?task=${source.id}`"
              class="inline-flex max-w-[16rem] items-center rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-200 hover:bg-red-500/20"
            >
              {{ source.name }}
            </router-link>
          </span>
        </template>
        <span v-else class="ml-2 text-red-200/80">
          {{ t('page.tasks.questcard.failedbecauseunknown', 'Failed manually or data missing') }}
        </span>
      </div>
      <!-- 3) Body: objectives -->
      <div class="space-y-3">
        <QuestKeys v-if="task?.neededKeys?.length" :needed-keys="task.neededKeys" />
        <QuestObjectives
          :objectives="relevantViewObjectives"
          :irrelevant-count="irrelevantObjectives.length"
          :uncompleted-irrelevant="uncompletedIrrelevantObjectives.length"
        />
      </div>
      <!-- 4) Chain info -->
      <div v-if="afterHasContent" class="text-xs text-gray-400">
        <AppTooltip
          v-if="unlocksNextCount > 0"
          :text="
            t(
              'page.tasks.questcard.unlocksNextTooltip',
              'Number of quests that become available after completing this task'
            )
          "
        >
          <span class="cursor-help border-b border-dotted border-gray-500">
            {{ t('page.tasks.questcard.unlocksNext', 'Unlocks next') }}: {{ unlocksNextCount }}
          </span>
        </AppTooltip>
        <span v-if="unlocksNextCount > 0 && impactCount > 0" class="mx-2 text-gray-600">•</span>
        <AppTooltip
          v-if="impactCount > 0"
          :text="
            t(
              'page.tasks.questcard.impactTooltip',
              'Number of incomplete quests that depend on this task being completed'
            )
          "
        >
          <span class="cursor-help border-b border-dotted border-gray-500">
            {{ t('page.tasks.questcard.impact', 'Impact') }}: {{ impactCount }}
          </span>
        </AppTooltip>
      </div>
      <!--5) Rewards Summary Section -->
      <TaskCardRewards
        :task-id="task.id"
        :trader-standing-rewards="traderStandingRewards"
        :skill-rewards="skillRewards"
        :trader-unlock-reward="traderUnlockReward"
        :item-rewards="itemRewards"
        :offer-unlock-rewards="offerUnlockRewards"
        :parent-tasks="parentTasks"
        :child-tasks="childTasks"
        @item-context-menu="openItemContextMenu"
      />
    </div>
    <!-- Overflow / Context Menu -->
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
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  type ContextMenuRef = { open: (event: MouseEvent) => void };
  const QuestKeys = defineAsyncComponent(() => import('@/features/tasks/QuestKeys.vue'));
  const QuestObjectives = defineAsyncComponent(
    () => import('@/features/tasks/QuestObjectives.vue')
  );
  const TaskCardRewards = defineAsyncComponent(
    () => import('@/features/tasks/TaskCardRewards.vue')
  );
  const props = defineProps<{
    task: Task;
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
  const taskClasses = computed(() => {
    if (isComplete.value && !isFailed.value) return 'border-success-500/25 bg-success-500/10';
    if (isFailed.value) return 'border-error-500/25 bg-error-500/10'; // Red for failed
    if (isInvalid.value) return 'border-neutral-500/25 bg-neutral-500/10 opacity-60'; // Gray for blocked
    if (isLocked.value) return 'border-amber-500/25 bg-amber-500/10'; // Amber/orange for locked
    return 'border-white/10';
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
    if (isLocked.value) return 'text-amber-400';
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
    return (props.task.failConditions ?? [])
      .filter(
        (objective) => objective?.task?.id && hasStatus(objective.status, ['complete', 'completed'])
      )
      .filter((objective) => isTaskSuccessful(objective.task!.id))
      .map((objective) => ({
        id: objective.task!.id,
        name: objective.task!.name ?? objective.task!.id,
      }));
  });
  const pendingParentTasks = computed(() => {
    return parentTasks.value.filter((parent) => !isTaskSuccessful(parent.id));
  });
  const displayedPendingParents = computed(() => pendingParentTasks.value.slice(0, 2));
  const extraPendingParentsCount = computed(() => {
    return Math.max(0, pendingParentTasks.value.length - displayedPendingParents.value.length);
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
    taskContextMenu.value?.open(event);
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
</script>
