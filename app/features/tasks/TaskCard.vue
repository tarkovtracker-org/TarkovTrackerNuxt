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
      class="text-brand-200 pointer-events-none absolute inset-0 z-0 flex rotate-12 transform items-center justify-center p-8 opacity-15"
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
          <router-link
            :to="`/tasks?task=${task.id}`"
            class="text-primary-400 hover:text-primary-300 flex min-w-0 items-center gap-2 no-underline"
            :title="task?.name"
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
          <!-- External link icons -->
          <div class="ml-2 flex shrink-0 items-center gap-1.5">
            <a
              v-if="task.wikiLink"
              :href="task.wikiLink"
              target="_blank"
              rel="noopener noreferrer"
              class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 inline-flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              :title="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
              :aria-label="t('page.tasks.questcard.viewOnWiki', 'View on Wiki')"
              @click.stop
            >
              <img src="/img/logos/wikilogo.webp" alt="Wiki" aria-hidden="true" class="h-5 w-5" />
            </a>
            <a
              :href="tarkovDevTaskUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 inline-flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              :title="t('page.tasks.questcard.viewOnTarkovDev', 'View on tarkov.dev')"
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
        <div class="flex flex-wrap items-center justify-end gap-1.5">
          <UTooltip
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
          </UTooltip>
          <UBadge
            size="xs"
            color="neutral"
            variant="soft"
            class="inline-flex max-w-[10rem] items-center gap-1 text-[11px]"
            :title="task?.map?.name || t('page.tasks.questcard.anyMap', 'Any')"
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
            color="neutral"
            variant="soft"
            class="inline-flex items-center gap-1 text-[11px]"
          >
            <UIcon name="i-mdi-progress-check" aria-hidden="true" class="h-3 w-3" />
            {{ t('page.tasks.questcard.progress', objectiveProgress) }}
          </UBadge>
          <UTooltip
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
          </UTooltip>
          <UTooltip
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
          </UTooltip>
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
              {{ t('page.tasks.questcard.uncompletebutton', 'Mark Uncompleted') }}
            </UButton>
            <template v-if="!isComplete && !isLocked">
              <!-- XP display left of Complete button -->
              <div
                v-if="preferencesStore.getShowExperienceRewards && task.experience"
                class="flex items-center gap-1 text-xs text-gray-400"
              >
                <UIcon
                  name="i-mdi-star"
                  aria-hidden="true"
                  class="h-4 w-4 shrink-0 text-yellow-500"
                />
                <span>{{ task.experience.toLocaleString() }} XP</span>
              </div>
              <UButton
                :size="actionButtonSize"
                color="success"
                :ui="completeButtonUi"
                class="shrink-0"
                @click.stop="markTaskComplete()"
              >
                {{ t('page.tasks.questcard.completebutton', 'Complete').toUpperCase() }}
              </UButton>
            </template>
          </template>
          <!-- Menu button -->
          <UButton
            v-if="isOurFaction"
            size="xs"
            color="neutral"
            variant="ghost"
            class="shrink-0"
            :title="t('page.tasks.questcard.more', 'More')"
            :aria-label="t('page.tasks.questcard.more', 'More')"
            @click="openOverflowMenu"
          >
            <UIcon name="i-mdi-dots-horizontal" aria-hidden="true" class="h-5 w-5" />
          </UButton>
        </div>
      </div>
      <!-- 2) Top strip: Before (only show when there are pending prerequisites) -->
      <div v-if="lockedBefore > 0" class="text-xs text-gray-400">
        <span class="text-gray-500">{{ t('page.tasks.questcard.requires', 'Requires') }}:</span>
        <template v-if="pendingParentTasks.length">
          <span class="ml-2 inline-flex flex-wrap items-center gap-1.5">
            <router-link
              v-for="parent in displayedPendingParents"
              :key="parent.id"
              :to="`/tasks?task=${parent.id}`"
              class="inline-flex max-w-[16rem] items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-200 hover:bg-white/10"
              :title="parent.name"
            >
              <span class="truncate">{{ parent.name }}</span>
            </router-link>
            <span v-if="extraPendingParentsCount > 0" class="text-gray-500">
              +{{ extraPendingParentsCount }}
            </span>
          </span>
        </template>
        <template v-else>
          <span class="ml-2 text-gray-300">{{ lockedBefore }}</span>
        </template>
      </div>
      <!-- 3) Body: objectives -->
      <div class="space-y-3">
        <QuestKeys v-if="task?.neededKeys?.length" :needed-keys="task.neededKeys" />
        <QuestObjectives
          :objectives="relevantViewObjectives"
          :irrelevant-count="irrelevantObjectives.length"
          :uncompleted-irrelevant="uncompletedIrrelevantObjectives.length"
          @center-map="emit('objective-clicked', $event)"
        />
      </div>
      <!-- 4) Chain info -->
      <div v-if="afterHasContent" class="text-xs text-gray-400">
        <UTooltip
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
        </UTooltip>
        <span v-if="unlocksNextCount > 0 && impactCount > 0" class="mx-2 text-gray-600">•</span>
        <UTooltip
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
        </UTooltip>
      </div>
      <!--5) Rewards Summary Section -->
      <div
        v-if="hasRewardsSummary || hasExpandableDetails"
        class="rounded-md border-t border-white/5 pt-2 transition-colors"
        :class="{
          'cursor-pointer hover:bg-white/5': hasExpandableDetails,
        }"
        @click="onRewardsAreaClick"
      >
        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <!-- Rewards title -->
          <span class="font-medium text-gray-500">
            <UIcon name="i-mdi-gift" aria-hidden="true" class="mr-1 inline h-3.5 w-3.5" />
            {{ t('page.tasks.questcard.rewards', 'Rewards') }}:
          </span>
          <!-- Trader Standing Rewards -->
          <template
            v-for="standing in traderStandingRewards"
            :key="`standing-${standing.trader.id}`"
          >
            <span class="inline-flex items-center gap-1.5 rounded bg-blue-500/10 px-2 py-0.5">
              <UIcon name="i-mdi-handshake" aria-hidden="true" class="h-4 w-4 text-blue-300" />
              <span :class="standing.standing >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ standing.standing >= 0 ? '+' : '' }}{{ standing.standing.toFixed(2) }}
              </span>
              <span class="text-gray-300">{{ standing.trader.name }}</span>
            </span>
          </template>
          <!-- Skill Rewards -->
          <template v-for="skill in skillRewards" :key="`skill-${skill.name}`">
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-mdi-arm-flex" aria-hidden="true" class="h-3.5 w-3.5 text-purple-400" />
              <span class="text-purple-300">+{{ skill.level }}</span>
              <span>{{ skill.name }}</span>
            </span>
          </template>
          <!-- Trader Unlock -->
          <span
            v-if="traderUnlockReward"
            class="inline-flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-0.5"
          >
            <UIcon
              name="i-mdi-lock-open-variant"
              aria-hidden="true"
              class="h-4 w-4 text-amber-400"
            />
            <span class="text-amber-300">{{ traderUnlockReward.name }}</span>
          </span>
          <!-- Item Rewards Summary -->
          <UTooltip v-if="itemRewards.length > 0" :text="itemRewardsSummaryTooltip">
            <span
              class="inline-flex cursor-help items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-0.5"
            >
              <UIcon
                name="i-mdi-package-variant"
                aria-hidden="true"
                class="h-4 w-4 text-emerald-400"
              />
              <span class="text-emerald-300">
                {{
                  t(
                    'page.tasks.questcard.itemsCount',
                    { count: itemRewards.length },
                    `${itemRewards.length} item(s)`
                  )
                }}
              </span>
            </span>
          </UTooltip>
          <!-- Offer Unlock Summary -->
          <UTooltip v-if="offerUnlockRewards.length > 0" :text="offerUnlockSummaryTooltip">
            <span
              class="inline-flex cursor-help items-center gap-1.5 rounded bg-cyan-500/10 px-2 py-0.5"
            >
              <UIcon name="i-mdi-cart-check" aria-hidden="true" class="h-4 w-4 text-cyan-400" />
              <span class="text-cyan-300">
                {{
                  t(
                    'page.tasks.questcard.unlocksCount',
                    { count: offerUnlockRewards.length },
                    `${offerUnlockRewards.length} unlock(s)`
                  )
                }}
              </span>
            </span>
          </UTooltip>
          <!-- Dropdown toggle -->
          <UButton
            v-if="hasExpandableDetails"
            size="xs"
            color="neutral"
            variant="ghost"
            class="shrink-0"
            :title="toggleDetailsLabel"
            :aria-label="toggleDetailsLabel"
            :aria-expanded="showDetailedRewards"
            :aria-controls="detailsId"
            @click.stop="toggleDetailedRewards"
          >
            <UIcon
              :name="showDetailedRewards ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
              aria-hidden="true"
              class="h-5 w-5 text-gray-500"
            />
          </UButton>
        </div>
        <!-- Detailed Rewards and Next Quests (Collapsible) -->
        <div
          v-if="showDetailedRewards && hasExpandableDetails"
          :id="detailsId"
          role="region"
          :aria-label="t('page.tasks.questcard.details', 'Task details')"
          class="mt-2 rounded-md bg-white/5 p-2"
        >
          <div class="flex flex-col gap-4 lg:flex-row">
            <!-- Left: Previous Quests -->
            <div v-if="parentTasks.length > 0" class="space-y-2 lg:w-64">
              <div class="text-xs font-medium text-gray-400">
                {{ t('page.tasks.questcard.previousQuests', 'Previous Quests') }}:
              </div>
              <div class="flex flex-col gap-1">
                <router-link
                  v-for="parent in parentTasks"
                  :key="parent.id"
                  :to="`/tasks?task=${parent.id}`"
                  class="text-primary-400 hover:text-primary-300 inline-flex items-center gap-1.5 text-xs"
                >
                  <UIcon name="i-mdi-arrow-left" aria-hidden="true" class="h-3 w-3 shrink-0" />
                  <span>{{ parent.name }}</span>
                </router-link>
              </div>
            </div>
            <!-- Middle: Item Rewards and Offer Unlocks -->
            <div
              v-if="itemRewards.length > 0 || offerUnlockRewards.length > 0"
              class="flex flex-1 flex-col gap-4 sm:flex-row"
            >
              <!-- Item Rewards -->
              <div v-if="itemRewards.length > 0" class="min-w-0 flex-1 space-y-2">
                <div class="text-xs font-medium text-gray-400">
                  {{ t('page.tasks.questcard.rewardItems', 'Items') }}:
                </div>
                <div class="flex flex-wrap gap-2">
                  <a
                    v-for="(reward, index) in itemRewards"
                    :key="`item-${reward.item?.id || index}`"
                    :href="`https://tarkov.dev/item/${reward.item?.id || ''}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 relative flex flex-col items-center gap-1 rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    :title="
                      t(
                        'page.tasks.questcard.openItemOnTarkovDev',
                        {
                          name:
                            reward.item?.shortName ||
                            reward.item?.name ||
                            t('page.tasks.questcard.item', 'Item'),
                        },
                        `Open ${
                          reward.item?.shortName ||
                          reward.item?.name ||
                          t('page.tasks.questcard.item', 'Item')
                        } on tarkov.dev`
                      )
                    "
                    @contextmenu.prevent.stop="openItemContextMenu($event, reward.item)"
                    @click.stop
                  >
                    <img
                      v-if="reward.item?.iconLink"
                      :src="reward.item?.iconLink"
                      :alt="
                        reward.item?.name ||
                        reward.item?.shortName ||
                        t('page.tasks.questcard.item', 'Item')
                      "
                      class="h-16 w-16 object-contain"
                    />
                    <div class="flex flex-col items-center gap-0.5">
                      <span
                        class="max-w-[72px] truncate text-center text-xs text-gray-300"
                        :title="reward.item?.shortName || reward.item?.name || ''"
                      >
                        {{ reward.item?.shortName || reward.item?.name || '' }}
                      </span>
                      <span v-if="reward.count > 1" class="text-xs font-medium text-gray-400">
                        x{{ formatNumber(reward.count) }}
                      </span>
                    </div>
                  </a>
                </div>
              </div>
              <!-- Offer Unlocks -->
              <div v-if="offerUnlockRewards.length > 0" class="min-w-0 flex-1 space-y-2">
                <div class="text-xs font-medium text-gray-400">
                  {{ t('page.tasks.questcard.unlocksPurchase', 'Unlocks purchase') }}:
                </div>
                <div class="flex flex-wrap gap-2">
                  <a
                    v-for="offer in offerUnlockRewards"
                    :key="`offer-${offer.id}`"
                    :href="`https://tarkov.dev/item/${offer.item?.id || ''}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 relative flex flex-col items-center gap-1 rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    :title="
                      t(
                        'page.tasks.questcard.openItemOnTarkovDev',
                        {
                          name:
                            offer.item?.shortName ||
                            offer.item?.name ||
                            t('page.tasks.questcard.item', 'Item'),
                        },
                        `Open ${
                          offer.item?.shortName ||
                          offer.item?.name ||
                          t('page.tasks.questcard.item', 'Item')
                        } on tarkov.dev`
                      )
                    "
                    @contextmenu.prevent.stop="openItemContextMenu($event, offer.item)"
                    @click.stop
                  >
                    <img
                      v-if="offer.item?.iconLink"
                      :src="offer.item?.iconLink"
                      :alt="
                        offer.item?.name ||
                        offer.item?.shortName ||
                        t('page.tasks.questcard.item', 'Item')
                      "
                      class="h-16 w-16 object-contain"
                    />
                    <div class="flex flex-col items-center gap-0.5">
                      <span
                        class="max-w-[72px] truncate text-center text-xs text-gray-300"
                        :title="offer.item?.shortName || offer.item?.name || ''"
                      >
                        {{ offer.item?.shortName || offer.item?.name || '' }}
                      </span>
                      <span class="text-xs text-gray-500">
                        {{ offer.trader.name }} LL{{ offer.level }}
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
            <!-- Right: Next Quests -->
            <div v-if="childTasks.length > 0" class="space-y-2 lg:w-64">
              <div class="text-xs font-medium text-gray-400">
                {{ t('page.tasks.questcard.nextQuests', 'Next Quests') }}:
              </div>
              <div class="flex flex-col gap-1">
                <router-link
                  v-for="child in childTasks"
                  :key="child.id"
                  :to="`/tasks?task=${child.id}`"
                  class="text-primary-400 hover:text-primary-300 inline-flex items-center gap-1.5 text-xs"
                >
                  <UIcon name="i-mdi-arrow-right" aria-hidden="true" class="h-3 w-3 shrink-0" />
                  <span>{{ child.name }}</span>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import { useTarkovStore } from '@/stores/useTarkov';
  import type { Task, TaskObjective } from '@/types/tarkov';
  type ContextMenuRef = { open: (event: MouseEvent) => void };
  type TaskActionPayload = {
    taskId: string;
    taskName: string;
    action: 'available' | 'complete' | 'uncomplete';
    undoKey?: string;
    statusKey?: string;
  };
  const QuestKeys = defineAsyncComponent(() => import('@/features/tasks/QuestKeys.vue'));
  const QuestObjectives = defineAsyncComponent(
    () => import('@/features/tasks/QuestObjectives.vue')
  );
  const props = defineProps<{
    task: Task;
  }>();
  const emit = defineEmits<{
    'on-task-action': [payload: TaskActionPayload];
    'objective-clicked': [payload: TaskObjective];
  }>();
  const { t } = useI18n({ useScope: 'global' });
  const router = useRouter();
  const { xs } = useSharedBreakpoints();
  const tarkovStore = useTarkovStore();
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const tasks = computed(() => metadataStore.tasks);
  const taskContextMenu = ref<ContextMenuRef | null>(null);
  const itemContextMenu = ref<ContextMenuRef | null>(null);
  const selectedItem = ref<{ id: string; wikiLink?: string } | null>(null);
  const showDetailedRewards = ref(false);
  const isComplete = computed(() => tarkovStore.isTaskComplete(props.task.id));
  const isFailed = computed(() => tarkovStore.isTaskFailed(props.task.id));
  const isLocked = computed(() => {
    return progressStore.unlockedTasks[props.task.id]?.self !== true && !isComplete.value;
  });
  const isOurFaction = computed(() => {
    const taskFaction = props.task.factionName;
    return taskFaction === 'Any' || taskFaction === tarkovStore.getPMCFaction();
  });
  const taskClasses = computed(() => {
    if (isComplete.value && !isFailed.value) return 'border-success-500/25 bg-success-500/10';
    if (isLocked.value || isFailed.value) return 'border-error-500/25 bg-error-500/10';
    return 'border-white/10';
  });
  const isCompact = computed(() => preferencesStore.getTaskCardDensity === 'compact');
  const cardBodyClass = computed(() => {
    return isCompact.value ? 'p-3 flex flex-col' : 'p-4 flex flex-col';
  });
  const showBackgroundIcon = computed(() => isLocked.value || isFailed.value || isComplete.value);
  const backgroundIcon = computed(() => {
    if (isComplete.value) return 'mdi-check';
    if (isLocked.value || isFailed.value) return 'mdi-lock';
    return '';
  });
  const lockedBehind = computed(() => {
    return props.task.successors?.filter((s) => !tarkovStore.isTaskComplete(s)).length || 0;
  });
  const lockedBefore = computed(() => {
    return props.task.predecessors?.filter((s) => !tarkovStore.isTaskComplete(s)).length || 0;
  });
  const isFactionTask = computed(() => props.task.factionName !== 'Any');
  const factionImage = computed(() => `/img/factions/${props.task.factionName}.webp`);
  const parentTasks = computed(() => {
    if (!props.task.parents?.length) return [];
    return props.task.parents
      .map((id) => tasks.value.find((task) => task.id === id))
      .filter((task): task is Task => task !== undefined);
  });
  const pendingParentTasks = computed(() => {
    return parentTasks.value.filter((parent) => !tarkovStore.isTaskComplete(parent.id));
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
  const hasRewardsSummary = computed(() => {
    return (
      traderStandingRewards.value.length > 0 ||
      skillRewards.value.length > 0 ||
      traderUnlockReward.value != null
    );
  });
  const hasDetailedRewards = computed(() => {
    return itemRewards.value.length > 0 || offerUnlockRewards.value.length > 0;
  });
  const hasExpandableDetails = computed(() => {
    return hasDetailedRewards.value || childTasks.value.length > 0 || parentTasks.value.length > 0;
  });
  const detailsId = computed(() => `task-${props.task.id}-details`);
  const toggleDetailsLabel = computed(() => {
    return showDetailedRewards.value
      ? t('page.tasks.questcard.hideDetails', 'Hide details')
      : t('page.tasks.questcard.showDetails', 'Show details');
  });
  const itemRewardsSummaryTooltip = computed(() => {
    const items = itemRewards.value;
    if (items.length === 0) return '';
    const names = items
      .slice(0, 5)
      .map((r) => {
        const name = r.item?.shortName || r.item?.name || '';
        return r.count > 1 ? `${name} x${r.count}` : name;
      })
      .join(', ');
    if (items.length > 5) {
      return `${names}, +${items.length - 5} more`;
    }
    return names;
  });
  const offerUnlockSummaryTooltip = computed(() => {
    const offers = offerUnlockRewards.value;
    if (offers.length === 0) return '';
    const names = offers
      .slice(0, 5)
      .map((o) => {
        const name = o.item?.shortName || o.item?.name || '';
        return `${name} (${o.trader.name} LL${o.level})`;
      })
      .join(', ');
    if (offers.length > 5) {
      return `${names}, +${offers.length - 5} more`;
    }
    return names;
  });
  const toggleDetailedRewards = () => {
    if (!hasExpandableDetails.value) return;
    showDetailedRewards.value = !showDetailedRewards.value;
  };
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
  const formatNumber = (num: number): string => num.toLocaleString();
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
  const handleTaskObjectives = (
    objectives: TaskObjective[],
    action: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    objectives.forEach((objective) => {
      if (action === 'setTaskObjectiveComplete') {
        tarkovStore.setTaskObjectiveComplete(objective.id);
        if (objective.count !== undefined && objective.count > 0) {
          tarkovStore.setObjectiveCount(objective.id, objective.count);
        }
        return;
      }
      const currentCount = tarkovStore.getObjectiveCount(objective.id);
      const requiredCount = objective.count ?? 1;
      if (currentCount < requiredCount) {
        tarkovStore.setTaskObjectiveUncomplete(objective.id);
      }
    });
  };
  const handleAlternatives = (
    alternatives: string[] | undefined,
    taskAction: 'setTaskFailed' | 'setTaskUncompleted',
    objectiveAction: 'setTaskObjectiveComplete' | 'setTaskObjectiveUncomplete'
  ) => {
    if (!Array.isArray(alternatives)) return;
    alternatives.forEach((alternativeTaskId) => {
      tarkovStore[taskAction](alternativeTaskId);
      const alternativeTask = tasks.value.find((task) => task.id === alternativeTaskId);
      if (alternativeTask?.objectives) {
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
      }
    });
  };
  const ensureMinLevel = () => {
    const minLevel = props.task.minPlayerLevel ?? 0;
    if (tarkovStore.playerLevel() < minLevel) {
      tarkovStore.setLevel(minLevel);
    }
  };
  const emitTaskAction = (payload: TaskActionPayload) => {
    emit('on-task-action', payload);
  };
  const markTaskComplete = (isUndo = false) => {
    const taskName = props.task.name ?? t('page.tasks.questcard.task', 'Task');
    if (!isUndo) {
      emitTaskAction({
        taskId: props.task.id,
        taskName: taskName,
        action: 'complete',
        statusKey: 'page.tasks.questcard.statuscomplete',
      });
    }
    tarkovStore.setTaskComplete(props.task.id);
    if (props.task.objectives) {
      handleTaskObjectives(props.task.objectives, 'setTaskObjectiveComplete');
    }
    handleAlternatives(props.task.alternatives, 'setTaskFailed', 'setTaskObjectiveComplete');
    ensureMinLevel();
    if (isUndo) {
      emitTaskAction({
        taskId: props.task.id,
        taskName: taskName,
        action: 'complete',
        undoKey: 'page.tasks.questcard.undocomplete',
      });
    }
  };
  const markTaskUncomplete = (isUndo = false) => {
    const taskName = props.task.name ?? t('page.tasks.questcard.task', 'Task');
    if (!isUndo) {
      emitTaskAction({
        taskId: props.task.id,
        taskName: taskName,
        action: 'uncomplete',
        statusKey: 'page.tasks.questcard.statusuncomplete',
      });
    }
    tarkovStore.setTaskUncompleted(props.task.id);
    if (props.task.objectives) {
      handleTaskObjectives(props.task.objectives, 'setTaskObjectiveUncomplete');
    }
    handleAlternatives(props.task.alternatives, 'setTaskUncompleted', 'setTaskObjectiveUncomplete');
    if (isUndo) {
      emitTaskAction({
        taskId: props.task.id,
        taskName: taskName,
        action: 'uncomplete',
        undoKey: 'page.tasks.questcard.undouncomplete',
      });
    }
  };
  const markTaskAvailable = () => {
    const taskName = props.task.name ?? t('page.tasks.questcard.task', 'Task');
    // Mark tasks from taskRequirements as complete (this is what unlockedTasks checks)
    // This handles cases where taskRequirements have status: ['active'] which causes
    // the graph to link to parents instead of the actual required task
    props.task.taskRequirements?.forEach((req) => {
      if (req.task?.id) {
        tarkovStore.setTaskComplete(req.task.id);
        const reqTask = tasks.value.find((task) => task.id === req.task.id);
        if (reqTask?.objectives) {
          handleTaskObjectives(reqTask.objectives, 'setTaskObjectiveComplete');
        }
      }
    });
    // Also mark predecessors for the full dependency chain
    props.task.predecessors?.forEach((predecessorId) => {
      tarkovStore.setTaskComplete(predecessorId);
      const predecessorTask = tasks.value.find((task) => task.id === predecessorId);
      if (predecessorTask?.objectives) {
        handleTaskObjectives(predecessorTask.objectives, 'setTaskObjectiveComplete');
      }
    });
    ensureMinLevel();
    emitTaskAction({
      taskId: props.task.id,
      taskName: taskName,
      action: 'available',
      undoKey: 'page.tasks.questcard.statusavailable',
    });
  };
  const openTaskWiki = () => {
    if (props.task.wikiLink) {
      window.open(props.task.wikiLink, '_blank');
    }
  };
  const onRewardsAreaClick = (event: MouseEvent) => {
    if (!hasExpandableDetails.value) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) return;
    toggleDetailedRewards();
  };
</script>
