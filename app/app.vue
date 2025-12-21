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
  import { computed } from 'vue';
  import { useAppInitialization } from '@/composables/useAppInitialization';
  // Initialize app (auth, locale, migrations)
  useAppInitialization();
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
