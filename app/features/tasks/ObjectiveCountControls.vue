<template>
  <div class="flex items-center gap-1">
    <div class="flex items-center rounded-md border border-gray-300 bg-white dark:border-white/10 dark:bg-white/5">
      <span
        v-tooltip="t('page.tasks.questcard.decrease', 'Decrease')"
        class="inline-flex"
        :class="{ 'cursor-not-allowed': disabled || currentCount <= 0 }"
        @click.stop
      >
        <button
          type="button"
          :disabled="disabled || currentCount <= 0"
          :aria-label="t('page.tasks.questcard.decrease', 'Decrease')"
          class="focus-visible:ring-accent-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-l-md text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 active:bg-gray-200 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/10 dark:active:bg-white/15"
          @click="$emit('decrease')"
        >
          <UIcon name="i-mdi-minus" aria-hidden="true" class="h-4 w-4" />
        </button>
      </span>
      <!-- Editable count display -->
      <div
        v-if="!isEditing"
        class="flex h-7 min-w-14 items-center justify-center px-2 text-[11px] font-semibold tabular-nums text-gray-900 dark:text-gray-100"
        :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10'"
        :title="t('page.tasks.questcard.clickToEdit', 'Click to edit')"
        @click.stop="startEditing"
      >
        {{ currentCount }}/{{ neededCount }}
      </div>
      <!-- Input for editing -->
      <div v-else class="flex h-7 min-w-14 items-center justify-center px-1">
        <input
          ref="inputRef"
          v-model="editValue"
          type="number"
          :min="0"
          :max="neededCount"
          class="focus:border-accent-500 h-6 w-10 rounded border border-gray-300 bg-white px-1 text-center text-[11px] font-semibold text-gray-900 tabular-nums focus:outline-none dark:border-white/20 dark:bg-white/10 dark:text-gray-100"
          @blur="commitEdit"
          @keydown.enter="commitEdit"
          @keydown.escape="cancelEdit"
        />
        <span class="text-[11px] font-semibold text-gray-900 dark:text-gray-100">/{{ neededCount }}</span>
      </div>
      <span
        v-tooltip="t('page.tasks.questcard.increase', 'Increase')"
        class="inline-flex"
        :class="{ 'cursor-not-allowed': disabled || currentCount >= neededCount }"
        @click.stop
      >
        <button
          type="button"
          :disabled="disabled || currentCount >= neededCount"
          :aria-label="t('page.tasks.questcard.increase', 'Increase')"
          class="focus-visible:ring-accent-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-r-md text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 active:bg-gray-200 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/10 dark:active:bg-white/15"
          @click="$emit('increase')"
        >
          <UIcon name="i-mdi-plus" aria-hidden="true" class="h-4 w-4" />
        </button>
      </span>
    </div>
      <span
        v-tooltip="
          currentCount >= neededCount
            ? t('page.tasks.questcard.complete', 'Complete')
            : t('page.tasks.questcard.markComplete', 'Mark complete')
        "
        class="inline-flex"
        :class="{ 'cursor-not-allowed': disabled }"
        @click.stop
      >
        <button
          type="button"
          :disabled="disabled"
          class="focus-visible:ring-accent-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60"
          :aria-label="
            currentCount >= neededCount
              ? t('page.tasks.questcard.complete', 'Complete')
              : t('page.tasks.questcard.markComplete', 'Mark complete')
          "
          :aria-pressed="currentCount >= neededCount"
          :class="
            currentCount >= neededCount
              ? 'badge-soft-success'
              : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
          "
          @click="$emit('toggle')"
        >
          <UIcon name="i-mdi-check" aria-hidden="true" class="h-4 w-4" />
        </button>
      </span>
  </div>
</template>
<script setup lang="ts">
  import { ref, nextTick } from 'vue';
  import { useI18n } from 'vue-i18n';
  const props = defineProps<{
    currentCount: number;
    neededCount: number;
    disabled?: boolean;
  }>();
  const emit = defineEmits<{
    decrease: [];
    increase: [];
    toggle: [];
    'set-count': [value: number];
  }>();
  const { t } = useI18n({ useScope: 'global' });
  // Editing state
  const isEditing = ref(false);
  const editValue = ref('');
  const inputRef = ref<HTMLInputElement | null>(null);
  /**
   * Start editing mode - show input and focus it
   */
  const startEditing = () => {
    if (props.disabled) return;
    editValue.value = String(props.currentCount);
    isEditing.value = true;
    nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  };
  /**
   * Commit the edit - validate and emit the new value
   */
  const commitEdit = () => {
    const parsed = parseInt(editValue.value, 10);
    // Validate: must be a number between 0 and neededCount
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(props.neededCount, parsed));
      // Only emit if value actually changed
      if (clamped !== props.currentCount) {
        emit('set-count', clamped);
      }
    }
    isEditing.value = false;
  };
  /**
   * Cancel editing - revert to original value
   */
  const cancelEdit = () => {
    isEditing.value = false;
  };
</script>
