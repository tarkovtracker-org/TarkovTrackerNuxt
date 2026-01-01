<template>
  <div class="bg-surface-base text-content-primary flex min-h-screen flex-col">
    <!-- Holiday Effects -->
    <template v-if="holidayEffectsEnabled">
      <HolidayLights />
      <HolidaySnow />
    </template>
    <!-- Holiday Toggle (always visible) -->
    <HolidayToggle />
    <!-- Skip navigation link for accessibility -->
    <a
      href="#main-content"
      class="focus:bg-primary-600 sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-16 focus:z-100 focus:rounded focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
    >
      Skip to main content
    </a>
    <!-- Navigation Drawer (fixed) -->
    <NavDrawer />
    <!-- Application Bar (fixed header) -->
    <AppBar
      class="transition-all duration-300 ease-in-out"
      :style="{
        left: mainMarginLeft,
      }"
    />
    <!-- Main content area -->
    <main
      id="main-content"
      class="relative z-0 flex flex-1 flex-col pt-16 transition-all duration-300 ease-in-out"
      :style="{
        marginLeft: mainMarginLeft,
      }"
    >
      <div class="min-h-0 flex-1 overflow-y-auto p-2 pt-0">
        <slot />
      </div>
    </main>
    <!-- Footer pinned to bottom when content is short -->
    <AppFooter
      class="shrink-0"
      :style="{
        marginLeft: mainMarginLeft,
        width: `calc(100% - ${mainMarginLeft})`,
      }"
    />
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue';
  import { useSharedBreakpoints } from '@/composables/useSharedBreakpoints';
  import { useAppStore } from '@/stores/useApp';
  import { usePreferencesStore } from '@/stores/usePreferences';
  const appStore = useAppStore();
  const preferencesStore = usePreferencesStore();
  const colorMode = useColorMode();

  // Sync theme preference to color mode
  watch(
    () => preferencesStore.theme,
    (newTheme) => {
      colorMode.preference = newTheme;
    },
    { immediate: true }
  );
  // Holiday effects
  const holidayEffectsEnabled = computed(() => preferencesStore.getEnableHolidayEffects);
  // Use shared breakpoints to avoid duplicate listeners
  const { belowMd } = useSharedBreakpoints();
  // Calculate margin-left based on sidebar state
  const mainMarginLeft = computed(() => {
    if (belowMd.value) return '56px'; // Rail width on mobile
    return appStore.drawerRail ? '56px' : '224px';
  });
  // Lazy-load shell components
  const NavDrawer = defineAsyncComponent(() => import('@/shell/NavDrawer.vue'));
  const AppFooter = defineAsyncComponent(() => import('@/shell/AppFooter.vue'));
  const AppBar = defineAsyncComponent(() => import('@/shell/AppBar.vue'));
</script>
