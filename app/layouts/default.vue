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
      <div class="min-h-0 flex-1 overflow-y-auto">
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
  import { computed, defineAsyncComponent, ref, onUnmounted, watch } from 'vue';
  import { useSharedBreakpoints } from '@/composables/useSharedBreakpoints';
  import { useAppStore } from '@/stores/useApp';
  import { usePreferencesStore } from '@/stores/usePreferences';
  const appStore = useAppStore();
  const preferencesStore = usePreferencesStore();
  const colorMode = useColorMode();
  // System theme listener for detecting OS theme changes
  const systemThemeListener = ref<MediaQueryList | null>(null);
  // Handler for system theme changes
  function handleSystemThemeChange(e?: MediaQueryListEvent) {
    if (preferencesStore.getTheme === 'system') {
      // Check current system preference
      const mediaQuery =
        (e?.target as MediaQueryList) ?? window.matchMedia('(prefers-color-scheme: dark)');
      const isDark = mediaQuery.matches;
      // Force Nuxt Color Mode to apply the system theme immediately
      // We must set the value directly to force the .dark class to be added/removed
      colorMode.value = isDark ? 'dark' : 'light';
    }
  }
  // Sync theme preference to color mode and set up system listeners
  watch(
    () => preferencesStore.getTheme,
    (newTheme) => {
      // Clean up old listener first
      if (systemThemeListener.value) {
        systemThemeListener.value.removeEventListener('change', handleSystemThemeChange);
        systemThemeListener.value = null;
      }
      if (newTheme === 'system') {
        // Set preference to 'system' to let Nuxt know we want system detection
        colorMode.preference = 'system';
        // Set up listener for OS theme changes (only on client-side)
        if (typeof window !== 'undefined') {
          systemThemeListener.value = window.matchMedia('(prefers-color-scheme: dark)');
          systemThemeListener.value.addEventListener('change', handleSystemThemeChange);
          // Force initial detection to ensure correct theme on mount
          handleSystemThemeChange();
        }
      } else {
        // User selected a specific theme (light or dark)
        colorMode.preference = newTheme;
        // Also force the value to ensure immediate application
        colorMode.value = newTheme;
      }
    },
    { immediate: true }
  );
  // Cleanup on unmount
  onUnmounted(() => {
    if (systemThemeListener.value) {
      systemThemeListener.value.removeEventListener('change', handleSystemThemeChange);
    }
  });
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
