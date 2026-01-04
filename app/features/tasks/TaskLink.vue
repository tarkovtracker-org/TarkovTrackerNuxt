<template>
  <div class="flex max-w-full min-w-0 items-center justify-between overflow-hidden">
    <span v-tooltip="props.task?.name">
      <router-link
        :to="taskHref"
        class="text-accent-400 hover:text-accent-300 flex min-w-0 items-center overflow-hidden no-underline"
      >
        <div
          class="shrink-0 overflow-hidden rounded-full"
          :class="compact ? 'h-4 w-4 sm:h-5 sm:w-5 lg:h-8 lg:w-8' : 'h-8 w-8 lg:h-12 lg:w-12'"
        >
          <img :src="traderAvatarSrc" :alt="traderAlt" class="h-full w-full object-cover" />
        </div>
        <template v-if="isFactionTask">
          <div
            class="ml-0.5 shrink-0 rounded-none"
            :class="compact ? 'h-4 w-4 sm:h-5 sm:w-5 lg:h-8 lg:w-8' : 'h-8 w-8 lg:h-12 lg:w-12'"
          >
            <img
              :src="factionImage"
              :alt="factionAlt"
              class="h-full w-full object-contain invert dark:invert-0"
            />
          </div>
        </template>
        <span
          class="ml-1 truncate font-bold"
          :class="compact ? 'hidden text-xs lg:inline lg:text-sm' : 'text-sm lg:text-xl'"
        >
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
    return props.task?.factionName != 'Any';
  });
  const factionImage = computed(() => {
    return `/img/factions/${props.task.factionName}.webp`;
  });
  const factionAlt = computed(() => props.task?.factionName || 'Faction image');
  const traderAlt = computed(() => props.task?.trader?.name || 'Trader');
  const fallbackAvatar = '/img/default-avatar.svg';
  const traderAvatarSrc = computed(() => {
    const avatar = props.task?.trader?.imageLink;
    return typeof avatar === 'string' && avatar.trim().length > 0 ? avatar : fallbackAvatar;
  });
  const taskHref = computed(() => `/tasks?task=${props.task?.id}&status=all`);
</script>
