<template>
  <header
    class="fixed top-0 right-0 z-40 h-16 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm dark:bg-transparent dark:from-surface-800/95 dark:to-surface-950/95 dark:border-primary-800/60 dark:bg-linear-to-tr dark:shadow-[0_1px_0_rgba(0,0,0,0.4)]"
  >
    <div class="flex h-full items-center gap-1 px-2 sm:gap-3 sm:px-3">
      <!-- Left: Toggle Button -->
        <UButton
          v-tooltip="t('app_bar.toggle_drawer')"
          :icon="navBarIcon"
          variant="ghost"
          color="neutral"
          size="xl"
          :aria-label="t('app_bar.toggle_drawer')"
          @click.stop="changeNavigationDrawer"
        />
      <!-- Center: Page Title -->
      <span class="min-w-0 flex-1 truncate text-xl font-bold text-content-primary">
        {{ pageTitle }}
      </span>
      <!-- Right: Status Icons & Settings -->
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <span
          v-if="dataError"
          v-tooltip="t('app_bar.error_loading')"
          class="inline-flex rounded"
        >
          <UIcon name="i-mdi-database-alert" class="text-error-500 h-6 w-6" />
        </span>
        <span
          v-if="dataLoading || hideoutLoading"
          v-tooltip="t('app_bar.loading_data')"
          class="inline-flex rounded"
        >
          <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-6 w-6 animate-spin" />
        </span>
        <!-- Game mode quick toggle -->
        <div
          class="flex items-center overflow-hidden rounded-md border border-base bg-surface-elevated ring-1 ring-gray-200/50 dark:border-white/15 dark:bg-surface-900/90 dark:ring-white/10"
          role="group"
          aria-label="Toggle game mode"
        >
          <button
            type="button"
            class="focus:ring-pvp-400 inline-flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors focus:z-10 focus:ring-2 focus:outline-none sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs md:px-3.5 md:text-sm lg:px-4 lg:text-[15px]"
            :class="pvpClasses"
            :disabled="dataLoading"
            @click="switchMode(GAME_MODES.PVP)"
          >
            <UIcon name="i-mdi-sword-cross" class="hidden h-4 w-4 sm:block md:h-5 md:w-5" />
            PvP
          </button>
          <div class="h-6 w-px bg-gray-300 dark:bg-white/15 sm:h-8" aria-hidden="true" />
          <button
            type="button"
            class="focus:ring-pve-400 inline-flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors focus:z-10 focus:ring-2 focus:outline-none sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs md:px-3.5 md:text-sm lg:px-4 lg:text-[15px]"
            :class="pveClasses"
            :disabled="dataLoading"
            @click="switchMode(GAME_MODES.PVE)"
          >
            <UIcon name="i-mdi-account-group" class="hidden h-4 w-4 sm:block md:h-5 md:w-5" />
            PvE
          </button>
        </div>
        <!-- Theme toggle -->
          <button
            v-tooltip="nextThemeLabel"
            type="button"
            class="bg-surface-elevated border-base flex items-center justify-center rounded-md border px-2 py-1.5 ring-1 ring-gray-200/50 transition-colors hover:bg-surface-100 dark:bg-surface-900/90 dark:border-white/15 dark:ring-white/10 dark:hover:bg-surface-800"
            @click="cycleTheme"
            :aria-label="nextThemeLabel"
          >
            <UIcon
              :name="currentThemeIcon"
              class="text-content-tertiary h-4 w-4 transition-transform duration-200"
            />
          </button>
        <!-- Language selector -->
        <USelectMenu
          v-model="selectedLocale"
          :items="localeItems"
          value-key="value"
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
              inactive: 'text-content-secondary hover:bg-surface-200 dark:hover:bg-surface-800 hover:text-content-primary dark:text-surface-200 dark:hover:text-white',
              active: 'bg-surface-200 text-content-primary dark:bg-surface-800 dark:text-white',
              selected: 'bg-primary-50 text-primary-600 ring-1 ring-primary-500 dark:bg-primary-500/10 dark:text-primary-100',
            },
          }"
          class="h-auto min-w-0"
        >
          <template #leading>
            <UIcon name="i-mdi-translate" class="h-4 w-4 text-content-tertiary dark:text-surface-300" />
          </template>
          <template #default>
            <span class="text-xs font-medium uppercase text-content-secondary dark:text-white/80">{{ locale }}</span>
          </template>
          <template #trailing>
            <UIcon name="i-mdi-chevron-down" class="h-3 w-3 text-content-tertiary" />
          </template>
        </USelectMenu>
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
  import { useTarkovStore } from '@/stores/useTarkov';
  import { GAME_MODES, type GameMode } from '@/utils/constants';
  import { logger } from '@/utils/logger';

  const { t } = useI18n({ useScope: 'global' });
  const appStore = useAppStore();
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  const route = useRoute();

  const { width } = useWindowSize();
  const mdAndDown = computed(() => width.value < 960); // md breakpoint at 960px

  const navBarIcon = computed(() => {
    if (mdAndDown.value) {
      return appStore.mobileDrawerExpanded ? 'i-mdi-menu-open' : 'i-mdi-menu';
    }
    return appStore.drawerRail ? 'i-mdi-menu' : 'i-mdi-menu-open';
  });

  const currentGameMode = computed(() => {
    return tarkovStore.getCurrentGameMode();
  });

  const pveClasses = computed(() =>
    currentGameMode.value === GAME_MODES.PVE
      ? 'bg-pve-600 hover:bg-pve-700 text-white shadow-[0_0_0_4px_rgba(0,0,0,0.15)] dark:shadow-[0_0_0_4px_rgba(0,0,0,0.45)] ring-2 ring-white/60 ring-inset outline outline-2 outline-white/40'
      : 'bg-pve-50 text-pve-600 hover:bg-pve-100 dark:bg-pve-950/80 dark:text-pve-400 dark:hover:bg-pve-900/90'
  );

  const pvpClasses = computed(() =>
    currentGameMode.value === GAME_MODES.PVP
      ? 'bg-pvp-600 hover:bg-pvp-700 text-white shadow-[0_0_0_4px_rgba(0,0,0,0.15)] dark:bg-pvp-800 dark:shadow-[0_0_0_4px_rgba(0,0,0,0.45)] ring-2 ring-white/60 ring-inset outline outline-2 outline-white/40'
      : 'bg-pvp-50 text-pvp-600 hover:bg-pvp-100 dark:bg-pvp-950/80 dark:text-pvp-400 dark:hover:bg-pvp-900/90'
  );

  async function switchMode(mode: GameMode) {
    if (mode !== currentGameMode.value && !dataLoading.value) {
      dataLoading.value = true;
      try {
        await tarkovStore.switchGameMode(mode);
        metadataStore.updateLanguageAndGameMode();
        await metadataStore.fetchAllData();
        dataError.value = false;
      } catch (err) {
        logger.error('[AppBar] Error switching mode:', err);
        dataError.value = true;
      } finally {
        dataLoading.value = false;
      }
    }
  }

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
      preferencesStore.localeOverride = newLocale;
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
  const themeModes = ['system', 'dark', 'light'] as const;
  type ThemeMode = (typeof themeModes)[number];

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
