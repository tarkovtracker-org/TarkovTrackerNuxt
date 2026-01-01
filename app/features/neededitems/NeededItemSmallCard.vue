<template>
<<<<<<< HEAD
  <div
    class="group flex h-full flex-col rounded-lg border shadow-sm transition-all duration-200"
    :class="itemCardClasses"
  >
    <template v-if="hasItem">
      <div class="flex flex-1 flex-col">
        <!-- Item image with count badge -->
        <div
          :class="[
            imageContainerClasses,
            {
              'hover:ring-primary-300 cursor-pointer hover:ring-1 active:scale-[0.98]':
                hasItem && !selfCompletedNeed,
            },
          ]"
          @click="handleCardClick"
        >
          <div class="absolute top-0 left-0 z-40 peer/indicators">
=======
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
>>>>>>> main
            <div
              class="flex items-center gap-1 rounded-br-lg px-2 py-1 text-sm font-bold shadow-lg"
              :class="itemCountTagClasses"
            >
<<<<<<< HEAD
              {{ currentCount }}/{{ neededCount }}
              <ItemIndicators
                :found-in-raid="props.need.foundInRaid"
                fir-icon-class="h-4 w-4"
                :is-craftable="isCraftable"
                :craftable-title="craftableTitle"
                craftable-icon-base-class="h-4 w-4 opacity-90"
                :craftable-icon-class="craftableIconClass"
                @craft="goToCraftStation"
              />
=======
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
>>>>>>> main
            </div>
          </div>
          <!-- Click to complete overlay -->
          <div
            v-if="!selfCompletedNeed"
            class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover/image:opacity-100 peer-hover/indicators:opacity-0"
          >
            <span
              class="rounded bg-black/60 px-2 py-1 text-sm font-bold tracking-wide text-white backdrop-blur-sm"
            >
              {{ currentCount >= neededCount ? t('page.neededitems.uncollect') : t('page.neededitems.collect') }}
            </span>
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
                class="line-clamp-2 text-center text-[clamp(0.7rem,2.5vw,0.875rem)] leading-snug font-medium text-content-primary"
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
              <span class="ml-1 text-[clamp(0.625rem,2vw,0.75rem)] text-content-tertiary">
                {{ props.need.hideoutModule.level }}
              </span>
            </template>
          </div>
          <!-- Requirements (Level & Tasks Before) -->
          <div
              class="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[clamp(0.625rem,1.8vw,0.75rem)] text-content-tertiary"
          >
            <span
              v-if="levelRequired > 0 && levelRequired > playerLevel"
              class="flex items-center gap-1"
            >
              <UIcon name="i-mdi-account" class="h-3.5 w-3.5" />
              {{ t('page.neededitems.lvl_required', { level: levelRequired }) }}
            </span>
            <span v-if="lockedBefore > 0" class="flex items-center gap-1">
              <UIcon name="i-mdi-lock-outline" class="h-3.5 w-3.5" />
              {{ t('page.neededitems.locked_before', { count: lockedBefore }) }}
            </span>
          </div>
        </div>
      </div>
      <!-- Controls - outside tooltip wrapper to prevent overlap -->
      <div v-if="!isSingleItem" class="mt-auto flex items-center justify-center pb-2 px-2">
        <template v-if="!selfCompletedNeed">
          <ItemCountControls
            :current-count="currentCount"
            :needed-count="neededCount"
            @decrease="$emit('decreaseCount')"
            @increase="$emit('increaseCount')"
            @toggle="$emit('toggleCount')"
            @set-count="(count) => $emit('setCount', count)"
            @click.stop
          />
        </template>
        <span v-else class="text-sm font-bold text-success-600 dark:text-success-400">
          {{ currentCount }}/{{ neededCount }} ✓
        </span>
      </div>
      <!-- For single items, show completed status at bottom if needed or just padding -->
      <div v-else class="pb-2"></div>
    </template>
    <template v-else>
      <div :class="imageContainerClasses">
        <div class="h-full w-full animate-pulse rounded-t-lg bg-surface-elevated"></div>
      </div>
      <div class="flex flex-1 flex-col p-2">
        <div class="flex min-h-10 items-start justify-center">
          <span class="h-4 w-3/4 animate-pulse rounded bg-surface-elevated"></span>
        </div>
        <div class="flex min-h-7 w-full items-center justify-center">
          <span class="h-3 w-1/2 animate-pulse rounded bg-surface-elevated"></span>
        </div>
        <div class="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
          <span class="h-3 w-1/3 animate-pulse rounded bg-surface-elevated"></span>
          <span class="h-3 w-1/3 animate-pulse rounded bg-surface-elevated"></span>
        </div>
        <div class="mt-auto flex items-center justify-center pt-2">
          <span class="h-4 w-10 animate-pulse rounded bg-surface-elevated"></span>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, inject } from 'vue';
  import { useI18n } from 'vue-i18n';
  import {
    createDefaultNeededItemContext,
    neededItemKey,
  } from '@/features/neededitems/neededitem-keys';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  import ItemCountControls from './ItemCountControls.vue';
  import GameItem from '@/components/ui/GameItem.vue';
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink.vue'));
  const StationLink = defineAsyncComponent(() => import('@/features/hideout/StationLink.vue'));
  const { t } = useI18n();
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
  const isCompleted = computed(() => selfCompletedNeed.value || currentCount.value >= neededCount.value);
  const handleCardClick = () => {
    if (hasItem.value && !selfCompletedNeed.value) {
      emit('toggleCount');
    }
  };
  const itemCardClasses = computed(() => {
    return {
      'bg-success-50/50 border-success-200 dark:bg-success-900/10 dark:border-success-500/30':
        isCompleted.value,
      'bg-surface-elevated border-base hover:border-primary-300':
        !isCompleted.value,
    };
  });
  const imageContainerClasses = computed(() => {
    const baseLayoutClasses =
      'group/image relative z-0 aspect-[4/3] w-full shrink-0 origin-bottom overflow-hidden rounded-t-lg';
    const transitionClasses = 'transition-transform duration-150 ease-out will-change-transform';
    const hoverClasses =
      'hover:z-20 hover:-translate-y-1 hover:scale-[1.08] hover:shadow-2xl hover:ring-1 hover:ring-black/5 dark:hover:ring-white/10';
    return [baseLayoutClasses, transitionClasses, hoverClasses];
  });
  const itemCountTagClasses = computed(() => {
    return {
      'bg-clip-padding rounded-tl-[5px] rounded-br-[10px]': true,
<<<<<<< HEAD
      'bg-surface-elevated text-content-primary shadow-md ring-1 ring-black/5 dark:ring-0':
        !isCompleted.value,
      'bg-success-500 text-white shadow-md': isCompleted.value,
=======
      'bg-surface-800/90 text-surface-100 ring-1 ring-white/10':
        !(selfCompletedNeed.value || currentCount.value >= neededCount.value),
      'bg-complete text-white': selfCompletedNeed.value || currentCount.value >= neededCount.value,
>>>>>>> main
    };
  });
</script>
