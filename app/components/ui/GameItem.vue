<template>
  <div
    class="group relative cursor-default"
    :class="[containerClasses, { 'h-full w-full': size !== 'small' }]"
    @mouseenter="linkHover = true"
    @mouseleave="linkHover = false"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Simple image display mode (for ItemImage compatibility) -->
    <div v-if="simpleMode" :class="['relative overflow-hidden', imageContainerClasses]">
      <img
        v-if="isVisible && computedImageSrc"
        :src="computedImageSrc"
        :class="['h-full w-full object-contain', imageClasses]"
        loading="lazy"
        @error="handleImgError"
      />
      <div
        v-else
        :class="[
          'flex h-full w-full items-center justify-center rounded bg-surface-800',
          imageClasses,
        ]"
      >
        <UIcon name="i-mdi-loading" class="h-6 w-6 animate-spin text-gray-400" />
      </div>
    </div>
    <!-- Full item display mode (for TarkovItem compatibility) -->
    <div
      v-else
      class="flex h-full w-full items-center justify-start transition-all duration-200"
      :class="{ 'opacity-50': linkHover && showActions }"
    >
      <div class="mr-2 flex items-center justify-center">
        <img
          :width="imageSize"
          :height="imageSize"
          :src="computedImageSrc"
          :class="imageClasses"
          class="rounded"
          alt="Item Icon"
          @error="handleImgError"
        />
      </div>
      <!-- Counter controls for multi-item objectives -->
      <div v-if="showCounter" class="mr-2" @click.stop>
        <ItemCountControls
          :current-count="currentCount"
          :needed-count="neededCount"
          @decrease="emit('decrease')"
          @increase="emit('increase')"
          @toggle="emit('toggle')"
        />
      </div>
      <!-- Simple count display for single items -->
      <div v-else-if="props.count" class="mr-2 text-sm font-medium text-gray-300">
        {{ props.count.toLocaleString() }}
      </div>
      <div
        v-if="props.itemName"
        class="flex items-center justify-center text-center text-sm leading-tight font-bold text-white"
      >
        {{ props.itemName }}
      </div>
    </div>
    <!-- Hover actions (only in full mode) -->
    <!-- Removed hover overlay as per request -->
    <!-- Context Menu -->
    <ContextMenu ref="contextMenu">
      <template #default="{ close }">
        <!-- Task Options -->
        <template v-if="props.taskWikiLink">
          <ContextMenuItem
            icon="i-mdi-wikipedia"
            :label="`View Task on Wiki`"
            @click="
              openTaskWiki();
              close();
            "
          />
          <div
            v-if="props.wikiLink || props.devLink || props.itemName"
            class="my-1 border-t border-gray-700"
          />
        </template>
        <!-- Item Options -->
        <ContextMenuItem
          v-if="props.itemName && props.wikiLink"
          icon="i-mdi-wikipedia"
          :label="`View ${props.itemName} on Wiki`"
          @click="
            openWikiLink();
            close();
          "
        />
        <ContextMenuItem
          v-if="props.itemName && props.devLink"
          icon="i-mdi-web"
          :label="`View ${props.itemName} on Tarkov.dev`"
          @click="
            openTarkovDevLink();
            close();
          "
        />
        <template v-if="!props.itemName">
          <ContextMenuItem
            v-if="props.wikiLink"
            icon="i-mdi-wikipedia"
            label="View on Wiki"
            @click="
              openWikiLink();
              close();
            "
          />
          <ContextMenuItem
            v-if="props.devLink"
            icon="i-mdi-web"
            label="View on Tarkov.dev"
            @click="
              openTarkovDevLink();
              close();
            "
          />
        </template>
        <div
          v-if="props.itemName && (props.wikiLink || props.devLink)"
          class="my-1 border-t border-gray-700"
        />
        <ContextMenuItem
          v-if="props.itemName"
          icon="i-mdi-content-copy"
          label="Copy Item Name"
          @click="
            copyItemName();
            close();
          "
        />
      </template>
    </ContextMenu>
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, ref } from 'vue';
  import { logger } from '@/utils/logger';
  import ContextMenu from './ContextMenu.vue';
  import ContextMenuItem from './ContextMenuItem.vue';
  const ItemCountControls = defineAsyncComponent(
    () => import('@/features/neededitems/ItemCountControls.vue')
  );
  interface Props {
    // Basic item identification
    itemId?: string;
    itemName?: string | null;
    // Image sources (multiple options for flexibility)
    src?: string;
    iconLink?: string;
    image512pxLink?: string;
    // External links
    devLink?: string | null;
    wikiLink?: string | null;
    // Task context (for showing task options in context menu)
    taskId?: string | null;
    taskName?: string | null;
    taskWikiLink?: string | null;
    // Display options
    count?: number | null;
    size?: 'small' | 'medium' | 'large';
    simpleMode?: boolean;
    showActions?: boolean;
    isVisible?: boolean;
    backgroundColor?: string;
    // Click handling
    clickable?: boolean;
    // Counter controls
    showCounter?: boolean;
    currentCount?: number;
    neededCount?: number;
    // Legacy compatibility
    imageItem?: {
      iconLink?: string;
      image512pxLink?: string;
      backgroundColor?: string;
    };
  }
  const props = withDefaults(defineProps<Props>(), {
    itemId: '',
    itemName: null,
    src: '',
    iconLink: '',
    image512pxLink: '',
    devLink: null,
    wikiLink: null,
    taskId: null,
    taskName: null,
    taskWikiLink: null,
    count: null,
    size: 'medium',
    simpleMode: false,
    showActions: true,
    isVisible: true,
    backgroundColor: '',
    clickable: false,
    showCounter: false,
    currentCount: 0,
    neededCount: 1,
    imageItem: undefined,
  });
  const emit = defineEmits<{
    click: [event: MouseEvent];
    increase: [];
    decrease: [];
    toggle: [];
  }>();
  const backgroundClassMap = {
    violet: 'bg-brand-900',
    grey: 'bg-surface-900',
    yellow: 'bg-warning-900',
    orange: 'bg-warning-950',
    green: 'bg-success-950',
    red: 'bg-error-900',
    black: 'bg-surface-950',
    blue: 'bg-secondary-900',
    default: 'bg-transparent',
  } as const;
  type BackgroundKey = keyof typeof backgroundClassMap;
  const linkHover = ref(false);
  const contextMenu = ref<InstanceType<typeof ContextMenu>>();
  // Compute image source based on available props
  const computedImageSrc = computed(() => {
    // Priority order: explicit src > iconLink > imageItem.iconLink > generated from itemId
    if (props.src) return props.src;
    if (props.iconLink) return props.iconLink;
    if (props.imageItem?.iconLink) return props.imageItem.iconLink;
    if (props.imageItem?.image512pxLink && props.size === 'large')
      return props.imageItem.image512pxLink;
    if (props.itemId) return `https://assets.tarkov.dev/${props.itemId}-icon.webp`;
    return '';
  });
  // Compute display properties based on size
  const imageSize = computed(() => {
    switch (props.size) {
      case 'small':
        return 64;
      case 'large':
        return 104;
      case 'medium':
      default:
        return 84;
    }
  });
  const containerClasses = computed(() => {
    if (props.simpleMode) {
      return 'block';
    }
    return '';
  });
  const imageContainerClasses = computed(() => {
    const classes = ['block', 'shrink-0', 'relative', 'overflow-hidden'];
    if (props.size === 'small') {
      classes.push('h-16', 'w-16'); // 64px
    } else if (props.size === 'large') {
      classes.push('h-28', 'w-28'); // 112px
    } else {
      classes.push('h-24', 'w-24'); // 96px
    }
    return classes;
  });
  const imageClasses = computed(() => {
    const classes: string[] = ['rounded'];
    const bgColor = (
      props.backgroundColor || props.imageItem?.backgroundColor || 'default'
    ).toLowerCase() as BackgroundKey;
    const backgroundClass: string =
      backgroundClassMap[bgColor] ?? backgroundClassMap.default;
    classes.push(backgroundClass);
    return classes;
  });
  // Image error handling
  const handleImgError = () => {
    // Log error for debugging if needed
    logger.warn(`[GameItem] Failed to load image for item: ${props.itemId || 'unknown'}`);
  };
  // Action methods
  const openTarkovDevLink = () => {
    if (props.devLink) {
      window.open(props.devLink, '_blank');
    }
  };
  const openWikiLink = () => {
    if (props.wikiLink) {
      window.open(props.wikiLink, '_blank');
    }
  };
  const copyItemName = () => {
    if (props.itemName) {
      navigator.clipboard.writeText(props.itemName);
    }
  };
  const handleClick = (event: MouseEvent) => {
    if (props.clickable) {
      emit('click', event);
    }
  };
  const handleContextMenu = (event: MouseEvent) => {
    // Only show context menu if there are links available
    if (props.devLink || props.wikiLink || props.itemName || props.taskWikiLink) {
      contextMenu.value?.open(event);
    }
  };
  const openTaskWiki = () => {
    if (props.taskWikiLink) {
      window.open(props.taskWikiLink, '_blank');
    }
  };
</script>
