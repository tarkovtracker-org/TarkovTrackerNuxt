<template>
  <KeepAlive>
    <div
      ref="cardRef"
      class="mb-1 rounded-lg shadow-sm transition-all duration-200"
      :class="itemRowClasses"
    >
      <div class="px-3 py-2">
        <div class="mx-0 flex flex-nowrap items-center">
          <div class="flex min-w-0 flex-1 items-center p-0">
            <div
              class="group/image relative shrink-0 cursor-pointer transition-transform hover:scale-105"
              :class="{ 'pointer-events-none': selfCompletedNeed }"
              @click.stop="!selfCompletedNeed && $emit('toggleCount')"
            >
              <GameItem
                v-if="isVisible"
                :item="imageItem"
                :is-visible="true"
                :task-wiki-link="relatedTask?.wikiLink"
                size="small"
                simple-mode
              />
              <!-- Click to collect overlay -->
              <div
                v-if="!selfCompletedNeed"
                class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover/image:opacity-100"
              >
                <span
                  class="rounded bg-black/60 px-2 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm"
                >
                  {{
                    isCollected ? t('page.neededitems.uncollect') : t('page.neededitems.collect')
                  }}
                </span>
              </div>
            </div>
            <span class="ml-3 flex min-w-0 flex-1 flex-col overflow-hidden">
              <span class="flex items-center truncate text-base font-semibold">
                <span class="truncate">{{ item.name }}</span>
                <ItemIndicators
                  :found-in-raid="props.need.foundInRaid"
                  fir-icon-class="ml-1 h-4 w-4"
                  :is-craftable="isCraftable"
                  :craftable-title="craftableTitle"
                  craftable-icon-base-class="ml-1 h-4 w-4 opacity-90"
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
                  <StationLink
                    v-if="relatedStation"
                    :station="relatedStation"
                    :level="props.need.hideoutModule.level"
                  />
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
                @click="$emit('toggleCount')"
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
              <UModal
                v-model="smallDialog"
                :ui="{ content: { base: 'w-11/12 p-0' } }"
              >
                <UCard v-if="smallDialog" :ui="{ body: { padding: 'p-0 sm:p-0' } }">
                  <div class="flex flex-col items-center">
                    <!-- Item image -->
                    <div
                      class="bg-surface-elevated flex aspect-video min-h-25 w-full items-center justify-center"
                    >
                      <GameItem
                        v-if="imageItem"
                        :item="imageItem"
                        :is-visible="true"
                        :task-wiki-link="relatedTask?.wikiLink"
                        size="large"
                        simple-mode
                      />
                    </div>
                    <div class="mx-2 mt-2 flex items-center self-center">
                      <div class="px-2 text-center text-lg font-bold">
                        {{ item.name }}
                      </div>
                      <ItemIndicators
                        :found-in-raid="props.need.foundInRaid"
                        fir-icon-class="ml-1 h-4 w-4"
                        :is-craftable="isCraftable"
                        :craftable-title="craftableTitle"
                        craftable-icon-base-class="ml-1 h-4 w-4 opacity-90"
                        :craftable-icon-class="craftableIconClass"
                        :kappa-required="isKappaRequired"
                        :kappa-title="$t('task.kappa_req', 'Required for Kappa quest')"
                        kappa-icon-class="ml-1 h-4 w-4 text-entity-kappa"
                        @craft="goToCraftStation"
                      />
                    </div>
                    <!-- Item need details -->
                    <div class="mx-2 mt-2 flex w-full flex-col items-center self-center">
                      <template v-if="props.need.needType == 'taskObjective'">
                        <TaskLink :task="relatedTask" />
                        <RequirementInfo
                          :need-type="props.need.needType"
                          :level-required="levelRequired"
                          :locked-before="lockedBefore"
                          :player-level="tarkovStore.playerLevel()"
                        />
                      </template>
                      <template v-else-if="props.need.needType == 'hideoutModule'">
                        <div class="mt-1 mb-1 flex justify-center">
                          <template v-if="relatedStation">
                            <StationLink
                              :station="relatedStation"
                              :level="props.need.hideoutModule.level"
                              class="justify-center"
                            />
                          </template>
                          <template v-else>
                            <span class="text-sm text-gray-300">Unknown station</span>
                          </template>
                        </div>
                        <RequirementInfo
                          :need-type="props.need.needType"
                          :level-required="levelRequired"
                          :locked-before="lockedBefore"
                          :player-level="tarkovStore.playerLevel()"
                          :related-station="relatedStation"
                          :hideout-level="props.need.hideoutModule.level"
                          :show-station-link="false"
                        />
                      </template>
                    </div>
                    <!-- Item count actions -->
                    <div
                      v-if="!selfCompletedNeed"
                      class="mx-2 mt-4 mb-4 flex w-full flex-col items-center justify-center"
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
                        <ToggleButton
                          :is-active="isCollected"
                          variant="collect"
                          size="lg"
                          :tooltip="
                            isCollected
                              ? t('page.neededitems.collected')
                              : t('page.neededitems.mark_as_collected')
                          "
                          :aria-label="
                            isCollected
                              ? t('page.neededitems.collected')
                              : t('page.neededitems.mark_as_collected')
                          "
                          :active-icon="'i-mdi-check-circle'"
                          :inactive-icon="'i-mdi-check-circle-outline'"
                          @toggle="$emit('toggleCount')"
                        />
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
                    <div v-else class="mx-2 mt-4 mb-4 flex w-full items-center justify-center">
                      <span class="text-success-600 dark:text-success-400 text-lg font-bold">
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
                    :show-station-link="false"
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
                  <ToggleButton
                    :is-active="isCollected"
                    variant="collect"
                    size="md"
                    :tooltip="
                      isCollected
                        ? t('page.neededitems.collected')
                        : t('page.neededitems.mark_as_collected')
                    "
                    :aria-label="
                      isCollected
                        ? t('page.neededitems.collected')
                        : t('page.neededitems.mark_as_collected')
                    "
                    :active-icon="'i-mdi-check-circle'"
                    :inactive-icon="'i-mdi-check-circle-outline'"
                    @toggle="$emit('toggleCount')"
                  />
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
                <span class="text-success-600 dark:text-success-400 text-sm font-semibold">
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
  import { useI18n } from 'vue-i18n';
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
  const { t } = useI18n();
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
      'bg-success-500/20': selfCompletedNeed.value || currentCount.value >= neededCount.value,
      'bg-surface-elevated': !(selfCompletedNeed.value || currentCount.value >= neededCount.value),
    };
  });
  const isSingleItem = computed(() => neededCount.value === 1);
  const isCollected = computed(() => currentCount.value >= neededCount.value);
  defineEmits(['decreaseCount', 'increaseCount', 'toggleCount', 'setCount']);
</script>
