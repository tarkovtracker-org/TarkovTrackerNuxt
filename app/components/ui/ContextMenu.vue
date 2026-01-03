<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        ref="menuRef"
        class="context-menu fixed z-9999 min-w-45 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
        :style="{ top: `${y}px`, left: `${x}px` }"
        @click.stop
      >
        <slot :close="close" />
      </div>
    </Transition>
  </Teleport>
</template>
<script setup lang="ts">
  import { onClickOutside } from '@vueuse/core';
  import { nextTick, ref } from 'vue';
  const visible = ref(false);
  const x = ref(0);
  const y = ref(0);
  const menuRef = ref<HTMLElement>();
  const open = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    x.value = event.clientX;
    y.value = event.clientY;
    visible.value = true;
    // Adjust position if menu goes off-screen
    nextTick(() => {
      if (menuRef.value) {
        const rect = menuRef.value.getBoundingClientRect();
        const padding = 8; // padding from edge of screen
        // Adjust horizontal position
        if (rect.right > window.innerWidth - padding) {
          x.value = Math.max(padding, window.innerWidth - rect.width - padding);
        }
        // Adjust vertical position
        if (rect.bottom > window.innerHeight - padding) {
          y.value = Math.max(padding, window.innerHeight - rect.height - padding);
        }
        // Ensure menu doesn't go off left or top edge
        if (x.value < padding) x.value = padding;
        if (y.value < padding) y.value = padding;
      }
    });
  };
  const close = () => {
    visible.value = false;
  };
  // Close on click outside
  onClickOutside(menuRef, close);
  // Close on escape key
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && visible.value) {
      close();
    }
  };
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
  });
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
  defineExpose({ open, close });
</script>
