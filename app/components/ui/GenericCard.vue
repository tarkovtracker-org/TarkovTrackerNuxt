<template>
  <div
    class="dark:bg-surface-800 dark:border-surface-700 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md"
    :class="{ 'h-full': props.fillHeight, [props.cardClass]: true }"
  >
    <div class="m-0 h-full p-0">
      <div class="flex h-full flex-col">
        <!-- Header Section -->
        <header v-if="hasHeader" class="relative w-full">
          <!-- Slot for custom header content -->
          <slot name="header">
            <!-- Default header with icon and title -->
            <div
              v-if="props.title || props.icon"
              class="flex items-center justify-between gap-4 pr-4 pb-2 text-xl"
              :class="headerClasses"
            >
              <!-- Left side content (icon and title) -->
              <div class="flex items-center gap-3">
                <!-- Icon or Image -->
                <span
                  v-if="props.icon || props.avatar"
                  :class="highlightClasses"
                  class="group-hover:scale-105"
                >
                  <img
                    v-if="props.avatar"
                    :src="props.avatar"
                    :height="avatarHeight"
                    :style="{ height: `${avatarHeight}px` }"
                    class="block pt-0 drop-shadow-md"
                    :class="avatarClass"
                  />
                  <UIcon
                    v-else
                    :name="props.icon?.startsWith('mdi-') ? `i-${props.icon}` : props.icon"
                    :class="
                      props.iconColor
                        ? `text-${props.iconColor}`
                        : props.highlightColor
                          ? ''
                          : 'text-content-primary'
                    "
                    class="h-[50px] w-[50px] drop-shadow-md"
                  />
                </span>
                <!-- Title -->
                <span
                  v-if="props.title"
                  class="text-content-primary inline-block text-left leading-6"
                  :class="titleClasses"
                >
                  {{ props.title }}
                </span>
              </div>
              <!-- Right side content -->
              <div
                v-if="$slots['title-right'] || props.subtitle"
                class="flex items-center gap-2 text-right"
              >
                <slot name="title-right">
                  <span v-if="props.subtitle" class="dark:text-surface-400 text-xs text-gray-500">
                    {{ props.subtitle }}
                  </span>
                </slot>
              </div>
            </div>
          </slot>
          <!-- Divider (only if there's content below) -->
          <div
            v-if="showDivider && (hasContent || hasFooter)"
            class="dark:border-surface-700 mx-4 border-b border-gray-200"
          ></div>
        </header>
        <!-- Content Section -->
        <main v-if="hasContent" class="mt-2 w-full grow" :class="contentClasses">
          <slot name="content"></slot>
        </main>
        <!-- Footer Section -->
        <footer v-if="hasFooter" class="mt-auto w-full pb-1" :class="footerClasses">
          <slot name="footer"></slot>
        </footer>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  interface Props {
    // Header props
    title?: string;
    subtitle?: string;
    icon?: string;
    avatar?: string;
    iconColor?: string;
    titleClasses?: string;
    headerClasses?: string;
    // Styling props
    highlightColor?: 'green' | 'blue' | 'red' | 'tan' | 'purple' | 'secondary' | 'accent' | 'error';
    fillHeight?: boolean;
    showDivider?: boolean;
    // Layout props
    contentClasses?: string;
    footerClasses?: string;
    cardClass?: string;
    // Avatar props
    avatarHeight?: number;
    avatarClass?: string;
  }
  const props = withDefaults(defineProps<Props>(), {
    title: '',
    subtitle: '',
    icon: '',
    avatar: '',
    iconColor: undefined,
    titleClasses: '',
    headerClasses: '',
    highlightColor: 'accent',
    fillHeight: true,
    showDivider: true,
    contentClasses: '',
    footerClasses: '',
    cardClass: '',
    avatarHeight: 50,
    avatarClass: '',
  });
  // Compute slot existence
  const slots = useSlots();
  const hasHeader = computed(() => !!(slots.header || props.title || props.icon || props.avatar));
  const hasContent = computed(() => !!slots.content);
  const hasFooter = computed(() => !!slots.footer);
  const highlightClasses = computed(() => {
    const classes: Record<string, boolean> = {};
    // Map highlight colors to Premium Badge utilities
    switch (props.highlightColor) {
      case 'green':
        classes['badge-premium-green'] = true;
        break;
      case 'blue':
        classes['badge-premium-blue'] = true;
        break;
      case 'red':
      case 'error':
        classes['badge-premium-red'] = true;
        break;
      case 'tan':
        classes['badge-premium-tan'] = true;
        break;
      case 'purple':
        classes['badge-premium-purple'] = true;
        break;
      case 'secondary':
        classes['badge-premium-secondary'] = true;
        break;
      case 'accent':
      default:
        classes['badge-premium-accent'] = true;
        break;
    }
    return classes;
  });
</script>
