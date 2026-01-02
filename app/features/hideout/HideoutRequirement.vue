<template>
  <!-- Compact Card Layout - Works for ALL items -->
  <div
    class="group relative flex h-full cursor-pointer flex-col items-center justify-center rounded-lg border p-2 transition-all select-none hover:bg-surface-elevated/50"
    :class="[
      isComplete
        ? 'border-success-400 bg-success-50 dark:border-success-500/30 dark:bg-success-900/10'
        : 'border-base bg-surface-floating',
    ]"
    @click="toggleComplete"
    @contextmenu.prevent="openContextMenu"
  >
    <!-- Content Cluster -->
    <div class="flex h-full w-full flex-col items-center gap-1 pt-1">
      <!-- Image Area -->
      <div class="relative flex h-16 w-full shrink-0 items-center justify-center sm:h-20">
        <GameItem
          :item="requirement.item"
          size="small"
          :show-actions="false"
          simple-mode
          fill
        />
        <!-- Complete Checkmark Overlay -->
        <div
          v-if="isComplete"
          class="bg-success-500/10 absolute inset-0 flex items-center justify-center rounded-lg"
        >
          <UIcon name="i-mdi-check-circle" class="text-success-500/50 h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <div
          v-if="isFoundInRaid"
          v-tooltip="'Found in Raid required'"
          class="absolute bottom-1 right-1 z-30 flex items-center justify-center rounded bg-warning-500/90 p-px shadow-sm"
        >
          <UIcon name="i-mdi-checkbox-marked-circle-outline" class="text-warning-950 h-3 w-3" />
        </div>
        <!-- Count Badge -->
        <div
          v-if="requiredCount > 1"
          class="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap"
        >
          <div
            class="rounded-md border border-base bg-surface-elevated px-2 py-0.5 text-[10px] font-bold shadow-md"
            :class="isComplete ? 'text-success-600 dark:text-success-400' : 'text-content-secondary'"
          >
            {{ formatNumber(currentCount) }}/{{ formatNumber(requiredCount) }}
          </div>
        </div>
      </div>
      <!-- Item Name -->
      <div
        class="line-clamp-2 w-full px-1 text-center text-[10px] leading-tight font-medium text-content-primary sm:text-xs"
      >
        {{ requirement.item.name }}
      </div>
    </div>
  </div>
  <!-- Context Menu for Manual Count Adjustment -->
  <ContextMenu ref="contextMenu">
    <template #default="{ close }">
      <div
        class="border-b border-base px-2 py-1 text-xs font-medium text-content-tertiary"
      >
        {{ requirement.item.name }}
      </div>
      <ContextMenuItem
        v-if="!isComplete"
        icon="i-mdi-check-circle"
        :label="`Mark Complete (${formatNumber(requiredCount)})`"
        @click="
          markComplete();
          close();
        "
      />
      <ContextMenuItem
        v-if="isComplete"
        icon="i-mdi-close-circle"
        label="Incomplete"
        @click="
          markIncomplete();
          close();
        "
      />
      <div v-if="requiredCount > 1" class="my-1 border-t border-gray-700" />
      <template v-if="requiredCount > 1">
        <div class="space-y-2 px-3 py-2">
          <div class="text-xs text-gray-400">Set Custom Amount:</div>
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-mdi-minus"
              :disabled="currentCount === 0"
              @click.stop="decrementCount"
            />
            <input
              ref="inputRef"
              v-model.number="editValue"
              type="number"
              :min="0"
              :max="requirement.count"
              class="border-primary-500 focus:ring-primary-500 w-20 rounded border bg-gray-700 px-2 py-1 text-center text-sm font-bold focus:ring-1 focus:outline-none"
              :class="isComplete ? 'text-success-400' : 'text-gray-300'"
              @input="handleInput"
              @click.stop
            />
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-mdi-plus"
              :disabled="currentCount >= requirement.count"
              @click.stop="incrementCount"
            />
          </div>
          <UButton
            size="xs"
            color="primary"
            variant="soft"
            block
            @click="
              applyCustomCount();
              close();
            "
          >
            Apply
          </UButton>
        </div>
      </template>
      <div class="my-1 border-t border-gray-700" />
      <ContextMenuItem
        v-if="requirement.item.link"
        icon="/img/logos/tarkovdevlogo.webp"
        label="View on tarkov.dev"
        @click="
          openTarkovDev();
          close();
        "
      />
      <ContextMenuItem
        v-if="requirement.item.wikiLink"
        icon="/img/logos/wikilogo.webp"
        label="View on Wiki"
        @click="
          openWiki();
          close();
        "
      />
    </template>
  </ContextMenu>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import ContextMenu from '@/components/ui/ContextMenu.vue';
  import ContextMenuItem from '@/components/ui/ContextMenuItem.vue';
  import GameItem from '@/components/ui/GameItem.vue';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  interface Props {
    requirement: {
      id: string;
      item: {
        id: string;
        name?: string;
        link?: string | null;
        wikiLink?: string | null;
      };
      count: number;
      attributes?: Array<{
        type: string;
        name: string;
        value: string;
      }>;
    };
    stationId: string;
    level: number;
  }
  const props = defineProps<Props>();
  const tarkovStore = useTarkovStore();
  const formatNumber = useLocaleNumberFormatter();
  const requirementId = computed(() => props.requirement.id);
  const requiredCount = computed(() => props.requirement.count);
  // Context menu
  const contextMenu = ref<InstanceType<typeof ContextMenu>>();
  const inputRef = ref<HTMLInputElement | null>(null);
  const editValue = ref(0);
  // Check if item requires Found in Raid status
  const isFoundInRaid = computed(() => {
    const firAttribute = props.requirement.attributes?.find(
      (attr) => attr.type === 'foundInRaid' || attr.name === 'foundInRaid'
    );
    return firAttribute?.value === 'true';
  });
  // Get current count from store (synced with needed items page)
  const currentCount = computed(() => {
    const storeCount = tarkovStore.getHideoutPartCount(requirementId.value);
    // If marked as complete but no count set, return required count
    if (storeCount === 0 && tarkovStore.isHideoutPartComplete(requirementId.value)) {
      return requiredCount.value;
    }
    return storeCount;
  });
  const isComplete = computed(() => currentCount.value >= requiredCount.value);
  // Watch current count to update edit value
  watch(
    currentCount,
    (newCount) => {
      editValue.value = newCount;
    },
    { immediate: true }
  );
  const clampCount = (value: number) => Math.max(0, Math.min(value, requiredCount.value));
  const setCount = (value: number): void => {
    const clampedValue = clampCount(value);
    tarkovStore.setHideoutPartCount(requirementId.value, clampedValue);
    if (clampedValue >= requiredCount.value) {
      tarkovStore.setHideoutPartComplete(requirementId.value);
    } else {
      tarkovStore.setHideoutPartUncomplete(requirementId.value);
    }
  };
  const incrementCount = (): void => {
    editValue.value = Math.min(editValue.value + 1, requiredCount.value);
  };
  const decrementCount = (): void => {
    editValue.value = Math.max(editValue.value - 1, 0);
  };
  const handleInput = (): void => {
    // Clamp the value as user types
    if (editValue.value > requiredCount.value) {
      editValue.value = requiredCount.value;
    } else if (editValue.value < 0) {
      editValue.value = 0;
    }
  };
  const applyCustomCount = (): void => {
    setCount(editValue.value);
  };
  // Simple toggle between 0% and 100% completion (click on card)
  const toggleComplete = (): void => {
    if (isComplete.value) {
      // Mark as incomplete (set to 0)
      setCount(0);
    } else {
      // Mark as complete (set to required count)
      setCount(requiredCount.value);
    }
  };
  const markComplete = (): void => {
    setCount(requiredCount.value);
  };
  const markIncomplete = (): void => {
    setCount(0);
  };
  const openContextMenu = (event: MouseEvent): void => {
    editValue.value = currentCount.value;
    contextMenu.value?.open(event);
  };
  const openTarkovDev = (): void => {
    if (props.requirement.item.link) {
      window.open(props.requirement.item.link, '_blank');
    }
  };
  const openWiki = (): void => {
    if (props.requirement.item.wikiLink) {
      window.open(props.requirement.item.wikiLink, '_blank');
    }
  };
</script>
