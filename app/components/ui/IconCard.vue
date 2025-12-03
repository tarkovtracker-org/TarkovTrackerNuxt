<template>
  <div class="relative mt-2 rounded-lg bg-[rgba(33,33,33,1)] shadow-md">
    <div
      class="absolute -top-4 left-4 flex h-16 w-16 items-center justify-center rounded-full shadow-md"
      :class="`bg-${props.iconBackground}`"
    >
      <UIcon
        :name="props.icon.startsWith('mdi-') ? `i-${props.icon}` : props.icon"
        class="h-8 w-8"
        :class="`text-${props.iconColor}`"
      />
    </div>
    <div class="flex min-h-12 items-center p-2 pb-0 pl-24 text-left text-xl font-medium">
      <slot name="stat"></slot>
    </div>
    <div class="p-2 pt-6 text-center">
      <slot name="content"></slot>
    </div>
  </div>
</template>
<script setup>
  const props = defineProps({
    icon: {
      type: String,
      default: 'mdi-check-all',
      required: false,
    },
    iconBackground: {
      type: String,
      default: 'accent',
      required: false,
    },
    iconColor: {
      type: String,
      default: 'secondary',
      required: false,
    },
  });
</script>
