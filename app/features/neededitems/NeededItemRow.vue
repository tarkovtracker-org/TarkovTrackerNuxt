<template>
  <KeepAlive>
    <div ref="cardRef" class="mb-1 rounded" :class="itemRowClasses">
      <div class="px-3 py-2">
        <div class="mx-0 flex flex-nowrap items-center">
          <div class="flex min-w-0 flex-1 items-center p-0">
            <span class="block">
              <GameItem
                v-if="isVisible"
                :image-item="imageItem"
                :src="imageItem?.iconLink"
                :is-visible="true"
                :item-name="item.name"
                :wiki-link="item.wikiLink"
                :dev-link="item.link"
                :task-wiki-link="relatedTask?.wikiLink"
                size="small"
                simple-mode
              />
            </span>
            <span class="ml-3 flex min-w-0 flex-1 flex-col overflow-hidden">
              <span class="flex items-center truncate text-base font-semibold">
                <span class="truncate">{{ item.name }}</span>
                <ItemIndicators
                  :found-in-raid="props.need.foundInRaid"
                  :is-craftable="isCraftable"
                  :craftable-title="craftableTitle"
                  :craftable-icon-class="craftableIconClass"
                  :kappa-required="isKappaRequired"
                  :kappa-title="$t('task.kappa_req', 'Required for Kappa quest')"
                  @craft="goToCraftStation"
                />
              </span>
              <span class="mt-1">
                <template v-if="props.need.needType == 'taskObjective'">
                  <TaskLink :task="relatedTask" />
                </template>
                <template v-else-if="props.need.needType == 'hideoutModule'">
                  <StationLink v-if="relatedStation" :station="relatedStation" />
                  <span v-else class="text-sm text-gray-300">Unknown station</span>
                </template>
              </span>
            </span>
          </div>
          <div class="ml-2 flex shrink-0 flex-col items-end justify-center">
            <div v-if="belowMd" class="mr-2 block">
              <UButton
                variant="ghost"
                color="neutral"
                class="m-0 p-0 px-1"
                @click="isSingleItem ? $emit('toggleCount') : (smallDialog = true)"
              >
                <template v-if="isSingleItem">
                  <UIcon
                    name="i-mdi-check-circle"
                    class="h-5 w-5"
                    :class="isCollected ? 'text-success-400' : 'text-gray-300'"
                  />
                </template>
                <template v-else>
                  {{ formatNumber(currentCount) }}/{{ formatNumber(neededCount) }}
                </template>
              </UButton>
              <UModal v-model="smallDialog" :ui="{ width: 'w-11/12' }">
                <UCard>
                  <div class="flex h-full flex-col items-end">
                    <!-- Item image -->
                    <div class="flex aspect-video min-h-25 self-stretch">
                      <GameItem
                        v-if="imageItem"
                        :image-item="imageItem"
                        :src="imageItem.image512pxLink"
                        :is-visible="true"
                        :item-name="item.name"
                        :wiki-link="item.wikiLink"
                        :dev-link="item.link"
                        :task-wiki-link="relatedTask?.wikiLink"
                        size="large"
                        simple-mode
                      />
                    </div>
                    <div class="mx-2 mt-2 flex items-center self-center">
                      <div class="px-2 text-center">
                        {{ item.name }}
                      </div>
                      <ItemIndicators
                        :found-in-raid="props.need.foundInRaid"
                        fir-icon-class="ml-1 h-4 w-4"
                        :is-craftable="isCraftable"
                        :craftable-title="craftableTitle"
                        craftable-icon-base-class="ml-1 h-4 w-4"
                        :craftable-icon-class="craftableIconClass"
                        :kappa-required="isKappaRequired"
                        :kappa-title="$t('task.kappa_req', 'Required for Kappa quest')"
                        kappa-icon-class="ml-1 h-4 w-4 text-warning-400"
                        @craft="goToCraftStation"
                      />
                    </div>
                    <!-- Item need details -->
                    <div class="mx-2 mt-2 flex w-full flex-col self-center">
                      <template v-if="props.need.needType == 'taskObjective'">
                        <task-link :task="relatedTask" />
                        <RequirementInfo
                          :need-type="props.need.needType"
                          :level-required="levelRequired"
                          :locked-before="lockedBefore"
                          :player-level="tarkovStore.playerLevel()"
                        />
                      </template>
                      <template v-else-if="props.need.needType == 'hideoutModule'">
                        <div class="mt-1 mb-1 flex justify-center">
                          <div class="text-center">
                            <template v-if="relatedStation">
                              <station-link :station="relatedStation" class="justify-center" />
                            </template>
                            <template v-else>
                              <span class="text-sm text-gray-300">Unknown station</span>
                            </template>
                          </div>
                          <div class="ml-1">
                            {{ props.need.hideoutModule.level }}
                          </div>
                        </div>
                        <RequirementInfo
                          :need-type="props.need.needType"
                          :level-required="levelRequired"
                          :locked-before="lockedBefore"
                          :player-level="tarkovStore.playerLevel()"
                          :related-station="relatedStation"
                          :hideout-level="props.need.hideoutModule.level"
                        />
                      </template>
                    </div>
                    <!-- Item count actions -->
                    <div
                      v-if="!selfCompletedNeed"
                      class="mx-2 mt-2 mb-2 flex h-full flex-col items-center justify-center self-stretch"
                    >
                      <template v-if="!isSingleItem">
                        <ItemCountControls
                          :current-count="currentCount"
                          :needed-count="neededCount"
                          @decrease="$emit('decreaseCount')"
                          @increase="$emit('increaseCount')"
                          @toggle="$emit('toggleCount')"
                          @set-count="(count) => $emit('setCount', count)"
                        />
                      </template>
                      <template v-else>
                        <AppTooltip :text="isCollected ? 'Collected' : 'Mark as collected'">
                          <CollectedToggleButton
                            :is-collected="isCollected"
                            class="flex h-10 w-10 items-center justify-center rounded-lg border transition-colors"
                            :class="
                              isCollected
                                ? 'bg-success-600 border-success-500 hover:bg-success-500 text-white'
                                : 'bg-surface-700 text-surface-200 hover:bg-surface-600 border-white/20 hover:text-white'
                            "
                            :aria-label="isCollected ? 'Collected' : 'Mark as collected'"
                            icon-class="h-6 w-6"
                            @toggle="$emit('toggleCount')"
                          />
                        </AppTooltip>
                      </template>
                      <!-- Show team needs alongside controls -->
                      <TeamNeedsDisplay
                        v-if="teamNeeds.length > 0"
                        :team-needs="teamNeeds"
                        :needed-count="neededCount"
                        class="mt-2"
                      />
                    </div>
                    <!-- Show static count for completed parent items (Completed tab) -->
                    <div
                      v-else
                      class="mx-2 mt-2 mb-2 flex h-full items-center justify-center self-stretch"
                    >
                      <span class="text-success-400 text-sm font-semibold">
                        {{ formatNumber(currentCount) }}/{{ formatNumber(neededCount) }}
                      </span>
                    </div>
                  </div>
                </UCard>
              </UModal>
            </div>
            <div v-else class="flex flex-row">
              <div v-if="mdAndUp" class="mr-2 flex justify-between self-center">
                <template v-if="props.need.needType == 'taskObjective'">
                  <RequirementInfo
                    :need-type="props.need.needType"
                    :level-required="levelRequired"
                    :locked-before="lockedBefore"
                    :player-level="tarkovStore.playerLevel()"
                  />
                </template>
                <template v-else-if="props.need.needType == 'hideoutModule'">
                  <RequirementInfo
                    :need-type="props.need.needType"
                    :level-required="levelRequired"
                    :locked-before="lockedBefore"
                    :player-level="tarkovStore.playerLevel()"
                    :related-station="relatedStation"
                    :hideout-level="props.need.hideoutModule.level"
                  />
                </template>
              </div>
              <div v-if="!selfCompletedNeed" class="mr-2 flex items-center gap-3 self-center">
                <template v-if="!isSingleItem">
                  <ItemCountControls
                    :current-count="currentCount"
                    :needed-count="neededCount"
                    @decrease="$emit('decreaseCount')"
                    @increase="$emit('increaseCount')"
                    @toggle="$emit('toggleCount')"
                    @set-count="(count) => $emit('setCount', count)"
                  />
                </template>
                <template v-else>
                  <AppTooltip :text="isCollected ? 'Collected' : 'Mark as collected'">
                    <CollectedToggleButton
                      :is-collected="isCollected"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                      :class="
                        isCollected
                          ? 'bg-success-600 border-success-500 hover:bg-success-500 text-white'
                          : 'bg-surface-700 text-surface-200 hover:bg-surface-600 border-white/20 hover:text-white'
                      "
                      :aria-label="isCollected ? 'Collected' : 'Mark as collected'"
                      icon-class="h-6 w-6"
                      @toggle="$emit('toggleCount')"
                    />
                  </AppTooltip>
                </template>
                <!-- Show team needs alongside controls -->
                <TeamNeedsDisplay
                  v-if="teamNeeds.length > 0"
                  :team-needs="teamNeeds"
                  :needed-count="neededCount"
                />
              </div>
              <!-- Show static count for completed parent items -->
              <div v-else class="mr-2 flex items-center justify-center self-center">
                <span class="text-success-400 text-sm font-semibold">
                  {{ formatNumber(currentCount) }}/{{ formatNumber(neededCount) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </KeepAlive>
</template>
<script setup>
  import { computed, defineAsyncComponent, inject, ref } from 'vue';
  import { useItemRowIntersection } from '@/composables/useItemRowIntersection';
  import { useSharedBreakpoints } from '@/composables/useSharedBreakpoints';
  import {
    createDefaultNeededItemContext,
    neededItemKey,
  } from '@/features/neededitems/neededitem-keys';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  import ItemCountControls from './ItemCountControls.vue';
  import RequirementInfo from './RequirementInfo.vue';
  import TeamNeedsDisplay from './TeamNeedsDisplay.vue';
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink'));
  const StationLink = defineAsyncComponent(() => import('@/features/hideout/StationLink'));
  const props = defineProps({
    need: {
      type: Object,
      required: true,
    },
  });
  // Use shared breakpoints to avoid duplicate listeners
  const { belowMd, mdAndUp } = useSharedBreakpoints();
  const tarkovStore = useTarkovStore();
  const formatNumber = useLocaleNumberFormatter();
  const smallDialog = ref(false);
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
  // Intersection observer for lazy loading
  const cardRef = ref(null);
  const { isVisible } = useItemRowIntersection(cardRef);
  const itemRowClasses = computed(() => {
    return {
      'bg-gradient-to-l from-complete to-surface':
        selfCompletedNeed.value || currentCount.value >= neededCount.value,
      'bg-gray-800': !(selfCompletedNeed.value || currentCount.value >= neededCount.value),
    };
  });
  const isSingleItem = computed(() => neededCount.value === 1);
  const isCollected = computed(() => currentCount.value >= neededCount.value);
  defineEmits(['decreaseCount', 'increaseCount', 'toggleCount', 'setCount']);
</script>
