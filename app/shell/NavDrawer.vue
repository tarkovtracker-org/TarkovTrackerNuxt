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
            class="h-auto w-full invert dark:invert-0"
            preload
          />
        </div>
        <div v-if="!isCollapsed" class="mt-1 text-center">
          <div class="text-base leading-tight font-medium text-content-primary">TarkovTracker.org</div>
        </div>
      </NuxtLink>
      <div class="mx-3 my-0.5 h-px bg-divider dark:bg-primary-800/40" />
      <ul class="flex flex-col gap-1 px-1">
        <template v-if="isLoggedIn">
          <UDropdownMenu :items="accountItems" :content="{ side: 'right', align: 'start' }">
            <UButton
              color="neutral"
              variant="ghost"
              :padded="!isCollapsed"
              class="w-full justify-between rounded-md px-2 py-2"
              :class="[isCollapsed ? 'justify-center px-0' : '']"
            >
              <div class="flex min-w-0 items-center gap-3">
                <UAvatar :src="avatarSrc" size="md" alt="User avatar" class="shrink-0" />
                <span v-if="!isCollapsed" class="truncate">{{ userDisplayName }}</span>
              </div>
              <template #trailing>
                <UIcon
                  v-if="!isCollapsed"
                  name="i-heroicons-chevron-down-20-solid"
                  class="h-5 w-5 transition-transform duration-200"
                />
              </template>
            </UButton>
          </UDropdownMenu>
        </template>
        <template v-else>
          <UButton
            to="/login"
            icon="i-mdi-fingerprint"
            color="neutral"
            variant="ghost"
            block
            :padded="!isCollapsed"
            class="h-12 justify-center rounded-md px-3 py-3"
          >
            <span v-if="!isCollapsed" class="truncate text-base font-medium">
              {{ t('navigation_drawer.login') }}
            </span>
          </UButton>
        </template>
      </ul>
      <div class="mx-3 my-0.5 h-px bg-divider dark:bg-primary-800/40" />
      <DrawerLevel :is-collapsed="isCollapsed" />
      <div v-if="!isCollapsed" class="my-2 flex flex-col items-center gap-1.5 px-4">
        <button
          class="w-full rounded border px-2 py-1 text-center text-xs font-medium transition-colors border-base text-content-secondary hover:text-content-primary dark:border-primary-800/50 dark:hover:border-primary-600 dark:text-white/80 dark:hover:text-white"
          @click="navigateToSettings"
        >
          {{ currentEditionName }}
        </button>
        <div class="flex w-full overflow-hidden rounded-md border border-base dark:border-primary-800/50">
          <button
            v-for="faction in factions"
            :key="faction"
            class="flex flex-1 items-center justify-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase transition-colors"
            :class="
              faction === currentFaction
                ? 'bg-primary-600 text-white dark:bg-primary-700'
                : 'bg-transparent text-content-tertiary hover:bg-surface-200 hover:text-content-primary dark:text-white/65 dark:hover:bg-white/5 dark:hover:text-white'
            "
            @click="setFaction(faction)"
          >
            <NuxtImg
              :src="`/img/factions/${faction}.webp`"
              class="h-4 w-4 object-contain"
              :class="faction === currentFaction ? 'invert' : 'invert-0 dark:invert'"
              width="16"
              height="16"
            />
            <span>{{ faction }}</span>
          </button>
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
            href="https://ratscanner.com/"
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
  import { PMC_FACTIONS, type PMCFaction } from '@/utils/constants';
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
  const factions = PMC_FACTIONS;
  const { t } = useI18n({ useScope: 'global' });
  const { $supabase } = useNuxtApp();
  const isLoggedIn = computed(() => $supabase.user?.loggedIn ?? false);
  const avatarSrc = computed(() => {
    return preferencesStore.getStreamerMode || !$supabase.user.photoURL
      ? '/img/default-avatar.svg'
      : $supabase.user.photoURL;
  });
  const currentFaction = computed<PMCFaction>(() => tarkovStore.getPMCFaction());
  const currentEditionName = computed(() => metadataStore.getEditionName(tarkovStore.gameEdition));
  function setFaction(faction: PMCFaction) {
    if (faction !== currentFaction.value) {
      tarkovStore.setPMCFaction(faction);
    }
  }
  function navigateToSettings() {
    router.push('/settings');
  }
  const userDisplayName = computed(() => {
    if (preferencesStore.getStreamerMode) return 'User';
    // Prefer Display Name from tarkov store (current game mode)
    const displayName = tarkovStore.getDisplayName();
    if (displayName && displayName.trim() !== '') {
      return displayName;
    }
    // Fallback to auth username or'User'
    return $supabase.user.displayName || 'User';
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
