<template>
  <div
    class="flex max-w-full min-w-0 items-center justify-between overflow-hidden"
    :class="{ 'gap-2': !props.compact, 'gap-1': props.compact }"
  >
    <span v-tooltip="props.task?.name" class="min-w-0 flex-1">
      <router-link
        :to="taskHref"
        class="text-accent-700 dark:text-accent-400 hover-effect focus-ring flex min-w-0 items-center rounded-full pr-2 no-underline"
        :class="{
          'gap-2': !props.compact,
          'gap-1.5': props.compact,
        }"
      >
        <div
          class="shrink-0 overflow-hidden rounded-full bg-gray-800"
          :class="{
            'h-9 w-9': !props.compact,
            'h-5 w-5': props.compact,
          }"
        >
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
          class="shrink-0 object-contain invert dark:invert-0"
          :class="{
            'h-4 w-4': !props.compact,
            'h-3 w-3': props.compact,
          }"
        />
        <span
          class="truncate font-semibold"
          :class="{
            'text-sm': !props.compact,
            'text-xs': props.compact,
          }"
        >
          {{ props.task?.name }}
        </span>
      </router-link>
    </span>
    <a
      v-if="props.showWikiLink && !props.compact"
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
