<template>
  <header
    class="dark:from-surface-800/95 dark:to-surface-950/95 dark:border-accent-800/60 fixed top-0 right-0 z-40 h-16 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm dark:bg-transparent dark:bg-linear-to-tr dark:shadow-[0_1px_0_rgba(0,0,0,0.4)]"
  >
    <div class="flex h-full items-center gap-1 px-2 sm:gap-3 sm:px-3">
      <!-- Left: Toggle Button -->
      <span v-tooltip="t('app_bar.toggle_drawer')">
        <UButton
          :icon="navBarIcon"
          variant="ghost"
          color="neutral"
          size="xl"
          :aria-label="t('app_bar.toggle_drawer')"
          @click.stop="changeNavigationDrawer"
        />
      </span>
      <!-- Center: Page Title -->
      <span class="text-content-primary min-w-0 flex-1 truncate text-xl font-bold">
        {{ pageTitle }}
      </span>
      <!-- Right: Status Icons & Settings -->
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <span v-if="dataError" v-tooltip="t('app_bar.error_loading')" class="inline-flex rounded">
          <UIcon name="i-mdi-database-alert" class="text-error-500 h-6 w-6" />
        </span>
        <span
          v-if="dataLoading || hideoutLoading"
          v-tooltip="t('app_bar.loading_data')"
          class="inline-flex rounded"
        >
          <UIcon name="i-heroicons-arrow-path" class="text-accent-500 h-6 w-6 animate-spin" />
        </span>
        <!-- Language selector -->
        <USelectMenu
          v-model="selectedLocale"
          :items="localeItems"
          value-key="value"
          trailing-icon=""
          :popper="{ placement: 'bottom-end', strategy: 'fixed' }"
          :ui="{
            base: 'bg-surface-elevated border border-base ring-1 ring-gray-200/50 rounded-md px-2 py-1.5 dark:bg-surface-900/90 dark:border-white/15 dark:ring-white/10',
          }"
          :ui-menu="{
            container: 'z-[9999]',
            width: 'w-auto min-w-32',
            background: 'bg-surface-floating dark:bg-surface-900',
            shadow: 'shadow-xl',
            rounded: 'rounded-lg',
            ring: 'ring-1 ring-gray-200 dark:ring-white/10',
            padding: 'p-1',
            option: {
              base: 'px-3 py-2 text-sm cursor-pointer transition-colors rounded',
              inactive:
                'clickable text-content-secondary dark:text-surface-200',
              active:
                'clickable bg-surface-200 text-content-primary dark:bg-surface-800 dark:text-white',
              selected:
                'bg-accent-50 text-accent-600 ring-1 ring-accent-500 dark:bg-accent-500/10 dark:text-accent-100',
            },
          }"
          class="h-auto min-w-0"
        >
          <template #leading>
            <UIcon
              name="i-mdi-translate"
              class="text-content-tertiary dark:text-surface-300 h-4 w-4"
            />
          </template>
          <template #default>
            <span class="text-content-secondary text-xs font-medium uppercase dark:text-white/80">
              {{ locale }}
            </span>
          </template>
          <template #trailing>
            <UIcon name="i-mdi-chevron-down" class="text-content-tertiary h-3 w-3" />
          </template>
        </USelectMenu>
        <!-- Theme toggle -->
        <span v-tooltip="nextThemeLabel" class="inline-flex">
          <button
            type="button"
            class="focus-ring bg-surface-elevated border-base dark:bg-surface-900/90 flex items-center justify-center rounded-md border px-2 py-1.5 transition-colors dark:border-white/15"
            :aria-label="nextThemeLabel"
            @click="cycleTheme"
          >
            <UIcon
              :name="currentThemeIcon"
              class="text-content-tertiary h-4 w-4 transition-transform duration-200"
            />
          </button>
        </span>
        <!-- User/Login control -->
        <template v-if="isLoggedIn">
          <UDropdownMenu
            :items="accountItems"
            :content="{ side: 'bottom', align: 'end' }"
            :ui="{
              content:
                'z-[9999] min-w-32 p-1 bg-surface-floating dark:bg-surface-900 ring-1 ring-gray-200 dark:ring-white/10 rounded-lg shadow-xl',
              item: {
                base: 'clickable px-2.5 py-1.5 text-sm rounded transition-colors text-content-secondary',
              },
            }"
          >
            <button
              type="button"
              class="focus-ring bg-surface-elevated border-base dark:bg-surface-900/90 flex items-center justify-center rounded-md border p-1 transition-colors dark:border-white/15"
            >
              <UAvatar :src="avatarSrc" size="xs" alt="User avatar" />
            </button>
          </UDropdownMenu>
        </template>
        <template v-else>
          <NuxtLink
            to="/login"
            class="focus-ring bg-surface-elevated border-base dark:bg-surface-900/90 flex items-center justify-center rounded-md border px-2 py-1.5 transition-colors dark:border-white/15"
          >
            <UIcon name="i-mdi-fingerprint" class="text-content-tertiary h-4 w-4" />
          </NuxtLink>
        </template>
      </div>
    </div>
  </header>
