<template>
  <div
    v-if="hasRewardsSummary || hasExpandableDetails"
    class="rounded-md border border-gray-200 p-2 transition-colors dark:border-white/5"
    :class="{ 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5': hasExpandableDetails }"
    @click="onAreaClick"
  >
    <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
      <!-- Rewards title -->
      <span class="font-medium text-gray-700 dark:text-gray-300">
        <UIcon name="i-mdi-gift" aria-hidden="true" class="mr-1 inline h-3.5 w-3.5" />
        {{ t('page.tasks.questcard.rewards', 'Rewards') }}:
      </span>
      <!-- XP Badge -->
      <span
        v-if="preferencesStore.getShowExperienceRewards && experience > 0"
        class="inline-flex items-center gap-1 rounded !bg-primary-600 px-2 py-0.5 !text-white"
      >
        <UIcon name="i-mdi-star" aria-hidden="true" class="h-3.5 w-3.5" />
        <span>{{ formatNumber(experience) }} XP</span>
      </span>
      <!-- Trader Unlock -->
      <span
        v-if="displayedTraderUnlock?.name"
        class="inline-flex items-center gap-1.5 rounded !bg-amber-300 px-2 py-0.5 !text-amber-950"
      >
        <UIcon name="i-mdi-lock-open-variant" aria-hidden="true" class="h-4 w-4 !text-amber-950" />
        <span>{{ displayedTraderUnlock.name }}</span>
      </span>
      <!-- Trader Standing Rewards -->
      <template v-for="standing in traderStandingRewards" :key="`standing-${standing.trader.id}`">
        <span class="inline-flex items-center gap-1.5 rounded !bg-gray-500 px-2 py-0.5 !text-white">
          <UIcon
            name="i-mdi-handshake"
            aria-hidden="true"
            class="h-4 w-4 !text-white"
          />
          <span
            :class="standing.standing >= 0 ? '!text-green-400 font-bold' : '!text-red-400 font-bold'"
          >
            {{ standing.standing >= 0 ? '+' : '' }}{{ standing.standing.toFixed(2) }}
          </span>
          <span>{{ standing.trader.name }}</span>
        </span>
      </template>
      <!-- Skill Rewards -->
      <template v-for="skill in skillRewards" :key="`skill-${skill.name}`">
        <span class="inline-flex items-center gap-1.5 rounded !bg-green-500 px-2 py-0.5 !text-green-50">
          <UIcon name="i-mdi-arm-flex" aria-hidden="true" class="h-3.5 w-3.5 !text-green-50" />
          <span>+{{ skill.level }}</span>
          <span>{{ skill.name }}</span>
        </span>
      </template>
      <!-- Item Rewards Summary -->
      <AppTooltip v-if="itemRewards.length > 0" :text="itemRewardsSummaryTooltip">
        <span
          class="inline-flex cursor-help items-center gap-1.5 rounded !bg-blue-400 px-2 py-0.5 !text-blue-50"
        >
          <UIcon name="i-mdi-package-variant" aria-hidden="true" class="h-4 w-4 !text-blue-50" />
          <span>
            {{
              t(
                'page.tasks.questcard.itemsCount',
                { count: itemRewards.length },
                `${itemRewards.length} item${itemRewards.length === 1 ? '' : 's'}`
              )
            }}
          </span>
        </span>
      </AppTooltip>
      <!-- Offer Unlock Summary -->
      <AppTooltip v-if="offerUnlockRewards.length > 0" :text="offerUnlockSummaryTooltip">
        <span
          class="inline-flex cursor-help items-center gap-1.5 rounded !bg-indigo-400 px-2 py-0.5 !text-indigo-50"
        >
          <UIcon name="i-mdi-cart-check" aria-hidden="true" class="h-4 w-4 !text-indigo-50" />
          <span>
            {{
              t(
                'page.tasks.questcard.unlocksCount',
                { count: offerUnlockRewards.length },
                `${offerUnlockRewards.length} unlock${offerUnlockRewards.length === 1 ? '' : 's'}`
              )
            }}
          </span>
        </span>
      </AppTooltip>
      <!-- Chain info & Dropdown toggle -->
      <div class="ml-auto flex items-center gap-4">
        <div v-if="unlocksNextCount > 0 || impactCount > 0" class="flex shrink-0 items-center">
          <AppTooltip
            v-if="unlocksNextCount > 0"
            :text="
              t(
                'page.tasks.questcard.unlocksNextTooltip',
                'Number of quests that become available after completing this task'
              )
            "
          >
            <span
              class="cursor-help border-b border-dotted border-gray-400 text-gray-600 dark:border-gray-500 dark:text-gray-200"
            >
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
            <span
              class="cursor-help border-b border-dotted border-gray-400 text-gray-600 dark:border-gray-500 dark:text-gray-200"
            >
              {{ t('page.tasks.questcard.impact', 'Impact') }}: {{ impactCount }}
            </span>
          </AppTooltip>
        </div>

        <AppTooltip v-if="hasExpandableDetails" :text="toggleDetailsLabel">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            class="shrink-0 cursor-pointer"
            :aria-label="toggleDetailsLabel"
            :aria-expanded="showDetails"
            :aria-controls="detailsId"
            @click.stop="toggleDetails"
          >
            <UIcon
              :name="showDetails ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
              aria-hidden="true"
              class="h-5 w-5 text-gray-500"
            />
          </UButton>
        </AppTooltip>
      </div>
    </div>
    <div
      v-if="showDetails && hasExpandableDetails"
      :id="detailsId"
      role="region"
      :aria-label="t('page.tasks.questcard.details', 'Task details')"
      class="mt-2 rounded-md bg-white p-2 dark:bg-white/5"
    >
      <div class="flex flex-col gap-4">
        <!-- Rewards Row (Items Left, Unlocks Right) -->
        <div
          v-if="itemRewards.length > 0 || offerUnlockRewards.length > 0"
          class="flex flex-wrap items-start justify-between gap-4"
        >
          <!-- Item Rewards (Left) -->
          <div v-if="itemRewards.length > 0" class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="text-xs font-medium text-gray-500 dark:text-gray-300">
              {{ t('page.tasks.questcard.rewardItems', 'Items') }}:
            </div>
            <div class="flex flex-wrap gap-2">
              <AppTooltip
                v-for="(reward, index) in itemRewards"
                :key="`item-${reward.item?.id || index}`"
                :text="getItemTooltip(reward.item)"
              >
                <component
                  :is="reward.item?.id ? 'a' : 'span'"
                  :href="reward.item?.id ? `https://tarkov.dev/item/${reward.item?.id}` : undefined"
                  :target="reward.item?.id ? '_blank' : undefined"
                  :rel="reward.item?.id ? 'noopener noreferrer' : undefined"
                  :class="rewardItemCardClass"
                  @contextmenu.prevent.stop="$emit('item-context-menu', $event, reward.item)"
                  @click.stop
                >
                  <img
                    v-if="reward.item?.iconLink"
                    :src="reward.item?.iconLink"
                    :alt="reward.item?.name || reward.item?.shortName || 'Item'"
                    class="h-16 w-16 object-contain"
                  />
                  <div class="flex flex-col items-center gap-0.5">
                    <span
                      class="max-w-[72px] truncate text-center text-xs text-gray-700 dark:text-gray-300"
                    >
                      {{ reward.item?.shortName || reward.item?.name || '' }}
                    </span>
                    <span
                      v-if="reward.count > 1"
                      class="text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      x{{ formatNumber(reward.count) }}
                    </span>
                  </div>
                </component>
              </AppTooltip>
            </div>
          </div>

          <!-- Offer Unlocks (Right) -->
          <div
            v-if="offerUnlockRewards.length > 0"
            class="flex min-w-0 flex-1 flex-col items-end gap-2 text-right"
          >
            <div class="text-xs font-medium text-gray-500 dark:text-gray-300">
              {{ t('page.tasks.questcard.unlocksPurchase', 'Unlocks purchase') }}:
            </div>
            <div class="flex flex-wrap justify-end gap-2 text-left">
              <AppTooltip
                v-for="offer in offerUnlockRewards"
                :key="`offer-${offer.id}`"
                :text="getItemTooltip(offer.item)"
              >
                <component
                  :is="offer.item?.id ? 'a' : 'span'"
                  :href="offer.item?.id ? `https://tarkov.dev/item/${offer.item?.id}` : undefined"
                  :target="offer.item?.id ? '_blank' : undefined"
                  :rel="offer.item?.id ? 'noopener noreferrer' : undefined"
                  :class="rewardItemCardClass"
                  @contextmenu.prevent.stop="$emit('item-context-menu', $event, offer.item)"
                  @click.stop
                >
                  <img
                    v-if="offer.item?.iconLink"
                    :src="offer.item?.iconLink"
                    :alt="offer.item?.name || offer.item?.shortName || 'Item'"
                    class="h-16 w-16 object-contain"
                  />
                  <div class="flex flex-col items-center gap-0.5">
                    <span
                      class="max-w-[72px] truncate text-center text-xs text-gray-700 dark:text-gray-300"
                    >
                      {{ offer.item?.shortName || offer.item?.name || '' }}
                    </span>
                    <span class="text-xs text-gray-500">
                      {{ offer.trader.name }} LL{{ offer.level }}
                    </span>
                  </div>
                </component>
              </AppTooltip>
            </div>
          </div>
        </div>

        <!-- Task Chain (Previous/Next) -->
        <div
          v-if="parentTasks.length > 0 || childTasks.length > 0"
          class="flex flex-col gap-3"
        >
          <UDivider v-if="itemRewards.length > 0 || offerUnlockRewards.length > 0" class="opacity-50" />
          
          <div class="flex flex-nowrap items-start justify-between gap-4 px-1">
            <!-- Left: Previous Quests -->
            <div v-if="parentTasks.length > 0" class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {{ t('page.tasks.questcard.previousQuests', 'Previous Quests') }}:
              </div>
              <div class="flex flex-col items-start gap-1">
                <router-link
                  v-for="parent in parentTasks"
                  :key="parent.id"
                  :to="`/tasks?task=${parent.id}`"
                  class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1.5 text-xs no-underline"
                >
                  <UIcon name="i-mdi-arrow-left" aria-hidden="true" class="h-3 w-3 shrink-0" />
                  <span class="truncate">{{ parent.name }}</span>
                </router-link>
              </div>
            </div>
            
            <div v-if="parentTasks.length > 0 && childTasks.length === 0" class="flex-1" />

            <!-- Right: Next Quests -->
            <div v-if="childTasks.length > 0" class="flex min-w-0 flex-1 flex-col items-end gap-1.5 text-right">
              <div class="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {{ t('page.tasks.questcard.nextQuests', 'Next Quests') }}:
              </div>
              <div class="flex flex-col items-end gap-1 text-right">
                <router-link
                  v-for="child in childTasks"
                  :key="child.id"
                  :to="`/tasks?task=${child.id}`"
                  class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center justify-end gap-1.5 text-xs no-underline"
                >
                  <span class="truncate">{{ child.name }}</span>
                  <UIcon name="i-mdi-arrow-right" aria-hidden="true" class="h-3 w-3 shrink-0" />
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import type { Task } from '@/types/tarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';

  interface TraderStanding {
    trader: { id: string; name: string };
    standing: number;
  }

  interface SkillReward {
    name: string;
    level: number;
  }

  interface TraderUnlock {
    name: string;
  }

  interface ItemReward {
    item?: { id: string; name?: string; shortName?: string; iconLink?: string };
    count: number;
  }

  interface OfferUnlock {
    id: string;
    item?: { id: string; name?: string; shortName?: string; iconLink?: string };
    trader: { name: string };
    level: number;
  }

  const props = defineProps<{
    taskId: string;
    experience: number;
    traderStandingRewards: TraderStanding[];
    skillRewards: SkillReward[];
    traderUnlockReward?: TraderUnlock | TraderUnlock[] | null;
    itemRewards: ItemReward[];
    offerUnlockRewards: OfferUnlock[];
    parentTasks: Task[];
    childTasks: Task[];
    unlocksNextCount: number;
    impactCount: number;
  }>();

  defineEmits<{
    'item-context-menu': [event: MouseEvent, item: ItemReward['item']];
  }>();

  const { t } = useI18n({ useScope: 'global' });
  const formatNumber = useLocaleNumberFormatter();
  const preferencesStore = usePreferencesStore();

  const displayedTraderUnlock = computed(() => {
    if (Array.isArray(props.traderUnlockReward)) {
      return props.traderUnlockReward.length > 0 ? props.traderUnlockReward[0] : null;
    }
    return props.traderUnlockReward || null;
  });

  const rewardLinkClass =
    'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1.5 text-xs';

  const rewardItemCardClass = [
    'group relative flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none cursor-pointer',
    'transition-colors hover:shadow-md dark:hover:bg-white/10 focus:outline-none',
    'focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900',
    'focus-visible:ring-2 focus-visible:ring-offset-2',
  ].join(' ');

  const showDetails = ref(false);
  const detailsId = computed(() => `task-${props.taskId}-details`);

  const hasRewardsSummary = computed(() => {
    return (
      (preferencesStore.getShowExperienceRewards && props.experience > 0) ||
      props.traderStandingRewards.length > 0 ||
      props.skillRewards.length > 0 ||
      displayedTraderUnlock.value != null
    );
  });

  const hasDetailedRewards = computed(() => {
    return props.itemRewards.length > 0 || props.offerUnlockRewards.length > 0;
  });

  const hasExpandableDetails = computed(() => {
    return hasDetailedRewards.value || props.childTasks.length > 0 || props.parentTasks.length > 0;
  });

  const toggleDetailsLabel = computed(() => {
    return showDetails.value
      ? t('page.tasks.questcard.hideDetails', 'Hide details')
      : t('page.tasks.questcard.showDetails', 'Show details');
  });

  const itemRewardsSummaryTooltip = computed(() => {
    const items = props.itemRewards;
    if (items.length === 0) return '';
    const names = items
      .slice(0, 5)
      .map((r) => {
        const name = r.item?.shortName || r.item?.name || '';
        return r.count > 1 ? `${name} x${r.count}` : name;
      })
      .join(', ');
    const count = items.length - 5;
    return items.length > 5
      ? `${names}${t('page.tasks.questcard.andMore', { count }, `, +${count} more`)}`
      : names;
  });

  const offerUnlockSummaryTooltip = computed(() => {
    const offers = props.offerUnlockRewards;
    if (offers.length === 0) return '';
    const names = offers
      .slice(0, 5)
      .map((o) => {
        const name = o.item?.shortName || o.item?.name || '';
        return `${name} (${o.trader.name} LL${o.level})`;
      })
      .join(', ');
    const count = offers.length - 5;
    return offers.length > 5
      ? `${names}${t('page.tasks.questcard.andMore', { count }, `, +${count} more`)}`
      : names;
  });

  const getItemTooltip = (item?: { shortName?: string; name?: string }) => {
    const name = item?.shortName || item?.name || t('page.tasks.questcard.item', 'Item');
    return t('page.tasks.questcard.openItemOnTarkovDev', { name }, `Open ${name} on tarkov.dev`);
  };

  const toggleDetails = () => {
    if (!hasExpandableDetails.value) return;
    showDetails.value = !showDetails.value;
  };

  const onAreaClick = (event: MouseEvent) => {
    if (!hasExpandableDetails.value) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) return;
    toggleDetails();
  };
</script>
