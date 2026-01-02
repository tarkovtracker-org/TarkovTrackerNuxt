<template>
  <!-- 
    The root element is a div/span that receives the v-tooltip directive. 
    This provides a stable, single-element root for the directive, 
    preventing "Runtime directive used on component with non-element root node" warnings.
  -->
  <div v-if="tooltip" v-tooltip="tooltip" class="inline-flex" v-bind="wrapperAttrs">
    <UBadge
      v-bind="$attrs"
      :size="size"
      :color="color"
      :variant="variant"
      :class="badgeClass"
    >
      <slot>
        <UIcon v-if="icon" :name="icon" class="h-3 w-3" aria-hidden="true" />
        <span v-if="label">{{ label }}</span>
      </slot>
    </UBadge>
  </div>
  <UBadge
    v-else
    v-bind="$attrs"
    :size="size"
    :color="color"
    :variant="variant"
    :class="badgeClass"
  >
    <slot>
      <UIcon v-if="icon" :name="icon" class="h-3 w-3" aria-hidden="true" />
      <span v-if="label">{{ label }}</span>
    </slot>
  </UBadge>
</template>

<script setup lang="ts">
  /**
   * GameBadge.vue
   * A wrapper around UBadge that provides a stable root element for tooltips.
   */
  const props = withDefaults(
    defineProps<{
      label?: string;
      icon?: string;
      tooltip?: string | object;
      size?: string;
      color?: string;
      variant?: string;
      badgeClass?: any;
      wrapperAttrs?: any;
    }>(),
    {
      size: 'xs',
      color: 'gray',
      variant: 'solid',
    }
  );

  defineOptions({
    inheritAttrs: false,
  });
</script>
