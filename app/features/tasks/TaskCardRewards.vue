<template>
  <div
    v-if="hasRewardsSummary || hasExpandableDetails"
    class="rounded-md border border-gray-300 p-2 transition-colors dark:border-white/20"
    :class="[hasExpandableDetails ? 'clickable focus-ring' : '']"
    :tabindex="hasExpandableDetails ? 0 : -1"
    @click.stop="onAreaClick"
    @keydown.enter.prevent="toggleDetails"
    @keydown.space.prevent="toggleDetails"
  >
    <div class="flex flex-wrap items-center gap-2 text-gray-500 dark:text-gray-300">
      <!-- Rewards title -->
      <div class="flex items-center text-sm">
        <UIcon
          v-if="hasExpandableDetails"
          name="i-mdi-chevron-right"
          aria-hidden="true"
          class="mr-1 h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200"
          :class="showDetails ? 'rotate-90' : ''"
        />
        <span class="font-medium text-gray-700 dark:text-gray-200">
          <UIcon name="i-mdi-gift" aria-hidden="true" class="mr-1 inline h-3.5 w-3.5" />
          {{ t('page.tasks.questcard.rewards', 'Rewards') }}:
        </span>
      </div>
      <!-- XP Badge -->
      <span
        v-if="preferencesStore.getShowExperienceRewards && experience > 0"
        class="badge-soft-accent inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
      >
        <UIcon name="i-mdi-star" aria-hidden="true" class="h-3.5 w-3.5" />
        <span>{{ formatNumber(experience) }} XP</span>
      </span>
      <!-- Skill Rewards -->
      <template v-for="skill in skillRewards" :key="`skill-${skill.name}`">
        <span
          class="badge-soft-accent inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium"
        >
          <UIcon name="i-mdi-arm-flex" aria-hidden="true" class="h-3.5 w-3.5" />
          <span>+{{ skill.level }}</span>
          <span>{{ skill.name }}</span>
        </span>
      </template>
      <!-- Trader Unlock -->
      <span
        v-if="displayedTraderUnlock?.name"
        class="badge-soft-reward-trader inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium"
      >
        <UIcon name="i-mdi-lock-open-variant" aria-hidden="true" class="h-4 w-4" />
        <span>{{ displayedTraderUnlock.name }}</span>
      </span>
      <!-- Trader Standing Rewards -->
      <template v-for="standing in traderStandingRewards" :key="`standing-${standing.trader.id}`">
        <span
          class="badge-soft-reward-item inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium"
        >
          <UIcon name="i-mdi-handshake" aria-hidden="true" class="h-4 w-4" />
          <span
            :class="
              standing.standing >= 0
                ? 'text-success-600 font-bold'
                : 'text-error-600 dark:text-error-400 font-bold'
            "
          >
            {{ standing.standing >= 0 ? '+' : '' }}{{ standing.standing.toFixed(2) }}
          </span>
          <span>{{ standing.trader.name }}</span>
        </span>
      </template>
      <!-- Item Rewards Summary -->
      <span
        v-if="itemRewards.length > 0"
        v-tooltip="itemRewardsSummaryTooltip"
        class="badge-soft-reward-item inline-flex cursor-help items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium"
      >
        <UIcon name="i-mdi-package-variant" aria-hidden="true" class="h-4 w-4" />
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
      <!-- Offer Unlock Summary -->
      <span
        v-if="offerUnlockRewards.length > 0"
        v-tooltip="offerUnlockSummaryTooltip"
        class="badge-soft-reward-item inline-flex cursor-help items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium"
      >
        <UIcon name="i-mdi-cart-check" aria-hidden="true" class="h-4 w-4" />
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
      <!-- Chain info & Dropdown toggle -->
      <div class="ml-auto flex items-center gap-4"></div>
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
            <div class="text-content-tertiary text-xs font-medium">
              {{ t('page.tasks.questcard.rewardItems', 'Items') }}:
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(reward, index) in itemRewards"
                :key="`item-${reward.item?.id || index}`"
                v-tooltip="getItemTooltip(reward.item)"
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
                  <GameItem
                    v-if="reward.item"
                    :item="reward.item"
                    size="medium"
                    simple-mode
                    class="mx-auto"
                  />
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="text-content-primary max-w-[72px] truncate text-center text-xs">
                      {{ reward.item?.shortName || reward.item?.name || '' }}
                    </span>
                    <span v-if="reward.count > 1" class="text-content-tertiary text-xs font-medium">
                      x{{ formatNumber(reward.count) }}
                    </span>
                  </div>
                </component>
              </span>
            </div>
          </div>
          <!-- Offer Unlocks (Right) -->
          <div
            v-if="offerUnlockRewards.length > 0"
            class="flex min-w-0 flex-1 flex-col items-end gap-2 text-right"
          >
            <div class="text-content-tertiary text-xs font-medium">
              {{ t('page.tasks.questcard.unlocksPurchase', 'Unlocks purchase') }}:
            </div>
            <div class="flex flex-wrap justify-end gap-2 text-left">
              <span
                v-for="offer in offerUnlockRewards"
                :key="`offer-${offer.id}`"
                v-tooltip="getItemTooltip(offer.item)"
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
                  <GameItem
                    v-if="offer.item"
                    :item="offer.item"
                    size="medium"
                    simple-mode
                    class="mx-auto"
                  />
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="text-content-primary max-w-[72px] truncate text-center text-xs">
                      {{ offer.item?.shortName || offer.item?.name || '' }}
                    </span>
                    <span class="text-content-tertiary text-xs">
                      {{ offer.trader.name }} LL{{ offer.level }}
                    </span>
                  </div>
                </component>
              </span>
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
  import GameItem from '@/components/ui/GameItem.vue';
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
    item?: {
      id: string;
      name?: string;
      shortName?: string;
      iconLink?: string;
      backgroundColor?: string;
    };
    count: number;
  }
  interface OfferUnlock {
    id: string;
    item?: {
      id: string;
      name?: string;
      shortName?: string;
      iconLink?: string;
      backgroundColor?: string;
    };
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
    return hasDetailedRewards.value;
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
  const rewardItemCardClass =
    'group clickable flex flex-col items-center gap-2 rounded-lg border border-transparent bg-surface-elevated p-2 text-center transition-all';
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
