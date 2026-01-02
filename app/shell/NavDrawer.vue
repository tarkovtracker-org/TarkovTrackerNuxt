<template>
  <!-- Backdrop overlay for mobile expanded state -->
  <Transition
    enter-active-class="transition-opacity duration-300 ease-out"
    leave-active-class="transition-opacity duration-300 ease-in"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="belowMd && mobileExpanded"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      @click="closeMobileDrawer"
    />
  </Transition>
  <!-- Unified Sidebar - works as rail on mobile, rail/expanded on desktop -->
  <aside
    class="border-base fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-surface-elevated shadow-sm backdrop-blur-sm transition-all duration-300 dark:bg-[linear-gradient(180deg,rgba(18,18,20,0.96)_0%,rgba(14,14,15,0.96)_45%,rgba(12,12,13,0.97)_100%)] dark:border-primary-800/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-1px_0_rgba(0,0,0,0.6),1px_0_0_rgba(0,0,0,0.55)]"
    :class="[sidebarWidth]"
  >
    <div
      class="nav-drawer-scroll relative z-10 flex h-full flex-col overflow-x-hidden overflow-y-auto"
    >
      <NuxtLink
        to="/"
        class="group mt-1 flex flex-col items-center px-3 py-1.5 transition-opacity hover:opacity-90"
      >
        <div
          :class="isCollapsed ? 'w-8' : 'w-[130px]'"
          class="relative mx-auto transition-all duration-200"
        >
          <NuxtImg
            :src="
              isCollapsed
                ? '/img/logos/tarkovtrackerlogo-mini.webp'
                : '/img/logos/tarkovtrackerlogo-light.webp'
            "
            class="h-auto w-full"
            :class="currentGameMode === 'pve' ? 'logo-pve-tint' : 'logo-pvp-tint'"
            preload
          />
        </div>
        <div v-if="!isCollapsed" class="mt-1 text-center">
          <div class="text-base leading-tight font-medium text-content-primary">TarkovTracker.org</div>
        </div>
      </NuxtLink>
      <div class="mx-3 my-0.5 h-px bg-divider dark:bg-primary-800/40" />
      <DrawerLevel :is-collapsed="isCollapsed" />
      <div v-if="!isCollapsed" class="my-2 flex flex-col items-center gap-1.5 px-4">
        <button
          class="w-full rounded border px-2 py-2.5 text-center text-xs font-medium transition-colors border-base text-content-secondary hover:text-content-primary dark:border-accent-800/50 dark:hover:border-accent-600 dark:text-white/80 dark:hover:text-white"
          @click="navigateToSettings"
        >
          {{ currentEditionName }}
        </button>
        <!-- Faction and Game Mode Cycling Buttons Row -->
        <div class="flex w-full gap-1.5">
          <!-- Faction Cycling Button -->
          <span v-tooltip="`Switch to ${nextFaction}`" class="aspect-square">
            <button
              class="w-full h-full rounded border px-2 py-2.5 text-center transition-colors border-base hover:bg-surface-200 dark:border-accent-800/50 dark:hover:border-accent-600 dark:hover:bg-white/5"
              @click="cycleFaction"
            >
              <NuxtImg
                :src="`/img/factions/${currentFaction}.webp`"
                class="h-10 w-10 mx-auto object-contain invert-0 dark:invert"
                width="40"
                height="40"
              />
            </button>
          </span>
          <!-- Game Mode Cycling Button -->
          <span v-tooltip="`Switch to ${nextGameModeLabel}`" class="flex-1">
            <button
              class="w-full h-full rounded border px-2 py-2.5 flex items-center justify-center transition-colors border-base hover:bg-surface-200 dark:border-accent-800/50 dark:hover:border-accent-600 dark:hover:bg-white/5"
              :class="currentGameModeColorClass"
              @click="cycleGameMode"
            >
              <div class="flex items-center justify-center gap-1.5 text-md font-semibold uppercase tracking-wide">
                <UIcon :name="currentGameModeIcon" class="h-10 w-10" :class="currentGameModeIconClass" />
                <span>{{ currentGameModeLabel }}</span>
              </div>
            </button>
          </span>
        </div>
      </div>
      <div class="mx-3 my-0.5 h-px bg-divider dark:bg-primary-800/40" />
      <DrawerLinks :is-collapsed="isCollapsed" />
      <div class="mx-3 my-0.5 h-px bg-divider dark:bg-primary-800/40" />
      <div class="flex flex-col gap-1">
        <div v-if="!isCollapsed" class="px-4 py-0.5">
          <h3 class="text-xs font-semibold tracking-wider text-content-tertiary uppercase">External</h3>
        </div>
        <ul class="flex flex-col gap-1 px-1">
          <DrawerItem
            avatar="/img/logos/tarkovdevlogo.webp"
            locale-key="tarkovdev"
            href="https://tarkov.dev/"
            ext-link
            :is-collapsed="isCollapsed"
          />
          <DrawerItem
            avatar="/img/logos/tarkovmonitorlogo.avif"
            locale-key="tarkovmonitor"
            href="https://github.com/the-hideout/TarkovMonitor"
            ext-link
            :is-collapsed="isCollapsed"
          />
          <DrawerItem
            avatar="/img/logos/ratscannerlogo.webp"
            locale-key="ratscanner"
            href="https://github.com/RatScanner/RatScanner"
            ext-link
            :is-collapsed="isCollapsed"
          />
          <DrawerItem
            avatar="/img/logos/tarkovchangeslogo.svg"
            locale-key="tarkovchanges"
            href="https://tarkov-changes.com/"
            ext-link
            :is-collapsed="isCollapsed"
          />
        </ul>
      </div>
    </div>
  </aside>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { useSharedBreakpoints } from '@/composables/useSharedBreakpoints';
  import { useAppStore } from '@/stores/useApp';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { PMC_FACTIONS, type PMCFaction, GAME_MODES, type GameMode } from '@/utils/constants';
  // Use shared breakpoints to avoid duplicate listeners
  const { belowMd } = useSharedBreakpoints();
  const appStore = useAppStore();
  const metadataStore = useMetadataStore();
  // Mobile expanded state from store
  const mobileExpanded = computed(() => appStore.mobileDrawerExpanded);
  // Close mobile expanded when switching to desktop
  watch(belowMd, (isMobile) => {
    if (!isMobile) {
      appStore.setMobileDrawerExpanded(false);
    }
  });
  const closeMobileDrawer = () => {
    appStore.setMobileDrawerExpanded(false);
  };
  // Determine if sidebar should be collapsed (rail mode)
  const isCollapsed = computed(() => {
    if (belowMd.value) {
      // On mobile: collapsed unless expanded
      return !mobileExpanded.value;
    }
    // On desktop: based on rail setting
    return appStore.drawerRail;
  });
  // Determine sidebar width class
  const sidebarWidth = computed(() => {
    if (belowMd.value) {
      // Mobile: rail by default, expanded when open
      return mobileExpanded.value ? 'w-56' : 'w-14';
    }
    // Desktop: based on rail setting
    return appStore.drawerRail ? 'w-14' : 'w-56';
  });
  const DrawerLinks = defineAsyncComponent(() => import('@/features/drawer/DrawerLinks.vue'));
  const DrawerLevel = defineAsyncComponent(() => import('@/features/drawer/DrawerLevel.vue'));
  const DrawerItem = defineAsyncComponent(() => import('@/features/drawer/DrawerItem.vue'));
  const preferencesStore = usePreferencesStore();
  const tarkovStore = useTarkovStore();
  const router = useRouter();
  const { t } = useI18n({ useScope: 'global' });
  const currentEditionName = computed(() => metadataStore.getEditionName(tarkovStore.gameEdition));
  
  // Faction cycling logic
  const factionArray = PMC_FACTIONS; // ['USEC', 'BEAR']
  const currentFaction = computed<PMCFaction>(() => tarkovStore.getPMCFaction());
  const nextFaction = computed<PMCFaction>(() => {
    const currentIndex = factionArray.indexOf(currentFaction.value);
    const nextIndex = (currentIndex + 1) % factionArray.length;
    return factionArray[nextIndex];
  });
  function setFaction(faction: PMCFaction) {
    if (faction !== currentFaction.value) {
      tarkovStore.setPMCFaction(faction);
    }
  }
  function cycleFaction() {
    setFaction(nextFaction.value);
  }
  
  // Game mode cycling logic
  const gameModeArray = [GAME_MODES.PVP, GAME_MODES.PVE];
  const gameModeConfig = {
    [GAME_MODES.PVP]: { 
      label: 'PvP', 
      icon: 'i-mdi-sword-cross',
      colorClass: 'dark:text-primary-100',
      iconClass: 'text-pvp-600 dark:text-pvp-600',
    },
    [GAME_MODES.PVE]: { 
      label: 'PvE', 
      icon: 'i-mdi-account-group',
      colorClass: 'dark:text-pve-100',
      iconClass: 'text-pve-600 dark:text-pve-400',
    },
  };
  const currentGameMode = computed(() => tarkovStore.getCurrentGameMode());
  const currentGameModeConfig = computed(() => gameModeConfig[currentGameMode.value]);
  const currentGameModeLabel = computed(() => currentGameModeConfig.value.label);
  const currentGameModeIcon = computed(() => currentGameModeConfig.value.icon);
  const currentGameModeColorClass = computed(() => currentGameModeConfig.value.colorClass);
  const currentGameModeIconClass = computed(() => currentGameModeConfig.value.iconClass);
  const nextGameMode = computed<GameMode>(() => {
    const currentIndex = gameModeArray.indexOf(currentGameMode.value);
    const nextIndex = (currentIndex + 1) % gameModeArray.length;
    return gameModeArray[nextIndex];
  });
  const nextGameModeLabel = computed(() => {
    return gameModeConfig[nextGameMode.value].label;
  });
  function setGameMode(mode: GameMode) {
    if (mode !== currentGameMode.value) {
      tarkovStore.switchGameMode(mode);
    }
  }
  function cycleGameMode() {
    setGameMode(nextGameMode.value);
  }
  function navigateToSettings() {
    router.push('/settings');
  }
</script>
<style scoped>
  /* Hide scrollbar but keep scroll functionality */
  .nav-drawer-scroll {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }
  .nav-drawer-scroll::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
</style>
