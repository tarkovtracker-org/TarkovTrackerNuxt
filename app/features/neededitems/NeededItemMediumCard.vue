<template>
  <div class="flex h-full flex-col rounded" :class="itemCardClasses">
    <!-- Item image - fixed aspect ratio -->
    <div class="relative aspect-video w-full shrink-0 overflow-hidden">
      <GameItem
        v-if="imageItem"
        :image-item="imageItem"
        :src="imageItem.image512pxLink"
        :is-visible="true"
        :background-color="imageItem?.backgroundColor || 'grey'"
        size="small"
        simple-mode
        fill
        class="h-full w-full"
      />
    </div>
    <!-- Item name - fixed height with line clamp -->
    <div v-if="item" class="flex h-12 shrink-0 items-center justify-center px-2 pt-2">
      <div class="line-clamp-2 text-center text-sm leading-tight">
        {{ item.name }}
          <UIcon
            v-if="props.need.foundInRaid"
            v-tooltip="$t('page.neededitems.fir_required')"
            name="i-mdi-checkbox-marked-circle-outline"
            class="ml-0.5 inline-block h-3.5 w-3.5"
          />
          <UIcon
            v-if="isKappaRequired"
            v-tooltip="$t('task.kappa_req', 'Required for Kappa quest')"
            name="i-mdi-trophy"
            class="text-entity-kappa ml-0.5 inline-block h-3.5 w-3.5"
          />
          <button
            v-if="isCraftable"
            v-tooltip="craftableTitle"
            type="button"
            class="ml-0.5 inline-flex"
            :aria-label="craftableTitle"
            @click.stop="goToCraftStation"
          >
            <UIcon
              name="i-mdi-hammer-wrench"
              class="h-3.5 w-3.5 opacity-90"
              :class="craftableIconClass"
              aria-hidden="true"
            />
          </button>
      </div>
    </div>
    <!-- Task/Station info - fixed height with line clamp -->
    <div class="flex h-10 shrink-0 items-center justify-center px-2">
      <template v-if="props.need.needType == 'taskObjective'">
        <div class="line-clamp-2 text-center">
          <task-link v-if="relatedTask" :task="relatedTask" />
          <span v-else class="text-sm text-gray-300">Unknown task</span>
        </div>
      </template>
      <template v-else-if="props.need.needType == 'hideoutModule'">
        <div class="flex items-center justify-center text-center">
          <station-link v-if="relatedStation" :station="relatedStation" class="justify-center" />
          <span v-else class="text-sm text-gray-300">Unknown station</span>
          <span class="ml-1 text-sm">{{ props.need.hideoutModule.level }}</span>
        </div>
      </template>
    </div>
    <!-- Requirements info - fixed height -->
    <div class="flex h-6 shrink-0 items-center justify-center px-2 text-xs">
      <RequirementInfo
        :need-type="props.need.needType"
        :level-required="levelRequired"
        :locked-before="lockedBefore"
        :player-level="tarkovStore.playerLevel()"
      />
    </div>
    <!-- Item count actions - pushed to bottom -->
    <div class="mt-auto flex flex-col items-center justify-center px-2 pt-1 pb-2">
      <template v-if="!selfCompletedNeed">
        <ItemCountControls
          :current-count="currentCount"
          :needed-count="neededCount"
          @decrease="$emit('decreaseCount')"
          @increase="$emit('increaseCount')"
          @toggle="$emit('toggleCount')"
          @set-count="(count) => $emit('setCount', count)"
        />
        <TeamNeedsDisplay
          v-if="teamNeeds.length > 0"
          :team-needs="teamNeeds"
          :needed-count="neededCount"
          class="mt-2"
        />
      </template>
      <span v-else class="text-success-400 text-sm font-semibold">
        {{ formatNumber(currentCount) }}/{{ formatNumber(neededCount) }}
      </span>
    </div>
  </div>
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
  import RequirementInfo from './RequirementInfo.vue';
  import TeamNeedsDisplay from './TeamNeedsDisplay.vue';
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink.vue'));
  const StationLink = defineAsyncComponent(() => import('@/features/hideout/StationLink.vue'));
  const props = defineProps({
    need: {
      type: Object,
      required: true,
    },
  });
  defineEmits(['increaseCount', 'decreaseCount', 'toggleCount', 'setCount']);
  const tarkovStore = useTarkovStore();
  const formatNumber = useLocaleNumberFormatter();
  const {
    selfCompletedNeed,
    relatedTask,
    relatedStation,
    craftableIconClass,
    craftableTitle,
    goToCraftStation,
    lockedBefore,
    neededCount,
    currentCount,
    isCraftable,
    isKappaRequired,
    levelRequired,
    item,
    teamNeeds,
    imageItem,
  } = inject(neededItemKey, createDefaultNeededItemContext());
  const itemCardClasses = computed(() => {
    return {
      'bg-gradient-to-t from-complete/20 to-surface-elevated':
        selfCompletedNeed.value || currentCount.value >= neededCount.value,
      'bg-surface-elevated': !(selfCompletedNeed.value || currentCount.value >= neededCount.value),
      'shadow-md': true,
    };
  });
</script>
