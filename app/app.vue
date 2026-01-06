<template>
  <UApp>
    <!-- Loading Screen (shows while initial data is loading) -->
    <LoadingScreen />
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Portal target for modals -->
    <div id="modals"></div>
  </UApp>
</template>
<script setup lang="ts">
  import { computed, watchEffect, onMounted } from 'vue';
  import { useAppInitialization } from '@/composables/useAppInitialization';
  import { useTarkovStore } from '@/stores/useTarkov';
  // Initialize app (auth, locale, migrations)
  useAppInitialization();
  // Game mode class toggler for accent color switching
  const tarkovStore = useTarkovStore();
  const gameMode = computed(() => tarkovStore.getCurrentGameMode());
  // Create a watcher that can be stopped
  const stopThemeWatcher = watchEffect(() => {
    document.documentElement.classList.toggle('pve-mode', gameMode.value === 'pve');
  });
  onUnmounted(() => {
    stopThemeWatcher();
  });
  const config = useRuntimeConfig();
  const route = useRoute();
  // Dynamically set canonical and social URLs based on current route
  useHead({
    link: [
      {
        rel: 'canonical',
        href: computed(() => `${config.public.appUrl}${route.path}`),
      },
    ],
  });
  useSeoMeta({
    ogUrl: computed(() => `${config.public.appUrl}${route.path}`),
  });
</script>
