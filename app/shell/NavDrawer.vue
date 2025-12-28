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
    class="border-primary-800/60 fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-[linear-gradient(180deg,rgba(18,18,20,0.96)_0%,rgba(14,14,15,0.96)_45%,rgba(12,12,13,0.97)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-1px_0_rgba(0,0,0,0.6),1px_0_0_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all duration-300"
    :class="[sidebarWidth]"
  >
    <div
      class="nav-drawer-scroll relative z-10 flex flex-1 flex-col overflow-x-hidden overflow-y-auto"
    >
      <NuxtLink
        to="/"
        class="group mt-1 flex flex-col items-center px-3 py-1.5 transition-opacity hover:opacity-90"
      >
        <div
          :class="isCollapsed ? 'w-8' : 'w-[130px] short:w-[100px]'"
          class="relative mx-auto transition-all duration-200"
        >
          <NuxtImg
            :src="
              isCollapsed
                ? '/img/logos/tarkovtrackerlogo-mini.webp'
                : '/img/logos/tarkovtrackerlogo-light.webp'
            "
            class="h-auto w-full"
            preload
          />
        </div>
        <div v-if="!isCollapsed" class="mt-1 text-center">
          <div class="text-base leading-tight font-medium text-white">TarkovTracker.org</div>
        </div>
      </NuxtLink>
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
      <DrawerLevel :is-collapsed="isCollapsed" />
      <div v-if="!isCollapsed" class="my-2 flex flex-col items-center gap-1.5 px-4">
        <button
          class="border-primary-800/50 hover:border-primary-600 w-full rounded border px-2 py-1 text-center text-xs font-medium text-white/80 transition-colors hover:text-white"
          @click="navigateToSettings"
        >
          {{ currentEditionName }}
        </button>
        <div class="border-primary-800/50 flex w-full overflow-hidden rounded-md border">
          <button
            v-for="faction in factions"
            :key="faction"
            class="flex-1 px-2 py-1 text-xs font-semibold uppercase transition-colors"
            :class="
              faction === currentFaction
                ? 'bg-primary-700 text-white'
                : 'bg-transparent text-white/65 hover:bg-white/5 hover:text-white'
            "
            @click="setFaction(faction)"
          >
            {{ faction }}
          </button>
        </div>
      </div>
      <DrawerLinks :is-collapsed="isCollapsed" />
      <!-- External Links Button -->
      <div class="px-1 py-1">
        <div class="relative">
          <button 
            ref="externalButtonRef"
            class="group flex w-full cursor-pointer items-center rounded-md border-l-2 border-transparent px-3 py-2.5 text-base font-medium text-[rgba(248,248,248,0.65)] transition-colors duration-150 hover:bg-white/5 hover:text-white"
            @mouseenter="handleEnter"
            @mouseleave="handleLeave('button')"
          >
            <UIcon name="i-heroicons-link" class="mr-3 h-6 w-6 shrink-0 transition-colors group-hover:text-white" />
            <span v-if="!isCollapsed" class="truncate">External</span>
            <UIcon v-if="!isCollapsed" name="i-heroicons-chevron-right" class="ml-auto h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <div 
        v-if="showExternalMenu"
        ref="externalMenuRef"
        class="popover-menu ring-primary-800/20 fixed z-50 flex flex-col rounded-lg border border-white/10 bg-[#0d0d0d] py-1.5 shadow-2xl backdrop-blur-md ring-1"
        :style="{
          bottom: `${menuPosition.bottom}px`,
          left: `${menuPosition.left}px`,
          minWidth: '13rem'
        }"
        @mouseenter="handleMenuEnter"
        @mouseleave="handleLeave('menu')"
      >
            <div class="px-3 pt-1 pb-1.5 border-b border-white/5 mb-1">
              <h3 class="text-[0.65rem] font-bold tracking-widest text-gray-500 uppercase">External</h3>
            </div>
            <ul class="flex flex-col gap-0.5">
              <DrawerItem
                avatar="/img/logos/tarkovdevlogo.webp"
                locale-key="tarkovdev"
                href="https://tarkov.dev/"
                ext-link
                :is-collapsed="false"
              />
              <DrawerItem
                avatar="/img/logos/tarkovmonitorlogo.avif"
                locale-key="tarkovmonitor"
                href="https://github.com/the-hideout/TarkovMonitor"
                ext-link
                :is-collapsed="false"
              />
              <DrawerItem
                avatar="/img/logos/ratscannerlogo.webp"
                locale-key="ratscanner"
                href="https://ratscanner.com/"
                ext-link
                :is-collapsed="false"
              />
              <DrawerItem
                avatar="/img/logos/tarkovchangeslogo.svg"
                locale-key="tarkovchanges"
                href="https://tarkov-changes.com/"
                ext-link
                :is-collapsed="false"
              />
            </ul>
        </div>
      </Teleport>
  </aside>
</template>
<script setup lang="ts">
  import { onClickOutside } from '@vueuse/core';
  import { computed, defineAsyncComponent, ref, watch } from 'vue';
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
  const showExternalMenu = ref(false);
  const externalButtonRef = ref<HTMLButtonElement | null>(null);
  const externalMenuRef = ref<HTMLElement | null>(null);
  const menuPosition = ref({ bottom: 0, left: 0 });
  const isButtonHovered = ref(false);
  const isMenuHovered = ref(false);
  let closeTimeout: ReturnType<typeof setTimeout> | null = null;
  // Handle click outside to close menu (useful for touch devices)
  onClickOutside(externalMenuRef, () => {
    showExternalMenu.value = false;
    isButtonHovered.value = false;
    isMenuHovered.value = false;
  }, { ignore: [externalButtonRef] });
  const updatePosition = () => {
    if (externalButtonRef.value) {
      const rect = externalButtonRef.value.getBoundingClientRect();
      menuPosition.value = {
        bottom: window.innerHeight - rect.bottom, 
        left: rect.right + 10
      };
    }
  };
  const handleEnter = () => {
    isButtonHovered.value = true;
    if (closeTimeout) clearTimeout(closeTimeout);
    updatePosition();
    showExternalMenu.value = true;
  };
  const handleMenuEnter = () => {
    isMenuHovered.value = true;
    if (closeTimeout) clearTimeout(closeTimeout);
  };
  const handleLeave = (source: 'button' | 'menu') => {
    if (source === 'button') isButtonHovered.value = false;
    if (source === 'menu') isMenuHovered.value = false;
    if (closeTimeout) clearTimeout(closeTimeout);
    closeTimeout = setTimeout(() => {
      if (!isButtonHovered.value && !isMenuHovered.value) {
        showExternalMenu.value = false;
      }
    }, 300);
  };
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
  @media (max-height: 900px) {
    .short\:hidden { display: none !important; }
    .short\:block { display: block !important; }
    .short\:w-\[100px\] { width: 100px !important; }
  }
  /* Remove list styling (borders) from popover items */
  .popover-menu :deep(a),
  .popover-menu :deep(li),
  .popover-menu :deep(.group) {
    border-left: 0 !important;
    border-left-width: 0 !important;
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
    margin-left: 0 !important;
  }
  
  .popover-menu :deep(a) {
    height: 38px !important;
    border-radius: 4px !important;
  }
  /* Force no border on the item wrapper itself */
  .popover-menu :deep(li > div) {
    border-left: 0 !important;
  }
</style>
