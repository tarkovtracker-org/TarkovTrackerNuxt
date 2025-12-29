<template>
  <header
    class="from-surface-800/95 to-surface-950/95 border-primary-800/60 fixed top-0 right-0 z-40 h-16 border-b bg-linear-to-tr shadow-[0_1px_0_rgba(0,0,0,0.4)] backdrop-blur-sm"
  >
    <div class="flex h-full items-center gap-1 px-2 sm:gap-3 sm:px-3">
      <!-- Left: Toggle Button -->
      <AppTooltip text="Toggle Menu Drawer">
        <UButton
          :icon="navBarIcon"
          variant="ghost"
          color="neutral"
          size="xl"
          aria-label="Toggle Menu Drawer"
          @click.stop="changeNavigationDrawer"
        />
      </AppTooltip>
      <!-- Center: Page Title -->
      <span class="min-w-0 flex-1 truncate text-xl font-bold text-white">
        {{ pageTitle }}
      </span>
      <!-- Right: Status Icons & Settings -->
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <AppTooltip v-if="dataError" text="Error Loading Tarkov Data">
          <span class="inline-flex rounded">
            <UIcon name="i-mdi-database-alert" class="text-error-500 h-6 w-6" />
          </span>
        </AppTooltip>
        <AppTooltip v-if="dataLoading || hideoutLoading" text="Loading Tarkov Data">
          <span class="inline-flex rounded">
            <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-6 w-6 animate-spin" />
          </span>
        </AppTooltip>
        <!-- Game mode quick toggle -->
        <div
          class="bg-surface-900/90 flex overflow-hidden rounded-md border border-white/15 ring-1 ring-white/10"
          role="group"
          aria-label="Toggle game mode"
        >
          <button
            type="button"
            class="focus-visible:ring-inset focus-visible:z-10 rounded-l-[5px] cursor-pointer inline-flex items-center justify-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs md:px-3.5 md:text-sm lg:px-4 lg:text-[15px]"
            :class="pvpClasses"
            :disabled="dataLoading"
            @click="switchMode(GAME_MODES.PVP)"
          >
            <UIcon name="i-mdi-sword-cross" class="hidden h-4 w-4 sm:block md:h-5 md:w-5" />
            PvP
          </button>
          <div class="h-6 w-px self-center bg-white/15 sm:h-8" aria-hidden="true" />
          <button
            type="button"
            class="focus-visible:ring-inset focus-visible:z-10 rounded-r-[5px] cursor-pointer inline-flex items-center justify-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs md:px-3.5 md:text-sm lg:px-4 lg:text-[15px]"
            :class="pveClasses"
            :disabled="dataLoading"
            @click="switchMode(GAME_MODES.PVE)"
          >
            <UIcon name="i-mdi-account-group" class="hidden h-4 w-4 sm:block md:h-5 md:w-5" />
            PvE
          </button>
        </div>
        <!-- Language selector -->
        <USelectMenu
          v-model="selectedLocale"
          :items="localeItems"
          value-key="value"
          trailing-icon=""
          :popper="{ placement: 'bottom-end', strategy: 'fixed' }"
          :ui="{
            base: 'bg-surface-900/90 border border-white/15 ring-1 ring-white/10 rounded-md px-1.5 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1.5 cursor-pointer !pe-1.5 sm:!pe-3',
          }"
          class="h-auto min-w-0"
        >
          <template #default>
            <div class="flex items-center gap-2">
              <UIcon name="i-mdi-translate" class="text-surface-300 h-4 w-4" />
              <span
                class="text-[10px] font-medium text-white/80 uppercase sm:text-xs md:text-sm lg:text-[15px]"
              >
                {{ locale }}
              </span>
              <UIcon name="i-mdi-chevron-down" class="text-surface-400 h-5 w-5" />
            </div>
          </template>
        </USelectMenu>
      </div>
    </div>
  </header>
</template>
<script setup lang="ts">
  import { useWindowSize } from '@vueuse/core';
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
      ? 'bg-pve-700 text-white'
      : 'bg-transparent text-pve-400 hover:bg-pve-400/10'
  );
  const pvpClasses = computed(() =>
    currentGameMode.value === GAME_MODES.PVP
      ? 'bg-pvp-800 text-white'
      : 'bg-transparent text-pvp-700 hover:bg-pvp-400/10'
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
</script>

