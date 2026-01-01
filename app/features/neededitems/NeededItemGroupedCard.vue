<template>
  <div class="flex h-full flex-col rounded-lg border border-base bg-surface-elevated shadow-sm">
    <!-- Top section: Image + Name side by side -->
    <div class="flex items-center gap-3 p-3">
      <!-- Item image -->
      <div class="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-surface-base">
        <GameItem
          :src="groupedItem.item.image512pxLink || groupedItem.item.iconLink"
          :item-name="groupedItem.item.name"
          :wiki-link="groupedItem.item.wikiLink"
          :dev-link="groupedItem.item.link"
          :is-visible="true"
          :background-color="groupedItem.item.backgroundColor || 'grey'"
          size="small"
          simple-mode
          fill
          class="h-full w-full"
        />
      </div>
      <!-- Item name + Total -->
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-start gap-1">
          <div class="line-clamp-2 min-w-0 text-sm leading-tight font-semibold text-content-primary">
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
          <span class="text-xs text-content-tertiary">Total:</span>
          <span
            class="text-lg font-bold"
            :class="isComplete ? 'text-success-400 dark:text-success-400' : 'text-primary-400 dark:text-primary-400'"
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
      class="gap-px border-t border-base text-xs"
      :class="activeFilter === 'tasks' || activeFilter === 'hideout' ? '' : 'grid grid-cols-2 divide-x divide-base'"
    >
      <!-- Tasks section -->
      <div v-if="activeFilter !== 'hideout'" class="p-2">
        <div v-if="activeFilter === 'all' || activeFilter === 'completed'" class="mb-1.5 flex items-center gap-1 text-content-tertiary">
          <UIcon name="i-mdi-clipboard-list" class="h-3.5 w-3.5" />
          <span class="font-medium">Tasks</span>
        </div>
        <div class="flex gap-3">
          <div v-if="groupedItem.taskFir > 0" class="flex items-center gap-1">
              <UIcon
                v-tooltip="'Found in Raid required'"
                name="i-mdi-checkbox-marked-circle-outline"
                class="h-3 w-3"
                :class="
                  groupedItem.taskFirCurrent >= groupedItem.taskFir
                    ? 'text-success-400 dark:text-success-400'
                    : 'text-content-primary'
                "
              />
            <span
              class="font-semibold"
              :class="
                groupedItem.taskFirCurrent >= groupedItem.taskFir
                  ? 'text-success-400 dark:text-success-400'
                  : 'text-content-primary'
              "
            >
              {{ groupedItem.taskFirCurrent }}/{{ groupedItem.taskFir }}
            </span>
          </div>
          <div v-if="groupedItem.taskNonFir > 0" class="flex items-center gap-1">
            <UIcon
              name="i-mdi-checkbox-blank-circle-outline"
              class="h-3 w-3"
              :class="
                groupedItem.taskNonFirCurrent >= groupedItem.taskNonFir
                  ? 'text-success-400 dark:text-success-400'
                  : 'text-content-tertiary'
              "
            />
            <span
              class="font-semibold"
              :class="
                groupedItem.taskNonFirCurrent >= groupedItem.taskNonFir
                  ? 'text-success-400 dark:text-success-400'
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
        <div v-if="activeFilter === 'all' || activeFilter === 'completed'" class="mb-1.5 flex items-center gap-1 text-content-tertiary">
          <UIcon name="i-mdi-home" class="h-3.5 w-3.5" />
          <span class="font-medium">Hideout</span>
        </div>
        <div class="flex gap-3">
          <div v-if="groupedItem.hideoutFir > 0" class="flex items-center gap-1">
              <UIcon
                v-tooltip="'Found in Raid required'"
                name="i-mdi-checkbox-marked-circle-outline"
                class="h-3 w-3"
                :class="
                  groupedItem.hideoutFirCurrent >= groupedItem.hideoutFir
                    ? 'text-success-400 dark:text-success-400'
                    : 'text-content-primary'
                "
              />
            <span
              class="font-semibold"
              :class="
                groupedItem.hideoutFirCurrent >= groupedItem.hideoutFir
                  ? 'text-success-400 dark:text-success-400'
                  : 'text-content-primary'
              "
            >
              {{ groupedItem.hideoutFirCurrent }}/{{ groupedItem.hideoutFir }}
            </span>
          </div>
          <div v-if="groupedItem.hideoutNonFir > 0" class="flex items-center gap-1">
            <UIcon
              name="i-mdi-checkbox-blank-circle-outline"
              class="h-3 w-3"
              :class="
                groupedItem.hideoutNonFirCurrent >= groupedItem.hideoutNonFir
                  ? 'text-success-400 dark:text-success-400'
                  : 'text-content-tertiary'
              "
            />
            <span
              class="font-semibold"
              :class="
                groupedItem.hideoutNonFirCurrent >= groupedItem.hideoutNonFir
                  ? 'text-success-400 dark:text-success-400'
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
  const { isCraftable, craftableIconClass, craftableTitle, goToCraftStation } =
    useCraftableItem(itemId);
</script>
