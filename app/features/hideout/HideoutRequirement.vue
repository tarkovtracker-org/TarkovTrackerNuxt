<template>
  <!-- Compact Card Layout - Works for ALL items -->
  <div
    class="group hover-effect relative flex h-full cursor-pointer flex-col items-center justify-center rounded-lg border p-2 transition-all select-none"
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
      <!-- Image Area - relative container for overlays -->
      <div class="relative">
        <GameItem :item="requirement.item" size="small" :show-actions="false" simple-mode />
        <!-- Complete Checkmark Overlay -->
        <div
          v-if="isComplete"
          class="bg-success-500/10 absolute inset-0 z-20 flex items-center justify-center rounded"
        >
          <UIcon name="i-mdi-check-circle" class="text-success-500/50 h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <!-- Status Badge Overlay -->
        <ItemStatusBadge
          :current-count="currentCount"
          :needed-count="requiredCount"
          :is-complete="isComplete"
          :found-in-raid="isFoundInRaid"
          :is-craftable="isItemCraftable"
          :is-craftable-available="isItemCraftableAvailable"
          :show-count="requiredCount > 1"
          size="sm"
        />
      </div>
      <!-- Item Name -->
      <div
        class="text-content-primary line-clamp-2 w-full px-1 text-center text-[10px] leading-tight font-medium sm:text-xs"
      >
        {{ requirement.item.name }}
      </div>
    </div>
  </div>
  <!-- Context Menu for Manual Count Adjustment -->
  <ContextMenu ref="contextMenu">
    <template #default="{ close }">
      <div class="border-base text-content-tertiary border-b px-2 py-1 text-xs font-medium">
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
              class="border-primary-500 w-20 rounded border bg-gray-700 px-2 py-1 text-center text-sm font-bold"
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
  import ItemStatusBadge from '@/components/ui/ItemStatusBadge.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { useProgressStore } from '@/stores/useProgress';
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
  const metadataStore = useMetadataStore();
  const progressStore = useProgressStore();
  const inputRef = ref<HTMLInputElement | null>(null);
  const editValue = ref(0);
  // Check if item requires Found in Raid status
  const isFoundInRaid = computed(() => {
    const firAttribute = props.requirement.attributes?.find(
      (attr) => attr.type === 'foundInRaid' || attr.name === 'foundInRaid'
    );
    return firAttribute?.value === 'true';
  });
  // Check if item is craftable
  const getCraftSources = computed(() => {
    return metadataStore.craftSourcesByItemId.get(props.requirement.item.id) ?? [];
  });
  const isItemCraftable = computed(() => getCraftSources.value.length > 0);
  const isItemCraftableAvailable = computed(() => {
    return getCraftSources.value.some((source) => {
      const currentLevel = progressStore.hideoutLevels?.[source.stationId]?.self ?? 0;
      return currentLevel >= source.stationLevel;
    });
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
