<template>
  <div class="block">
    <template v-if="!isComplete && !isLocked">
      <ActionButton
        :xs="xs"
        color="success"
        icon="mdi-check-all"
        :text="t('page.tasks.questcard.completebutton').toUpperCase()"
        :ui="completeButtonUi"
        @click="$emit('complete')"
      />
      <AlternativesList
        v-if="task.alternatives?.length"
        :alternatives="task.alternatives"
        :tasks="tasks"
      />
    </template>
    <template v-else-if="isComplete">
      <ActionButton
        :xs="xs"
        color="accent"
        icon="mdi-undo"
        :text="t('page.tasks.questcard.incompletebutton')"
        @click="$emit('uncomplete')"
      />
      <AlternativesList
        v-if="task.alternatives?.length"
        :alternatives="task.alternatives"
        :tasks="tasks"
        :label="t('page.tasks.questcard.alternativefailed')"
      />
    </template>
    <template v-else-if="!isOurFaction">
      {{ t('page.tasks.questcard.differentfaction') }}
    </template>
    <template v-else-if="isLocked">
      <div :class="xs ? 'flex justify-center' : ''">
        <ActionButton
          :xs="xs"
          color="accent"
          icon="mdi-fast-forward"
          :text="t('page.tasks.questcard.availablebutton')"
          :size="xs ? 'small' : 'x-large'"
          class="mx-1 my-1"
          @click="$emit('unlock')"
        />
        <ActionButton
          :xs="xs"
          color="success"
          icon="mdi-check-all"
          :text="t('page.tasks.questcard.completebutton').toUpperCase()"
          :ui="completeButtonUi"
          :size="xs ? 'small' : 'x-large'"
          class="mx-1 my-1"
          @click="$emit('complete')"
        />
      </div>
    </template>
    <!-- Experience rewards -->
    <div
      v-if="preferencesStore.getShowExperienceRewards && task.experience"
      class="mt-2 flex items-center justify-end gap-1 text-sm text-gray-400"
    >
      <UIcon name="i-mdi-star" class="h-4 w-4 text-yellow-500" />
      <span>{{ formatNumber(task.experience) }} XP</span>
    </div>
  </div>
</template>
<script setup>
  import { defineAsyncComponent } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  const ActionButton = defineAsyncComponent(() => import('./ActionButton'));
  const AlternativesList = defineAsyncComponent(() => import('./AlternativesList'));
  const { t } = useI18n({ useScope: 'global' });
  const preferencesStore = usePreferencesStore();
  const formatNumber = useLocaleNumberFormatter();
  const completeButtonUi = {
    base: 'badge-soft-success font-semibold',
  };
  defineProps({
    task: { type: Object, required: true },
    tasks: { type: Object, required: true },
    xs: { type: Boolean, required: true },
    isComplete: { type: Boolean, required: true },
    isLocked: { type: Boolean, required: true },
    isOurFaction: { type: Boolean, required: true },
  });
  defineEmits(['complete', 'uncomplete', 'unlock']);
</script>
