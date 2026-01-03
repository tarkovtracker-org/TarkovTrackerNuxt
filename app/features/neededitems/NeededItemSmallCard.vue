<template>
  <KeepAlive>
    <AppTooltip
      :text="
        isSingleItem && !selfCompletedNeed
          ? currentCount >= neededCount
            ? 'Click to uncollect'
            : 'Click to collect'
          : ''
      "
    >
      <div
        class="flex h-full flex-col rounded-lg"
        :class="[
          itemCardClasses,
          {
            'hover:ring-primary-400 hover:ring-opacity-50 cursor-pointer transition-all hover:ring-2 active:scale-[0.98]':
              hasItem && isSingleItem && !selfCompletedNeed,
          },
        ]"
        @click="handleCardClick"
      >
        <template v-if="hasItem">
          <!-- Item image with count badge -->
          <div :class="imageContainerClasses">
            <div class="absolute top-0 left-0 z-10">
              <div
                class="flex items-center gap-1 rounded-br-lg px-2 py-1 text-sm font-bold shadow-lg"
                :class="itemCountTagClasses"
              >
                {{ formatNumber(currentCount) }}/{{ formatNumber(neededCount) }}
                <ItemIndicators
                  :found-in-raid="props.need.foundInRaid"
                  fir-icon-class="h-4 w-4"
                  :is-craftable="isCraftable"
                  :craftable-title="craftableTitle"
                  craftable-icon-base-class="h-4 w-4 opacity-90"
                  :craftable-icon-class="craftableIconClass"
                  :kappa-required="isKappaRequired"
                  :kappa-title="$t('task.kappa_req', 'Required for Kappa quest')"
                  kappa-icon-class="h-4 w-4 text-warning-400"
                  @craft="goToCraftStation"
                />
              </div>
            </div>
            <GameItem
              v-if="imageItem"
              :image-item="imageItem"
              :src="imageItem.image512pxLink"
              :is-visible="true"
              :item-name="item?.name ?? null"
              :wiki-link="item?.wikiLink ?? null"
              :dev-link="item?.link ?? null"
              :task-wiki-link="relatedTask?.wikiLink"
              :background-color="imageItem.backgroundColor || 'grey'"
              size="small"
              simple-mode
              fill
              class="h-full w-full"
            />
          </div>
          <!-- Card content -->
          <div class="flex flex-1 flex-col p-2">
            <!-- Item name -->
            <div class="flex min-h-10 items-start justify-center">
              <span
                class="line-clamp-2 text-center text-[clamp(0.7rem,2.5vw,0.875rem)] leading-snug font-medium"
              >
                {{ item?.name ?? '' }}
              </span>
            </div>
            <!-- Task/Station link -->
            <div class="flex min-h-7 w-full items-center justify-center overflow-hidden">
              <template v-if="props.need.needType == 'taskObjective' && relatedTask">
                <TaskLink
                  :task="relatedTask"
                  compact
                  class="max-w-full text-[clamp(0.625rem,2vw,0.75rem)]"
                />
              </template>
              <template v-else-if="props.need.needType == 'hideoutModule'">
                <StationLink
                  v-if="relatedStation"
                  :station="relatedStation"
                  compact
                  class="max-w-full text-[clamp(0.625rem,2vw,0.75rem)]"
                />
                <span class="ml-1 text-[clamp(0.625rem,2vw,0.75rem)] text-gray-400">
                  {{ props.need.hideoutModule.level }}
                </span>
              </template>
            </div>
            <!-- Requirements (Level & Tasks Before) -->
            <div
              class="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[clamp(0.625rem,1.8vw,0.75rem)] text-gray-400"
            >
              <span
                v-if="levelRequired > 0 && levelRequired > playerLevel"
                class="flex items-center gap-1"
              >
                <UIcon name="i-mdi-account" class="h-3.5 w-3.5" />
                Lvl {{ levelRequired }}
              </span>
              <span v-if="lockedBefore > 0" class="flex items-center gap-1">
                <UIcon name="i-mdi-lock-outline" class="h-3.5 w-3.5" />
                {{ lockedBefore }} before
              </span>
            </div>
            <!-- Controls - hide for single items since clicking image toggles -->
            <div v-if="!isSingleItem" class="mt-auto flex items-center justify-center pt-2">
              <template v-if="!selfCompletedNeed">
                <ItemCountControls
                  :current-count="currentCount"
                  :needed-count="neededCount"
                  @decrease="$emit('decreaseCount')"
                  @increase="$emit('increaseCount')"
                  @toggle="$emit('toggleCount')"
                  @set-count="(count) => $emit('setCount', count)"
                />
              </template>
              <span v-else class="text-success-400 text-sm font-bold">
                {{ formatNumber(currentCount) }}/{{ formatNumber(neededCount) }} ✓
              </span>
            </div>
          </div>
        </template>
        <template v-else>
          <div :class="imageContainerClasses">
            <div class="bg-surface-700 h-full w-full animate-pulse rounded-t-lg"></div>
          </div>
          <div class="flex flex-1 flex-col p-2">
            <div class="flex min-h-10 items-start justify-center">
              <span class="bg-surface-700 h-4 w-3/4 animate-pulse rounded"></span>
            </div>
            <div class="flex min-h-7 w-full items-center justify-center">
              <span class="bg-surface-700 h-3 w-1/2 animate-pulse rounded"></span>
            </div>
            <div class="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
              <span class="bg-surface-700 h-3 w-1/3 animate-pulse rounded"></span>
              <span class="bg-surface-700 h-3 w-1/3 animate-pulse rounded"></span>
            </div>
            <div class="mt-auto flex items-center justify-center pt-2">
              <span class="bg-surface-700 h-4 w-10 animate-pulse rounded"></span>
            </div>
          </div>
        </template>
      </div>
    </AppTooltip>
  </KeepAlive>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, inject } from 'vue';
  import {
    createDefaultNeededItemContext,
    neededItemKey,
  } from '@/features/neededitems/neededitem-keys';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  import ItemCountControls from './ItemCountControls.vue';
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink.vue'));
  const StationLink = defineAsyncComponent(() => import('@/features/hideout/StationLink.vue'));
  const emit = defineEmits(['decreaseCount', 'increaseCount', 'toggleCount', 'setCount']);
  const props = defineProps({
    need: {
      type: Object,
      required: true,
    },
  });
  const formatNumber = useLocaleNumberFormatter();
  const tarkovStore = useTarkovStore();
  const playerLevel = computed(() => tarkovStore.playerLevel());
  const {
    selfCompletedNeed,
    relatedTask,
    relatedStation,
    craftableIconClass,
    craftableTitle,
    goToCraftStation,
    neededCount,
    currentCount,
    isCraftable,
    isKappaRequired,
    levelRequired,
    lockedBefore,
    item,
    imageItem,
  } = inject(neededItemKey, createDefaultNeededItemContext());
  const hasItem = computed(() => Boolean(item.value));
  // Simplified UI for single-quantity items
  const isSingleItem = computed(() => neededCount.value === 1);
  const handleCardClick = () => {
    if (hasItem.value && isSingleItem.value && !selfCompletedNeed.value) {
      emit('toggleCount');
    }
  };
  const itemCardClasses = computed(() => {
    return {
      'bg-gradient-to-t from-complete to-surface':
        selfCompletedNeed.value || currentCount.value >= neededCount.value,
      'bg-gray-800': !(selfCompletedNeed.value || currentCount.value >= neededCount.value),
    };
  });
  const imageContainerClasses = computed(() => {
    const baseLayoutClasses =
      'relative z-0 aspect-[4/3] w-full shrink-0 origin-bottom overflow-hidden rounded-t-lg';
    const transitionClasses = 'transition-transform duration-150 ease-out will-change-transform';
    const hoverClasses =
      'hover:z-20 hover:-translate-y-1 hover:scale-[1.08] hover:shadow-2xl hover:ring-1 hover:ring-white/10';
    return [baseLayoutClasses, transitionClasses, hoverClasses];
  });
  const itemCountTagClasses = computed(() => {
    return {
      'bg-clip-padding rounded-tl-[5px] rounded-br-[10px]': true,
      'bg-surface-800/90 text-surface-100 ring-1 ring-white/10': !(
        selfCompletedNeed.value || currentCount.value >= neededCount.value
      ),
      'bg-complete text-white': selfCompletedNeed.value || currentCount.value >= neededCount.value,
    };
  });
</script>
