<template>
  <div
    v-if="shouldShow"
    ref="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="loading-screen-title"
    class="fixed inset-x-0 top-16 bottom-0 z-50 flex items-center justify-center bg-gray-950"
  >
    <div class="flex flex-col items-center gap-6 px-4">
      <!-- Loading Spinner or Error Icon -->
      <div class="relative">
        <UIcon
          v-if="!hasErrors"
          name="i-heroicons-arrow-path"
          class="text-primary-500 h-16 w-16 animate-spin"
        />
        <UIcon v-else name="i-heroicons-exclamation-triangle" class="text-warning-500 h-16 w-16" />
      </div>
      <!-- Loading/Error Message -->
      <div class="flex flex-col items-center gap-2 text-center">
        <h2
          id="loading-screen-title"
          class="focus-visible:ring-primary-500 rounded-sm text-xl font-semibold text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
        >
          {{ hasErrors ? 'Loading Issue' : 'Loading Tarkov Tracker' }}
        </h2>
        <p class="text-sm text-gray-400">
          {{ hasErrors ? 'Some data failed to load' : 'Downloading required game data...' }}
        </p>
      </div>
      <!-- Loading Progress Details -->
      <div class="flex flex-col gap-2 text-xs text-gray-500">
        <div class="flex items-center gap-2">
          <UIcon
            :name="getStatusIcon(metadataStore.loading, metadataStore.error)"
            :class="getStatusClass(metadataStore.loading, metadataStore.error)"
          />
          <span>Tasks, Maps & Traders</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon
            :name="getStatusIcon(metadataStore.hideoutLoading, metadataStore.hideoutError)"
            :class="getStatusClass(metadataStore.hideoutLoading, metadataStore.hideoutError)"
          />
          <span>Hideout Stations</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon
            :name="getStatusIcon(metadataStore.prestigeLoading, metadataStore.prestigeError)"
            :class="getStatusClass(metadataStore.prestigeLoading, metadataStore.prestigeError)"
          />
          <span>Prestige Data</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon
            :name="getStatusIcon(metadataStore.editionsLoading, metadataStore.editionsError)"
            :class="getStatusClass(metadataStore.editionsLoading, metadataStore.editionsError)"
          />
          <span>Game Editions</span>
        </div>
      </div>
      <!-- User Reassurance or Error Actions -->
      <div v-if="!hasErrors" class="mt-4 max-w-md text-center text-xs text-gray-600">
        This may take a moment on first load. Data will be cached for future visits.
      </div>
      <div v-else class="mt-4 flex flex-col items-center gap-3">
        <p class="max-w-md text-center text-xs text-gray-500">
          The app can still work with partial data. You can retry or continue anyway.
        </p>
        <div class="flex gap-3">
          <UButton color="primary" variant="solid" @click="handleRetry">Retry</UButton>
          <UButton color="neutral" variant="outline" @click="handleContinue">
            Continue Anyway
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { useMetadataStore } from '@/stores/useMetadata';
  const metadataStore = useMetadataStore();
  const userDismissed = ref(false);
  const overlay = ref<HTMLElement | null>(null);
  const previousActiveElement = ref<HTMLElement | null>(null);
  const inertElements = ref<Element[]>([]);
  // Check if any critical data is still loading or if store isn't ready
  const isLoading = computed(() => {
    return (
      !metadataStore.hasInitialized ||
      metadataStore.loading ||
      metadataStore.hideoutLoading ||
      metadataStore.prestigeLoading ||
      metadataStore.editionsLoading
    );
  });
  // Check if there are any errors
  const hasErrors = computed(() => {
    return !!(
      metadataStore.error ||
      metadataStore.hideoutError ||
      metadataStore.prestigeError ||
      metadataStore.editionsError
    );
  });
  // Show loading screen if loading or has errors (unless user dismissed)
  const shouldShow = computed(() => {
    if (userDismissed.value) return false;
    return isLoading.value || hasErrors.value;
  });
  // Handle accessibility and focus management
  function trapFocus(e: KeyboardEvent) {
    if (!overlay.value || e.key !== 'Tab') return;
    const focusableElements = overlay.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  }
  function setSiblingsInert(inert: boolean) {
    if (inert) {
      if (!overlay.value) return;
      const parent = overlay.value.parentElement;
      if (!parent) return;
      Array.from(parent.children).forEach((child) => {
        if (child !== overlay.value && child.nodeType === 1) {
          child.setAttribute('inert', '');
          child.setAttribute('aria-hidden', 'true');
          inertElements.value.push(child);
        }
      });
    } else {
      inertElements.value.forEach((el) => {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      });
      inertElements.value = [];
    }
  }
  const handleVisibilityChange = async (isVisible: boolean) => {
    if (isVisible) {
      previousActiveElement.value = document.activeElement as HTMLElement;
      await nextTick();
      const title = document.getElementById('loading-screen-title');
      if (title) {
        title.setAttribute('tabindex', '-1');
        title.focus();
      }
      window.addEventListener('keydown', trapFocus);
      setSiblingsInert(true);
    } else {
      window.removeEventListener('keydown', trapFocus);
      setSiblingsInert(false);
      if (previousActiveElement.value) {
        previousActiveElement.value.focus();
      }
    }
  };
  watch(shouldShow, (newVal) => {
    handleVisibilityChange(newVal);
  });
  onMounted(() => {
    if (shouldShow.value) {
      handleVisibilityChange(true);
    }
  });
  onUnmounted(() => {
    window.removeEventListener('keydown', trapFocus);
    setSiblingsInert(false);
  });
  function getStatusIcon(loading: boolean, error: Error | null): string {
    if (error) return 'i-heroicons-x-circle';
    if (loading) return 'i-heroicons-arrow-path';
    return 'i-heroicons-check-circle';
  }
  function getStatusClass(loading: boolean, error: Error | null): string {
    const baseClass = 'h-4 w-4';
    if (error) return `${baseClass} text-error-500`;
    if (loading) return `${baseClass} animate-spin text-primary-500`;
    return `${baseClass} text-green-500`;
  }
  function handleRetry() {
    // Reset dismissal status so the loading screen can appear again if retry fails
    userDismissed.value = false;
    // Refresh all data
    metadataStore.fetchAllData(true);
  }
  function handleContinue() {
    // Dismiss the loading screen and let user proceed with partial data
    userDismissed.value = true;
  }
</script>
