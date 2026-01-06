<template>
  <div
    class="flex h-full flex-col rounded-lg shadow-sm transition-all duration-200"
    :class="cardClasses"
  >
    <!-- Top section: Image (left) + Content (right) -->
    <div class="flex items-stretch">
      <!-- Item image - fills top-left corner -->
      <div class="relative h-24 w-24 shrink-0 overflow-hidden rounded-tl-lg">
        <GameItem :item="groupedItem.item" :is-visible="true" size="fluid" simple-mode />
      </div>
      <!-- Item name + Total - with padding -->
      <div class="flex min-w-0 flex-1 flex-col justify-center p-2">
        <div class="flex min-w-0 items-start gap-1">
          <div
            class="text-content-primary line-clamp-2 min-w-0 text-sm leading-tight font-semibold"
          >
            {{ groupedItem.item.name }}
          </div>
          <button
            v-if="isCraftable"
            v-tooltip="craftableTitle"
            type="button"
            class="inline-flex"
            @click.stop="goToCraftStation"
          >
            <UIcon
              name="i-mdi-hammer-wrench"
              class="h-4 w-4 opacity-90"
              :class="craftableIconClass"
            />
          </button>
        </div>
        <div class="mt-1 flex items-center gap-1">
          <span
            class="text-xl font-bold"
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
      class="gap-px text-xs"
      :class="activeFilter === 'tasks' || activeFilter === 'hideout' ? '' : 'grid grid-cols-2'"
    >
      <!-- Tasks section -->
      <div v-if="activeFilter !== 'hideout'" class="p-2">
        <div
          v-if="activeFilter === 'all' || activeFilter === 'completed'"
          class="text-content-tertiary mb-1.5 flex items-center gap-1.5"
        >
          <UIcon name="i-mdi-clipboard-list" class="h-3.5 w-3.5 opacity-70" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Tasks</span>
        </div>
        <div class="flex gap-3">
          <div v-if="groupedItem.taskFir > 0" class="flex items-center gap-1">
            <span v-tooltip="$t('neededitems.fir_required')" class="inline-flex items-center">
              <UIcon
                name="i-mdi-checkbox-marked-circle-outline"
                class="h-3.5 w-3.5"
                :class="
                  groupedItem.taskFirCurrent >= groupedItem.taskFir
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-content-primary'
                "
              />
            </span>
            <span
              class="font-semibold"
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
              class="h-3.5 w-3.5"
              :class="
                groupedItem.taskNonFirCurrent >= groupedItem.taskNonFir
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-content-tertiary'
              "
            />
            <span
              class="font-semibold"
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
            class="text-content-tertiary"
          >
            -
          </span>
        </div>
      </div>
      <!-- Hideout section -->
      <div v-if="activeFilter !== 'tasks'" class="p-2">
        <div
          v-if="activeFilter === 'all' || activeFilter === 'completed'"
          class="text-content-tertiary mb-1.5 flex items-center gap-1.5"
        >
          <UIcon name="i-mdi-home" class="h-3.5 w-3.5 opacity-70" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Hideout</span>
        </div>
        <div class="flex gap-3">
          <div v-if="groupedItem.hideoutFir > 0" class="flex items-center gap-1">
            <span v-tooltip="$t('neededitems.fir_required')" class="inline-flex items-center">
              <UIcon
                name="i-mdi-checkbox-marked-circle-outline"
                class="h-3.5 w-3.5"
                :class="
                  groupedItem.hideoutFirCurrent >= groupedItem.hideoutFir
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-content-primary'
                "
              />
            </span>
            <span
              class="font-semibold"
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
              class="h-3.5 w-3.5"
              :class="
                groupedItem.hideoutNonFirCurrent >= groupedItem.hideoutNonFir
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-content-tertiary'
              "
            />
            <span
              class="font-semibold"
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
            class="text-content-tertiary"
          >
            -
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
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
  const { isCraftable, craftableIconClass, craftableTitle, goToCraftStation } =
    useCraftableItem(itemId);
</script>
