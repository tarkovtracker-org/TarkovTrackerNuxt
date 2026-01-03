<template>
  <div
    class="bg-surface-950 relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 text-center font-mono sm:p-6 lg:p-8"
  >
    <!-- CRT Scanline Effect -->
    <div class="pointer-events-none absolute inset-0 z-0 opacity-10">
      <div
        class="scanline via-primary-500/10 absolute inset-0 h-full w-full bg-linear-to-b from-transparent to-transparent"
      ></div>
    </div>
    <!-- Background Grid -->
    <div
      class="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_center,black_40%,transparent_100%)] bg-size-[40px_40px]"
    ></div>
    <div class="relative z-10 w-full max-w-2xl space-y-6 sm:space-y-8 lg:space-y-10">
      <!-- Icon/Illustration with Glitch Effect -->
      <div
        class="group bg-surface-900 hover:ring-primary-500/50 relative mx-auto flex h-24 w-24 cursor-pointer items-center justify-center rounded-full ring-1 ring-white/10 transition-all sm:h-32 sm:w-32 lg:h-40 lg:w-40"
        @click="triggerGlitch"
      >
        <UIcon
          name="i-mdi-radar"
          class="text-primary-500 h-12 w-12 transition-all duration-100 sm:h-16 sm:w-16 lg:h-20 lg:w-20"
          :class="{ 'animate-pulse': !isGlitching, 'text-error-500 translate-x-1': isGlitching }"
        />
        <div
          class="bg-surface-950 absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-white/10 sm:-top-2 sm:-right-2 sm:h-10 sm:w-10 lg:h-12 lg:w-12"
        >
          <span class="text-error-500 text-lg font-bold sm:text-xl lg:text-2xl">?</span>
        </div>
      </div>
      <!-- Content -->
      <div class="space-y-2 sm:space-y-3 lg:space-y-4">
        <h1
          class="text-surface-50 text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl"
          :class="{ 'glitch-text': isGlitching }"
          :data-text="errorTitle"
        >
          {{ errorTitle }}
        </h1>
        <p
          class="text-surface-400 mx-auto max-w-xs text-sm sm:max-w-md sm:text-base lg:max-w-lg lg:text-lg"
        >
          {{ errorDescription }}
        </p>
      </div>
      <!-- Loot Mini-Game Area -->
      <div
        class="bg-surface-900/50 mx-auto min-h-25 w-full max-w-xs rounded-lg border border-white/5 p-3 backdrop-blur-sm sm:min-h-35 sm:max-w-sm sm:p-4 lg:min-h-45 lg:max-w-md lg:p-6"
      >
        <transition name="fade" mode="out-in">
          <!-- State: Initial -->
          <div
            v-if="lootState === 'idle'"
            class="flex flex-col items-center gap-2 sm:gap-3 lg:gap-4"
          >
            <p class="text-surface-300 text-xs italic sm:text-sm lg:text-base">
              "Looks like someone left something behind..."
            </p>
            <UButton
              size="md"
              color="neutral"
              variant="ghost"
              icon="i-mdi-magnify"
              class="hover:text-primary-400"
              @click="startSearch"
            >
              Search Area
            </UButton>
          </div>
          <!-- State: Searching -->
          <div
            v-else-if="lootState === 'searching'"
            class="flex flex-col items-center gap-3 py-2 sm:gap-4 sm:py-4"
          >
            <UIcon
              name="i-mdi-loading"
              class="text-primary-500 h-8 w-8 animate-spin sm:h-10 sm:w-10 lg:h-12 lg:w-12"
            />
            <div class="w-full space-y-1 sm:space-y-2">
              <div class="text-primary-400 flex justify-between text-xs sm:text-sm">
                <span>Searching...</span>
                <span>{{ searchProgress }}%</span>
              </div>
              <UProgress :value="searchProgress" color="primary" size="sm" />
            </div>
          </div>
          <!-- State: Found -->
          <div
            v-else-if="lootState === 'found' && foundItem"
            class="flex flex-col items-center gap-2 sm:gap-3 lg:gap-4"
          >
            <div
              class="text-primary-400 animate-pulse text-[10px] tracking-widest uppercase sm:text-xs lg:text-sm"
            >
              Item Found!
            </div>
            <AppTooltip :text="`View ${foundItem.name} on tarkov.dev`">
              <a
                :href="foundItem.link"
                :aria-label="`View ${foundItem.name} on tarkov.dev`"
                target="_blank"
                rel="noopener noreferrer"
                class="bg-surface-950 hover:ring-primary-500/50 hover:bg-surface-900 group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 ring-1 ring-white/10 transition-all sm:gap-4 sm:px-5 sm:py-4 lg:gap-5 lg:px-6 lg:py-5"
              >
                <!-- Item Image -->
                <div
                  v-if="foundItem.isRealItem"
                  class="relative h-14 w-14 shrink-0 transition-transform group-hover:scale-105 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
                >
                  <img
                    :src="foundItem.icon"
                    class="h-full w-full object-contain drop-shadow-lg"
                    :alt="foundItem.name"
                    loading="eager"
                    @error="handleImageError"
                  />
                  <div
                    class="pointer-events-none absolute inset-0 rounded bg-linear-to-t from-black/20 to-transparent"
                  ></div>
                </div>
                <!-- Fallback Icon -->
                <div
                  v-else
                  class="bg-surface-800 flex h-14 w-14 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
                >
                  <UIcon
                    :name="foundItem.icon"
                    class="h-8 w-8 sm:h-12 sm:w-12 lg:h-14 lg:w-14"
                    :class="foundItem.colorClass"
                  />
                </div>
                <!-- Item Details -->
                <div class="min-w-0 flex-1 text-left">
                  <div
                    class="text-surface-50 group-hover:text-primary-400 truncate text-sm font-bold transition-colors sm:text-base lg:text-lg"
                    :class="foundItem.textClass"
                  >
                    {{ foundItem.name }}
                  </div>
                  <div
                    class="mt-0.5 text-[10px] tracking-wider uppercase sm:mt-1 sm:text-xs lg:text-sm"
                    :class="getRarityBadgeClass(foundItem.rarity)"
                  >
                    {{ foundItem.rarity }}
                  </div>
                  <div
                    class="text-surface-500 mt-1 flex items-center gap-1 text-[9px] opacity-0 transition-opacity group-hover:opacity-100 sm:text-[10px]"
                  >
                    <UIcon name="i-mdi-open-in-new" class="h-3 w-3" />
                    <span>View on tarkov.dev</span>
                  </div>
                </div>
              </a>
            </AppTooltip>
            <UButton
              size="xs"
              color="neutral"
              variant="link"
              class="mt-1 text-xs opacity-60 hover:opacity-100 sm:mt-2 sm:text-sm"
              @click="resetSearch"
            >
              Search Again
            </UButton>
          </div>
        </transition>
      </div>
      <!-- Main Actions - Primary Focus -->
      <div class="flex flex-col items-center justify-center gap-4 pt-4 sm:pt-6 lg:pt-8">
        <UButton
          size="xl"
          color="primary"
          variant="solid"
          icon="i-mdi-home"
          class="ring-primary-500/30 hover:ring-primary-500/60 px-6 py-3 text-base ring-2 transition-all hover:scale-105 sm:px-8 sm:py-4 sm:text-lg lg:px-10 lg:text-xl"
          @click="handleError"
        >
          Return to Hideout
        </UButton>
      </div>
      <!-- Tech Info -->
      <div class="text-surface-600 pt-2 font-mono text-[10px] opacity-40 sm:pt-4 sm:text-xs">
        Error {{ error.statusCode }}::{{ error.message }}
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useLootGame, getRarityBadgeClass } from '@/composables/useLootGame';
  import type { NuxtError } from '#app';
  const props = defineProps({
    error: {
      type: Object as () => NuxtError,
      required: true,
    },
  });
  const handleError = () => clearError({ redirect: '/' });
  // --- Text & Glitch Logic ---
  const errorTitle = computed(() =>
    props.error.statusCode === 404 ? 'Missing in Action' : 'Extraction Failed'
  );
  const errorDescription = computed(() =>
    props.error.statusCode === 404
      ? 'The page you are looking for has been extracted or does not exist.'
      : 'An unexpected error occurred while processing your request.'
  );
  const isGlitching = ref(false);
  const triggerGlitch = () => {
    if (isGlitching.value) return;
    isGlitching.value = true;
    setTimeout(() => (isGlitching.value = false), 200);
    setTimeout(() => (isGlitching.value = true), 300);
    setTimeout(() => (isGlitching.value = false), 400);
  };
  // --- Loot Mini-Game Logic ---
  const {
    lootState,
    searchProgress,
    foundItem,
    startSearch,
    resetSearch,
    activateEasterEgg,
    handleImageError,
  } = useLootGame();
  // --- Cheat Code Easter Egg (BSG) ---
  const cheatCode = ['b', 's', 'g'];
  let cheatCodeIndex = 0;
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === cheatCode[cheatCodeIndex]) {
      cheatCodeIndex++;
      if (cheatCodeIndex === cheatCode.length) {
        activateEasterEgg(triggerGlitch);
        cheatCodeIndex = 0;
      }
    } else {
      cheatCodeIndex = 0;
    }
  };
  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>
