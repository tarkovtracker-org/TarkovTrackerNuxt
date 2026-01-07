<template>
  <div
    class="flex h-full flex-col rounded-lg shadow-sm transition-all duration-200"
    :class="cardClasses"
  >
    <!-- Top section: Image (left) + Content (right) -->
    <div class="flex items-stretch">
      <!-- Item image - fills top-left corner -->
      <div class="relative h-24 w-24 shrink-0 overflow-hidden rounded-tl-lg">
        <ItemStatusBadge
          :current-count="groupedItem.currentCount"
          :needed-count="groupedItem.total"
          :is-complete="isComplete"
          :found-in-raid="groupedItem.taskFir > 0 || groupedItem.hideoutFir > 0"
          :is-craftable="isCraftable"
          :is-craftable-available="isCraftableAvailable"
          :is-kappa-required="false"
          :show-count="false"
          size="md"
        />
        <GameItem :item="groupedItem.item" :is-visible="true" size="fluid" simple-mode />
      </div>
      <div class="flex min-w-0 flex-1 flex-col justify-center p-3">
        <div class="text-content-primary line-clamp-2 min-w-0 text-sm leading-tight font-semibold">
          {{ groupedItem.item.name }}
        </div>
        <div class="mt-1 flex items-center gap-1">
          <span
            class="text-lg font-bold"
            :class="
              isComplete
                ? 'text-success-600 dark:text-success-400'
                : 'text-accent-600 dark:text-accent-400'
            "
          >
            {{ formatCompactNumber(groupedItem.currentCount) }}/{{
              formatCompactNumber(groupedItem.total)
            }}
          </span>
        </div>
      </div>
    </div>
    <!-- Breakdown grid -->
    <div
      v-if="activeFilter === 'all' || activeFilter === 'completed'"
      class="bg-divider gap-px overflow-hidden rounded-b-[calc(var(--ui-radius)*1.5-1px)]"
      :class="activeFilter === 'all' || activeFilter === 'completed' ? 'grid grid-cols-2' : ''"
    >
      <!-- Tasks section -->
      <div v-if="activeFilter !== 'hideout'" class="bg-surface-elevated flex flex-col gap-1 p-2">
        <div
          v-if="activeFilter === 'all' || activeFilter === 'completed'"
          class="text-content-tertiary flex items-center gap-1"
        >
          <UIcon name="i-mdi-clipboard-list" class="h-4 w-4 opacity-70" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Tasks</span>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="groupedItem.taskFir > 0" class="flex items-center gap-1">
            <span v-tooltip="$t('neededitems.fir_required')" class="inline-flex items-center">
              <UIcon
                name="i-mdi-checkbox-marked-circle-outline"
                class="h-4 w-4"
                :class="
                  groupedItem.taskFirCurrent >= groupedItem.taskFir
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-content-secondary'
                "
              />
            </span>
            <span
              class="text-sm font-semibold whitespace-nowrap"
              :class="
                groupedItem.taskFirCurrent >= groupedItem.taskFir
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-content-primary'
              "
            >
              {{ groupedItem.taskFirCurrent }}/{{ groupedItem.taskFir }}
            </span>
          </div>
          <div v-if="groupedItem.taskNonFir > 0" class="flex items-center gap-1">
            <UIcon
              name="i-mdi-checkbox-blank-circle-outline"
              class="h-4 w-4"
              :class="
                groupedItem.taskNonFirCurrent >= groupedItem.taskNonFir
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-content-tertiary'
              "
            />
            <span
              class="text-sm font-semibold whitespace-nowrap"
              :class="
                groupedItem.taskNonFirCurrent >= groupedItem.taskNonFir
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-content-primary'
              "
            >
              {{ groupedItem.taskNonFirCurrent }}/{{ groupedItem.taskNonFir }}
            </span>
          </div>
          <span
            v-if="groupedItem.taskFir === 0 && groupedItem.taskNonFir === 0"
            class="text-content-tertiary text-xs"
          >
            -
          </span>
        </div>
      </div>
      <!-- Hideout section -->
      <div v-if="activeFilter !== 'tasks'" class="bg-surface-elevated flex flex-col gap-1 p-2">
        <div
          v-if="activeFilter === 'all' || activeFilter === 'completed'"
          class="text-content-tertiary flex items-center gap-1"
        >
          <UIcon name="i-mdi-home" class="h-4 w-4 opacity-70" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Hideout</span>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="groupedItem.hideoutFir > 0" class="flex items-center gap-1">
            <span v-tooltip="$t('neededitems.fir_required')" class="inline-flex items-center">
              <UIcon
                name="i-mdi-checkbox-marked-circle-outline"
                class="h-4 w-4"
                :class="
                  groupedItem.hideoutFirCurrent >= groupedItem.hideoutFir
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-content-secondary'
                "
              />
            </span>
            <span
              class="text-sm font-semibold whitespace-nowrap"
              :class="
                groupedItem.hideoutFirCurrent >= groupedItem.hideoutFir
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-content-primary'
              "
            >
              {{ groupedItem.hideoutFirCurrent }}/{{ groupedItem.hideoutFir }}
            </span>
          </div>
          <div v-if="groupedItem.hideoutNonFir > 0" class="flex items-center gap-1">
            <UIcon
              name="i-mdi-checkbox-blank-circle-outline"
              class="h-4 w-4"
              :class="
                groupedItem.hideoutNonFirCurrent >= groupedItem.hideoutNonFir
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-content-tertiary'
              "
            />
            <span
              class="text-sm font-semibold whitespace-nowrap"
              :class="
                groupedItem.hideoutNonFirCurrent >= groupedItem.hideoutNonFir
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-content-primary'
              "
            >
              {{ groupedItem.hideoutNonFirCurrent }}/{{ groupedItem.hideoutNonFir }}
            </span>
          </div>
          <span
            v-if="groupedItem.hideoutFir === 0 && groupedItem.hideoutNonFir === 0"
            class="text-content-tertiary text-xs"
          >
            -
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import GameItem from '@/components/ui/GameItem.vue';
  import ItemStatusBadge from '@/components/ui/ItemStatusBadge.vue';
  import { useCraftableItem } from '@/composables/useCraftableItem';
  import { formatCompactNumber } from '@/utils/formatters';
  interface GroupedItem {
    itemId: string;
    item: {
      id: string;
      name: string;
      iconLink?: string;
      image512pxLink?: string;
      wikiLink?: string;
      link?: string;
      backgroundColor?: string;
    };
    taskFir: number;
    taskFirCurrent: number;
    taskNonFir: number;
    taskNonFirCurrent: number;
    hideoutFir: number;
    hideoutFirCurrent: number;
    hideoutNonFir: number;
    hideoutNonFirCurrent: number;
    total: number;
    currentCount: number;
  }
  const props = defineProps<{
    groupedItem: GroupedItem;
    activeFilter?: 'all' | 'tasks' | 'hideout' | 'completed';
  }>();
  const itemId = computed(() => props.groupedItem.itemId);
  const isComplete = computed(() => {
    return props.groupedItem.currentCount >= props.groupedItem.total;
  });
  const cardClasses = computed(() => {
    return {
      'bg-success-500/20': isComplete.value,
      'bg-surface-elevated': !isComplete.value,
    };
  });
  const { isCraftable, isCraftableAvailable, craftableTitle, goToCraftStation } =
    useCraftableItem(itemId);
</script>
