<template>
  <li>
    <!-- Internal navigation link - URL includes stored preferences to avoid flash -->
    <component
      :is="linkComponent"
      v-if="props.to && !props.href"
      :to="computedNavUrl"
      class="group flex cursor-pointer items-center rounded-md px-3 py-2.5 text-base font-medium transition-colors duration-150"
      :class="[
        isActive
          ? 'border-l-2 border-accent-500 bg-accent-100 text-accent-900 dark:bg-accent-500/20 dark:text-accent-100'
          : 'border-l-2 border-transparent text-content-secondary hover:bg-surface-200 dark:hover:bg-white/5 hover:text-content-primary',
        props.isCollapsed ? 'justify-center' : '',
      ]"

    >
      <!-- Icon / Avatar -->
      <div
        :class="[props.isCollapsed ? '' : 'mr-3', 'flex w-6 shrink-0 items-center justify-center']"
      >
        <template v-if="props.avatar">
          <NuxtImg :src="props.avatar" class="h-6 w-6 rounded-full" width="24" height="24" />
        </template>
        <template v-else-if="props.icon.startsWith('i-')">
          <UIcon :name="props.icon" class="h-6 w-6 transition-colors" :class="iconClasses" />
        </template>
        <template v-else>
          <span :class="['mdi', props.icon, 'text-2xl']"></span>
        </template>
      </div>
      <!-- Text -->
      <span v-if="!props.isCollapsed" class="truncate">
        <template v-if="props.localeKey">
          {{ t(`navigation_drawer.${props.localeKey}`) }}
        </template>
        <template v-else-if="props.text">
          {{ props.text }}
        </template>
      </span>
    </component>
    <!-- External link -->
    <a
      v-else-if="props.href"
      :href="props.href"
      target="_blank"
      rel="noopener noreferrer"
      class="group flex cursor-pointer items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150"
      :class="[
        'border-l-2 border-transparent text-content-secondary hover:bg-surface-200 dark:hover:bg-white/5 hover:text-content-primary',
        props.isCollapsed ? 'justify-center' : '',
      ]"
      @click="visitHref()"
    >
      <!-- Icon / Avatar -->
      <div
        :class="[props.isCollapsed ? '' : 'mr-3', 'flex w-6 shrink-0 items-center justify-center']"
      >
        <template v-if="props.avatar">
          <NuxtImg :src="props.avatar" class="h-6 w-6 rounded-full" width="24" height="24" />
        </template>
        <template v-else-if="props.icon.startsWith('i-')">
          <UIcon
            :name="props.icon"
            class="h-6 w-6"
            :class="props.iconColor ? `text-${props.iconColor}` : ''"
          />
        </template>
        <template v-else>
          <span :class="['mdi', props.icon, 'text-2xl']"></span>
        </template>
      </div>
      <!-- Text -->
      <span v-if="!props.isCollapsed" class="truncate">
        <template v-if="props.localeKey">
          {{ t(`navigation_drawer.${props.localeKey}`) }}
        </template>
        <template v-else-if="props.text">
          {{ props.text }}
        </template>
      </span>
    </a>
    <!-- Non-link item (fallback) -->
    <div
      v-else
      class="group flex cursor-pointer items-center rounded-md border-l-4 border-transparent px-3 py-2.5 text-base font-medium text-content-tertiary transition-colors duration-200 hover:bg-surface-200 dark:hover:bg-white/5 hover:text-content-primary"
      :class="[props.isCollapsed ? 'justify-center' : '']"
    >
      <!-- Icon / Avatar -->
      <div
        :class="[props.isCollapsed ? '' : 'mr-3', 'flex w-6 shrink-0 items-center justify-center']"
      >
        <template v-if="props.avatar">
          <NuxtImg :src="props.avatar" class="h-6 w-6 rounded-full" width="24" height="24" />
        </template>
        <template v-else-if="props.icon.startsWith('i-')">
          <UIcon
            :name="props.icon"
            class="h-6 w-6"
            :class="props.iconColor ? `text-${props.iconColor}` : ''"
          />
        </template>
        <template v-else>
          <span :class="['mdi', props.icon, 'text-2xl']"></span>
        </template>
      </div>
      <!-- Text -->
      <span v-if="!props.isCollapsed" class="truncate">
        <template v-if="props.localeKey">
          {{ t(`navigation_drawer.${props.localeKey}`) }}
        </template>
        <template v-else-if="props.text">
          {{ props.text }}
        </template>
      </span>
    </div>
  </li>
</template>
<script setup>
  import { computed, resolveComponent } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute } from 'vue-router';
  import { getPreferredNavUrl } from '@/composables/usePageFilterRegistry';
  
  const { t } = useI18n({ useScope: 'global' });
  const route = useRoute();
  
  const props = defineProps({
    icon: {
      type: String,
      default: 'mdi-menu-right',
      required: false,
    },
    avatar: {
      type: String,
      required: false,
      default: null,
    },
    iconColor: {
      type: String,
      required: false,
      default: null,
    },
    localeKey: {
      type: String,
      required: false,
      default: null,
    },
    text: {
      type: String,
      required: false,
      default: null,
    },
    to: {
      type: String,
      required: false,
      default: null,
    },
    href: {
      type: String,
      required: false,
      default: null,
    },
    extLink: {
      type: Boolean,
      required: false,
      default: false,
    },
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
  
  // Check if this page path is active (for styling)
  const isActive = computed(() => {
    if (props.to) {
      return route.path === props.to;
    }
    return false;
  });
  
  const iconClasses = computed(() => {
    if (isActive.value) {
      return props.iconColor
        ? `text-${props.iconColor}`
        : 'text-accent-600 dark:text-accent-400';
    }
    return 'text-content-tertiary group-hover:text-content-primary';
  });
  
  /**
   * Compute the navigation URL based on current location:
   * - If already on this page: return base path (reset to defaults)
   * - If navigating from elsewhere: include stored preferences in URL
   * This eliminates the "one-two" flash and allows re-clicking to reset.
   */
  const computedNavUrl = computed(() => {
    if (!props.to) return null;
    // If already on this page, clicking again should reset to defaults
    if (route.path === props.to) {
      return props.to;
    }
    // Navigating from another page: include stored filter preferences
    return getPreferredNavUrl(props.to);
  });
  
  /**
   * Use NuxtLink component for navigation.
   */
  const linkComponent = resolveComponent('NuxtLink');
  
  const visitHref = () => {
    if (props.href !== null) {
      window.open(props.href, '_blank');
    }
  };
</script>
