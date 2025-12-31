<template>
  <div class="flex items-center gap-1">
    <!-- Counter controls group with background -->
    <div
      class="flex items-center rounded-md border border-gray-300 bg-white dark:border-white/10 dark:bg-white/5"
    >
      <!-- Decrease button -->
      <AppTooltip text="Decrease count">
        <button
          type="button"
          :disabled="currentCount <= 0"
          class="cursor-pointer focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-l-md text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/10 dark:active:bg-white/15"
          aria-label="Decrease count"
          @click="$emit('decrease')"
        >
          <UIcon name="i-mdi-minus" aria-hidden="true" class="h-4 w-4" />
        </button>
      </AppTooltip>
      <div
        class="flex h-7 min-w-14 items-center justify-center px-2 text-[11px] font-semibold text-gray-900 tabular-nums dark:text-gray-100"
      >
        <template v-if="isEditing">
          <input
            ref="inputRef"
            v-model.number="editValue"
            type="number"
            :min="0"
            :max="neededCount"
            class="h-full w-full bg-transparent px-0.5 text-center text-[11px] font-semibold text-gray-900 focus:outline-none dark:text-gray-100"
            @blur="submitEdit"
            @keydown.enter="submitEdit"
            @keydown.escape="cancelEdit"
          />
        </template>
        <template v-else>
          <AppTooltip text="Click to enter value">
            <button
              class="h-full w-full cursor-pointer px-0.5 text-[11px] font-semibold text-gray-900 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10"
              aria-label="Click to enter value"
              @click="startEditing"
            >
              {{ formatNumber(currentCount) }}/{{ formatNumber(neededCount) }}
            </button>
          </AppTooltip>
        </template>
      </div>
      <!-- Increase button -->
      <AppTooltip text="Increase count">
        <button
          type="button"
          :disabled="currentCount >= neededCount"
          class="cursor-pointer focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-r-md text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/10 dark:active:bg-white/15"
          aria-label="Increase count"
          @click="$emit('increase')"
        >
          <UIcon name="i-mdi-plus" aria-hidden="true" class="h-4 w-4" />
        </button>
      </AppTooltip>
    </div>
    <!-- Mark as 100% complete button -->
    <AppTooltip
      :text="currentCount >= neededCount ? 'Mark as incomplete' : 'Mark as 100% complete'"
    >
      <button
        type="button"
        class="cursor-pointer focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        :aria-label="currentCount >= neededCount ? 'Mark as incomplete' : 'Mark as 100% complete'"
        :class="
          currentCount >= neededCount
            ? 'bg-success-600 border-success-500 hover:bg-success-500 text-white'
            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
        "
        @click="$emit('toggle')"
      >
        <UIcon name="i-mdi-check" aria-hidden="true" class="h-4 w-4" />
      </button>
    </AppTooltip>
  </div>
</template>
<script setup lang="ts">
  import { ref, nextTick, watch } from 'vue';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  const formatNumber = useLocaleNumberFormatter();
  const props = defineProps<{
    currentCount: number;
    neededCount: number;
  }>();
  const emit = defineEmits<{
    decrease: [];
    increase: [];
    toggle: [];
    setCount: [count: number];
  }>();
  const isEditing = ref(false);
  const editValue = ref(0);
  const inputRef = ref<HTMLInputElement | null>(null);
  const startEditing = () => {
    editValue.value = props.currentCount;
    isEditing.value = true;
    nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  };
  const submitEdit = () => {
    if (isEditing.value) {
      // Clamp value between 0 and neededCount
      const clampedValue = Math.max(0, Math.min(editValue.value || 0, props.neededCount));
      emit('setCount', clampedValue);
      isEditing.value = false;
    }
  };
  const cancelEdit = () => {
    isEditing.value = false;
  };
  // Close editing if currentCount changes externally
  watch(
    () => props.currentCount,
    () => {
      if (isEditing.value) {
        isEditing.value = false;
      }
    }
  );
</script>
