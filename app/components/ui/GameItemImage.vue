<template>
  <div
    :class="[
      'bg-stash-cell relative overflow-hidden rounded',
      containerClasses,
      imageElementClasses,
      'flex items-center justify-center',
    ]"
  >
    <div :class="['overlay-stash-bg absolute inset-0', resolvedBackgroundClass]"></div>
    <img
      v-if="isVisible && props.src && !hasError"
      :src="props.src"
      :alt="alt || itemName || 'Item'"
      :class="[
        'relative z-1 max-h-full max-w-full rounded object-contain p-1',
        imageElementClasses,
      ]"
      loading="lazy"
      @error="handleImgError"
    />
    <div
      v-else-if="hasError"
      :class="[
        'bg-surface-elevated flex h-full w-full items-center justify-center rounded',
        imageElementClasses,
      ]"
    >
      <UIcon name="i-mdi-image-off-outline" class="text-content-tertiary h-6 w-6" />
    </div>
    <div
      v-else
      :class="[
        'bg-surface-800 flex h-full w-full items-center justify-center rounded',
        imageElementClasses,
      ]"
    >
      <UIcon name="i-mdi-loading" class="h-6 w-6 animate-spin text-gray-400" />
    </div>
    <!-- Slot for overlays (like hover actions) -->
    <slot />
  </div>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  interface Props {
    src?: string;
    alt?: string;
    itemName?: string | null;
    backgroundColor?: string;
    size?: 'xs' | 'small' | 'medium' | 'large' | 'fluid';
    isVisible?: boolean;
  }
  const props = withDefaults(defineProps<Props>(), {
    src: '',
    alt: '',
    itemName: null,
    backgroundColor: 'default',
    size: 'medium',
    isVisible: true,
  });
  const containerClasses = computed(() => {
    // Fluid mode: fills parent container, maintains square aspect ratio
    if (props.size === 'fluid') {
      return ['block', 'relative', 'w-full', 'aspect-square'];
    }
    // Fixed sizes
    const classes = ['block', 'relative', 'shrink-0'];
    if (props.size === 'xs') {
      classes.push('h-9', 'w-9');
    } else if (props.size === 'small') {
      classes.push('h-16', 'w-16');
    } else if (props.size === 'large') {
      classes.push('h-32', 'w-32');
    } else {
      classes.push('h-24', 'w-24');
    }
    return classes;
  });
  const backgroundClassMap = {
    violet: 'bg-[var(--color-stash-violet)]',
    grey: 'bg-[var(--color-stash-grey)]',
    yellow: 'bg-[var(--color-stash-yellow)]',
    orange: 'bg-[var(--color-stash-orange)]',
    green: 'bg-[var(--color-stash-green)]',
    red: 'bg-[var(--color-stash-red)]',
    black: 'bg-[var(--color-stash-black)]',
    blue: 'bg-[var(--color-stash-blue)]',
    default: 'bg-[var(--color-stash-default)]',
  } as const;
  type BackgroundKey = keyof typeof backgroundClassMap;
  const resolvedBackgroundClass = computed(() => {
    const bgColor = (props.backgroundColor || 'default').toLowerCase() as BackgroundKey;
    return backgroundClassMap[bgColor] ?? backgroundClassMap.default;
  });
  const imageElementClasses = ['rounded'];
  const hasError = ref(false);
  // Reset error state when src changes
  watch(
    () => props.src,
    () => {
      hasError.value = false;
    }
  );
  const handleImgError = () => {
    hasError.value = true;
    console.warn(`[GameItemImage] Failed to load image: ${props.src}`);
  };
</script>
