<template>
  <div class="flex max-w-full min-w-0 items-center justify-between overflow-hidden">
    <span v-tooltip="props.task?.name">
      <router-link
        :to="taskHref"
        class="text-accent-700 dark:text-accent-400 hover-effect focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-full pr-2 no-underline"
      >
        <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-800">
          <img
            v-if="traderAvatarSrc"
            :src="traderAvatarSrc"
            :alt="traderAlt"
            class="h-full w-full object-cover"
          />
          <UIcon
            v-else
            name="i-mdi-account-circle"
            class="h-full w-full text-gray-400 dark:text-gray-400"
          />
        </div>
        <img
          v-if="isFactionTask"
          :src="factionImage"
          :alt="factionAlt"
          class="h-4 w-4 shrink-0 object-contain invert dark:invert-0"
        />
        <span class="truncate text-sm font-semibold">
          {{ props.task?.name }}
        </span>
      </router-link>
    </span>
    <a
      v-if="props.showWikiLink"
      :href="props.task.wikiLink"
      target="_blank"
      class="text-accent-400 hover:text-accent-300 flex items-center text-xs whitespace-nowrap"
    >
      <img src="/img/logos/wikilogo.webp" alt="Wiki" class="mr-1 h-6 w-6" />
      <span>{{ t('page.tasks.questcard.wiki') }}</span>
    </a>
  </div>
</template>
<script setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
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
    compact: {
      type: Boolean,
      required: false,
      default: false,
    },
  });
  const { t } = useI18n({ useScope: 'global' });
  const isFactionTask = computed(() => {
    return props.task?.factionName && props.task.factionName !== 'Any';
  });
  const factionImage = computed(() => {
    return `/img/factions/${props.task.factionName}.webp`;
  });
  const factionAlt = computed(() => props.task?.factionName || 'Faction image');
  const traderAlt = computed(() => props.task?.trader?.name || 'Trader');
  const traderAvatarSrc = computed(() => {
    const avatar = props.task?.trader?.imageLink;
    return typeof avatar === 'string' && avatar.trim().length > 0 ? avatar : null;
  });
  const taskHref = computed(() => `/tasks?task=${props.task?.id}&status=all`);
</script>