</template>
<script setup lang="ts">
  import { usePreferredDark, useWindowSize } from '@vueuse/core';
  import { storeToRefs } from 'pinia';
  import { computed, onMounted, onUnmounted, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute } from 'vue-router';
  import { useAppStore } from '@/stores/useApp';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { logger } from '@/utils/logger';
  const { t } = useI18n({ useScope: 'global' });
  const appStore = useAppStore();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  const { $supabase } = useNuxtApp();
  const route = useRoute();
  // User/Login state
  const isLoggedIn = computed(() => $supabase.user?.loggedIn ?? false);
  const avatarSrc = computed(() => {
    return preferencesStore.getStreamerMode || !$supabase.user?.photoURL
      ? '/img/default-avatar.svg'
      : $supabase.user.photoURL;
  });
  function logout() {
    $supabase.signOut();
  }
  const accountItems = computed(() => [
    {
      label: t('navigation_drawer.logout'),
      icon: 'i-mdi-lock',
      onSelect: logout,
    },
  ]);
  const { width } = useWindowSize();
  const mdAndDown = computed(() => width.value < 960); // md breakpoint at 960px
  const navBarIcon = computed(() => {
    if (mdAndDown.value) {
      return appStore.mobileDrawerExpanded ? 'i-mdi-menu-open' : 'i-mdi-menu';
    }
    return appStore.drawerRail ? 'i-mdi-menu' : 'i-mdi-menu-open';
  });
  const { loading: dataLoading, hideoutLoading } = storeToRefs(metadataStore);
  const dataError = ref(false);
  const pageTitle = computed(() =>
    t(`page.${String(route.name || 'index').replace('-', '_')}.title`)
  );
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && appStore.mobileDrawerExpanded && mdAndDown.value) {
      event.preventDefault();
      appStore.setMobileDrawerExpanded(false);
    }
  }
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
  });
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
  function changeNavigationDrawer() {
    if (mdAndDown.value) {
      appStore.toggleMobileDrawerExpanded();
    } else {
      appStore.toggleDrawerRail();
    }
  }
  const { locale, availableLocales } = useI18n({ useScope: 'global' });
  const localeItems = computed(() => {
    const languageNames = new Intl.DisplayNames([locale.value], { type: 'language' });
    return availableLocales.map((localeCode) => ({
      label: languageNames.of(localeCode) || localeCode.toUpperCase(),
      value: localeCode,
    }));
  });
  const selectedLocale = computed({
    get() {
      // Return the current locale string directly
      return locale.value;
    },
    set(newValue: string | { value: string }) {
      if (!newValue) return;
      // Handle both string and object values
      const newLocale = typeof newValue === 'string' ? newValue : newValue.value;
      if (newLocale === locale.value) return;
      // Set the i18n locale (this updates the UI translations)
      locale.value = newLocale;
      // Persist in preferences
      preferencesStore.setLocaleOverride(newLocale);
      logger.debug('[AppBar] Setting locale to:', newLocale);
      // Update metadata store and refetch data with new language
      metadataStore.updateLanguageAndGameMode(newLocale);
      // Use cached data if available (forceRefresh = false)
      metadataStore
        .fetchAllData(false)
        .then(() => {
          dataError.value = false;
        })
        .catch((err) => {
          logger.error('[AppBar] Error fetching data:', err);
          dataError.value = true;
        });
    },
  });
  // Theme Logic
  const isPreferredDark = usePreferredDark();
  const _themeModes = ['system', 'dark', 'light'] as const;
  type ThemeMode = (typeof _themeModes)[number];
  const currentTheme = computed(() => preferencesStore.getTheme as ThemeMode);
  const themeIconMap: Record<ThemeMode, string> = {
    system: 'i-mdi-desktop-mac',
    light: 'i-mdi-white-balance-sunny',
    dark: 'i-mdi-moon-waning-crescent',
  };
  const currentThemeIcon = computed(() => themeIconMap[currentTheme.value]);
  const nextTheme = computed<ThemeMode>(() => {
    const isSystemDark = isPreferredDark.value;
    const current = currentTheme.value;
    if (current === 'system') {
      return isSystemDark ? 'light' : 'dark';
    }
    if (current === 'light') {
      return isSystemDark ? 'dark' : 'system';
    }
    // current === 'dark'
    return isSystemDark ? 'system' : 'light';
  });
  const nextThemeLabel = computed(() => {
    return t(`app_bar.themes.${nextTheme.value}`);
  });
  function cycleTheme() {
    preferencesStore.setTheme(nextTheme.value);
  }
</script>
