<template>
  <div
    class="group relative"
    :class="[containerClasses, { 'h-full w-full': size !== 'small', 'cursor-pointer': clickable }]"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Simple image display mode (for ItemImage compatibility) -->
    <GameItemImage
      v-if="simpleMode"
      :src="computedImageSrc"
      :item-name="computedItemName"
      :background-color="resolvedBackgroundColor"
      :fill="fill"
      :size="size"
      :is-visible="isVisible"
      :no-border="noBorder"
    />
    <!-- Full item display mode (for TarkovItem compatibility) -->
    <div v-else class="relative flex h-full w-full items-center justify-start">
      <GameItemImage
        class="relative mr-2 flex shrink-0 items-center justify-center rounded"
        :src="computedImageSrc"
        :item-name="computedItemName"
        :background-color="resolvedBackgroundColor"
        :size="size"
      >
        <!-- Hover action buttons - centered overlay on image -->
        <div
          v-if="showActions && (computedWikiLink || computedDevLink)"
          class="absolute inset-0 z-20 flex items-center justify-center gap-1 rounded bg-surface-900/80 opacity-0 transition-opacity group-hover:opacity-100"
        >
            <a
              v-if="computedWikiLink"
              v-tooltip="'View on Wiki'"
              :href="computedWikiLink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center rounded p-0.5 text-gray-200 transition-colors hover:bg-white/20 hover:text-white"
              @click.stop
            >
              <img src="/img/logos/wikilogo.webp" alt="Wiki" :class="overlayIconClasses" />
            </a>
            <a
              v-if="computedDevLink"
              v-tooltip="'View on tarkov.dev'"
              :href="computedDevLink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center rounded p-0.5 text-gray-200 transition-colors hover:bg-white/20 hover:text-white"
              @click.stop
            >
              <img src="/img/logos/tarkovdevlogo.webp" alt="tarkov.dev" :class="overlayIconClasses" />
            </a>
        </div>
      </GameItemImage>
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
      <div v-else-if="props.count" class="mr-2 text-sm font-medium text-gray-600 dark:text-gray-300">
        {{ formatNumber(props.count) }}
      </div>
      <div
        v-if="computedItemName"
        class="flex items-center justify-center text-center text-sm leading-tight font-bold text-gray-900 dark:text-white"
      >
        {{ computedItemName }}
      </div>
    </div>
    <!-- Context Menu -->
    <ContextMenu ref="contextMenu">
      <template #default="{ close }">
        <!-- Task Options -->
        <template v-if="props.taskWikiLink">
          <ContextMenuItem
            icon="/img/logos/wikilogo.webp"
            :label="`View Task on Wiki`"
            @click="
              openTaskWiki();
              close();
            "
          />
          <div
            v-if="computedWikiLink || computedDevLink || computedItemName"
            class="my-1 border-t border-gray-700"
          />
        </template>
        <!-- Item Options -->
        <ContextMenuItem
          v-if="computedItemName && computedWikiLink"
          icon="/img/logos/wikilogo.webp"
          :label="`View ${computedItemName} on Wiki`"
          @click="
            openWikiLink();
            close();
          "
        />
        <ContextMenuItem
          v-if="computedItemName && computedDevLink"
          icon="/img/logos/tarkovdevlogo.webp"
          :label="`View ${computedItemName} on Tarkov.dev`"
          @click="
            openTarkovDevLink();
            close();
          "
        />
        <template v-if="!computedItemName">
          <ContextMenuItem
            v-if="computedWikiLink"
            icon="/img/logos/wikilogo.webp"
            label="View on Wiki"
            @click="
              openWikiLink();
              close();
            "
          />
          <ContextMenuItem
            v-if="computedDevLink"
            icon="/img/logos/tarkovdevlogo.webp"
            label="View on Tarkov.dev"
            @click="
              openTarkovDevLink();
              close();
            "
          />
        </template>
        <div
          v-if="computedItemName && (computedWikiLink || computedDevLink)"
          class="my-1 border-t border-gray-700"
        />
        <ContextMenuItem
          v-if="computedItemName"
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
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  import type { TarkovItem } from '@/types/tarkov';
  import ContextMenu from './ContextMenu.vue';
  import ContextMenuItem from './ContextMenuItem.vue';
  import GameItemImage from './GameItemImage.vue';

  const ItemCountControls = defineAsyncComponent(
    () => import('@/features/neededitems/ItemCountControls.vue')
  );

  interface Props {
    /**
     * The primary item object. When provided, many other props (itemName, backgroundColor, etc.) are resolved automatically.
     */
    item?: TarkovItem | null;
    // Basic item identification (Legacy - prefer item prop)
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
    size?: 'xs' | 'small' | 'medium' | 'large';
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
    // Fill parent container (for simpleMode)
    fill?: boolean;
    // Legacy compatibility
    noBorder?: boolean;
    /** @deprecated use item prop */
    imageItem?: {
      iconLink?: string;
      image512pxLink?: string;
      backgroundColor?: string;
    };
  }
  const props = withDefaults(defineProps<Props>(), {
    item: null,
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
    fill: false,
    noBorder: false,
    imageItem: undefined,
  });
  const emit = defineEmits<{
    click: [event: MouseEvent];
    increase: [];
    decrease: [];
    toggle: [];
  }>();

  const formatNumber = useLocaleNumberFormatter();
  const contextMenu = ref<InstanceType<typeof ContextMenu>>();

  const computedImageSrc = computed(() => {
    // Priority: direct src -> direct links -> item object -> itemId
    if (props.src) return props.src;
    if (props.iconLink) return props.iconLink;
    if (props.image512pxLink && props.size === 'large') return props.image512pxLink;
    
    if (props.item) {
      if (props.size === 'large' && props.item.image512pxLink) return props.item.image512pxLink;
      return props.item.iconLink || props.item.image8xLink || props.item.image512pxLink || '';
    }

    // Legacy imageItem support
    if (props.imageItem?.iconLink) return props.imageItem.iconLink;
    if (props.imageItem?.image512pxLink && props.size === 'large')
      return props.imageItem.image512pxLink;
    
    if (props.itemId) return `https://assets.tarkov.dev/${props.itemId}-icon.webp`;
    return '';
  });

  const computedItemName = computed(() => {
    return props.itemName || props.item?.name || props.item?.shortName || null;
  });

  const computedWikiLink = computed(() => {
    return props.wikiLink || props.item?.wikiLink || null;
  });

  const computedDevLink = computed(() => {
    return props.devLink || props.item?.link || null;
  });

  const containerClasses = computed(() => {
    if (props.simpleMode) {
      return 'block';
    }
    return '';
  });

  const resolvedBackgroundColor = computed(() => {
    return (
      props.backgroundColor ||
      props.item?.backgroundColor ||
      props.imageItem?.backgroundColor ||
      'default'
    )
  });

  const overlayIconClasses = computed(() => {
    if (props.size === 'xs') {
      return 'h-3.5 w-3.5';
    }
    return 'h-5 w-5';
  });

  // Action methods
  const openTarkovDevLink = () => {
    const link = computedDevLink.value;
    if (link) {
      window.open(link, '_blank');
    }
  };

  const openWikiLink = () => {
    const link = computedWikiLink.value;
    if (link) {
      window.open(link, '_blank');
    }
  };

  const copyItemName = () => {
    const name = computedItemName.value;
    if (name) {
      navigator.clipboard.writeText(name);
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (props.clickable) {
      emit('click', event);
    }
  };

  const handleContextMenu = (event: MouseEvent) => {
    // Only show context menu if there are links available
    if (computedDevLink.value || computedWikiLink.value || computedItemName.value || props.taskWikiLink) {
      contextMenu.value?.open(event);
    }
  };

  const openTaskWiki = () => {
    if (props.taskWikiLink) {
      window.open(props.taskWikiLink, '_blank');
    }
  };
</script>
