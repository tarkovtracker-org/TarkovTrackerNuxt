<template>
  <div class="flex items-center gap-1">
    <div class="flex items-center rounded-md border border-white/10 bg-white/5">
      <AppTooltip :text="t('page.tasks.questcard.decrease', 'Decrease')">
        <span class="inline-flex">
          <button
            type="button"
            :disabled="disabled || currentCount <= 0"
            :aria-label="t('page.tasks.questcard.decrease', 'Decrease')"
            class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-l-md text-gray-300 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            @click="$emit('decrease')"
          >
            <UIcon name="i-mdi-minus" aria-hidden="true" class="h-4 w-4" />
          </button>
        </span>
      </AppTooltip>
      <!-- Editable count display -->
      <div
        v-if="!isEditing"
        class="flex h-7 min-w-14 cursor-pointer items-center justify-center px-2 text-[11px] font-semibold text-gray-100 tabular-nums hover:bg-white/10"
        :title="t('page.tasks.questcard.clickToEdit', 'Click to edit')"
        @click="startEditing"
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
          class="focus:border-primary-500 h-6 w-10 rounded border border-white/20 bg-white/10 px-1 text-center text-[11px] font-semibold text-gray-100 tabular-nums focus:outline-none"
          @blur="commitEdit"
          @keydown.enter="commitEdit"
          @keydown.escape="cancelEdit"
        />
        <span class="text-[11px] font-semibold text-gray-100">/{{ neededCount }}</span>
      </div>
      <AppTooltip :text="t('page.tasks.questcard.increase', 'Increase')">
        <span class="inline-flex">
          <button
            type="button"
            :disabled="disabled || currentCount >= neededCount"
            :aria-label="t('page.tasks.questcard.increase', 'Increase')"
            class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-r-md text-gray-300 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            @click="$emit('increase')"
          >
            <UIcon name="i-mdi-plus" aria-hidden="true" class="h-4 w-4" />
          </button>
        </span>
      </AppTooltip>
    </div>
    <AppTooltip
      :text="
        currentCount >= neededCount
          ? t('page.tasks.questcard.complete', 'Complete')
          : t('page.tasks.questcard.markComplete', 'Mark complete')
      "
    >
      <button
        type="button"
        :disabled="disabled"
        class="focus-visible:ring-primary-500 focus-visible:ring-offset-surface-900 flex h-7 w-7 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        :aria-label="
          currentCount >= neededCount
            ? t('page.tasks.questcard.complete', 'Complete')
            : t('page.tasks.questcard.markComplete', 'Mark complete')
        "
        :aria-pressed="currentCount >= neededCount"
        :class="
          currentCount >= neededCount
            ? 'bg-success-600 border-success-500 hover:bg-success-500 text-white'
            : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
        "
        @click="$emit('toggle')"
      >
        <UIcon name="i-mdi-check" aria-hidden="true" class="h-4 w-4" />
      </button>
    </AppTooltip>
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
