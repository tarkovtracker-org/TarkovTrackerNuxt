<template>
  <div
    class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
    @click="handleClick"
  >
    <img v-if="isImagePath" :src="icon" :alt="label" class="h-4 w-4 shrink-0" />
    <UIcon v-else-if="icon" :name="icon" class="h-4 w-4 shrink-0" />
    <span>{{ label }}</span>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  interface Props {
    label: string;
    icon?: string;
  }
  const props = defineProps<Props>();
  const emit = defineEmits<{
    click: [];
  }>();
  const isImagePath = computed(() => {
    if (!props.icon) return false;
    return (
      props.icon.startsWith('/') ||
      props.icon.startsWith('http') ||
      props.icon.endsWith('.webp') ||
      props.icon.endsWith('.png') ||
      props.icon.endsWith('.svg') ||
      props.icon.endsWith('.jpg') ||
      props.icon.endsWith('.jpeg')
    );
  });
  const handleClick = () => {
    emit('click');
  };
</script>
