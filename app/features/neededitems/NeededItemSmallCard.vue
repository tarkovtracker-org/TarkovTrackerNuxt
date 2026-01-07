<template>
  <div
    class="group flex h-full flex-col rounded-lg shadow-sm transition-all duration-200"
    :class="itemCardClasses"
  >
    <template v-if="hasItem">
      <div class="flex flex-1 flex-col">
        <!-- Item image with count badge -->
        <div
          :class="[
            imageContainerClasses,
            {
              'cursor-pointer active:scale-[0.98]': hasItem && !selfCompletedNeed,
            },
          ]"
          @click="handleCardClick"
        >
          <ItemStatusBadge
            :current-count="currentCount"
            :needed-count="neededCount"
            :is-complete="isCompleted"
            :found-in-raid="props.need.foundInRaid"
            :is-craftable="isCraftable"
            :craftable-title="craftableTitle"
            :craftable-icon-class="craftableIconClass"
            :is-kappa-required="isKappaRequired"
            :kappa-title="$t('task.kappa_req', 'Required for Kappa quest')"
            @craft="goToCraftStation"
          />
          <!-- Click to complete overlay -->
          <div
            v-if="!selfCompletedNeed"
            class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover/image:opacity-100 peer-hover/indicators:opacity-0"
          >
            <span
              class="rounded bg-black/60 px-2 py-1 text-sm font-bold tracking-wide text-white backdrop-blur-sm"
            >
              {{
                currentCount >= neededCount
                  ? t('page.neededitems.uncollect')
                  : t('page.neededitems.collect')
              }}
            </span>
          </div>
          <GameItem
            v-if="imageItem"
            :item="imageItem"
            :is-visible="true"
            :task-wiki-link="relatedTask?.wikiLink"
            size="fluid"
            simple-mode
          />
        </div>
        <!-- Card content -->
        <div class="flex flex-1 flex-col p-2">
          <!-- Item name -->
          <div class="flex min-h-10 items-start justify-center">
            <span
              class="text-content-primary line-clamp-2 text-center text-[clamp(0.7rem,2.5vw,0.875rem)] leading-snug font-medium"
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
                :level="props.need.hideoutModule.level"
                class="max-w-full text-[clamp(0.625rem,2vw,0.75rem)]"
              />
            </template>
          </div>
          <!-- Requirements (Level & Tasks Before) -->
          <div
            class="text-content-tertiary flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[clamp(0.625rem,1.8vw,0.75rem)]"
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
      <div v-if="!isSingleItem" class="mt-auto flex items-center justify-center px-2 pb-2">
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
        <span v-else class="text-success-600 dark:text-success-400 text-sm font-bold">
          {{ currentCount }}/{{ neededCount }} ✓
        </span>
      </div>
      <!-- For single items, show completed status at bottom if needed or just padding -->
      <div v-else class="pb-2"></div>
    </template>
    <template v-else>
      <div :class="imageContainerClasses">
        <div class="bg-surface-elevated h-full w-full animate-pulse rounded-t-lg"></div>
      </div>
      <div class="flex flex-1 flex-col p-2">
        <div class="flex min-h-10 items-start justify-center">
          <span class="bg-surface-elevated h-4 w-3/4 animate-pulse rounded"></span>
        </div>
        <div class="flex min-h-7 w-full items-center justify-center">
          <span class="bg-surface-elevated h-3 w-1/2 animate-pulse rounded"></span>
        </div>
        <div class="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
          <span class="bg-surface-elevated h-3 w-1/3 animate-pulse rounded"></span>
          <span class="bg-surface-elevated h-3 w-1/3 animate-pulse rounded"></span>
        </div>
        <div class="mt-auto flex items-center justify-center pt-2">
          <span class="bg-surface-elevated h-4 w-10 animate-pulse rounded"></span>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, inject } from 'vue';
  import { useI18n } from 'vue-i18n';
  import GameItem from '@/components/ui/GameItem.vue';
  import ItemStatusBadge from '@/components/ui/ItemStatusBadge.vue';
  import {
    createDefaultNeededItemContext,
    neededItemKey,
  } from '@/features/neededitems/neededitem-keys';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  import ItemCountControls from './ItemCountControls.vue';
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
  const _formatNumber = useLocaleNumberFormatter();
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
  const isCompleted = computed(
    () => selfCompletedNeed.value || currentCount.value >= neededCount.value
  );
  const handleCardClick = () => {
    if (hasItem.value && !selfCompletedNeed.value) {
      emit('toggleCount');
    }
  };
  const itemCardClasses = computed(() => {
    return {
      'bg-success-500/20': isCompleted.value,
      'bg-surface-elevated': !isCompleted.value,
    };
  });
  const imageContainerClasses = computed(() => {
    const baseLayoutClasses =
      'group/image relative z-0 flex items-center justify-center w-full shrink-0 origin-bottom overflow-hidden rounded';
    const transitionClasses = 'transition-transform duration-150 ease-out will-change-transform';
    const hoverClasses = 'hover:z-20 hover:-translate-y-1 hover:scale-[1.08] hover:ring-1';
    // Conditional ring color
    const ringColor =
      hasItem.value && !selfCompletedNeed.value
        ? 'hover:ring-accent-400'
        : 'hover:ring-black/5 dark:hover:ring-white/10';
    return [baseLayoutClasses, transitionClasses, hoverClasses, ringColor];
  });
</script>
