<template>
  <div class="flex items-center justify-between">
    <a
      :href="props.task?.wikiLink"
      target="_blank"
      rel="noopener noreferrer"
      class="text-primary-400 hover:text-primary-300 flex items-center no-underline"
    >
      <div class="mr-2 h-12 w-12 overflow-hidden rounded-full">
        <img :src="traderAvatar" class="h-full w-full object-cover" />
      </div>
      <template v-if="isFactionTask">
        <div class="ml-2 h-12 w-12 rounded-none">
          <img :src="factionImage" class="h-full w-full object-contain invert" />
        </div>
      </template>
      <span class="ml-2 text-xl font-bold">
        {{ props.task?.name }}
      </span>
    </a>
    <a
      v-if="props.showWikiLink"
      :href="props.task.wikiLink"
      target="_blank"
      class="text-primary-400 hover:text-primary-300 flex items-center text-xs whitespace-nowrap"
    >
      <UIcon name="i-mdi-information-outline" class="mr-1 h-6 w-6" />
      <span>{{ t('page.tasks.questcard.wiki') }}</span>
    </a>
  </div>
</template>
<script setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  // Define the props for the component
  const props = defineProps({
    task: {
      type: Object,
      required: true,
    },
    showWikiLink: {
      type: Boolean,
      required: false,
      default: false,
    },
  });
  const { t } = useI18n({ useScope: 'global' });
  // Check if there are two faction tasks for this task
  const isFactionTask = computed(() => {
    return props.task?.factionName != 'Any';
  });
  const factionImage = computed(() => {
    return `/img/factions/${props.task.factionName}.webp`;
  });
  const traderAvatar = computed(() => {
    return props.task?.trader?.imageLink;
  });
</script>
