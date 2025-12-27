<template>
  <div
    :style="markerStyle"
    :class="markerColor"
    @mouseenter="showTooltip()"
    @mouseleave="hideTooltip()"
    @click.stop="forceTooltipToggle()"
  >
    <UIcon
      :name="tooltipVisible == true ? 'i-mdi-map-marker-radius' : 'i-mdi-map-marker'"
      class="h-5 w-5"
    />
  </div>
  <div v-if="tooltipVisible" :style="tooltipStyle">
    <div class="bg-accent-800 border-surface-700 m-0 rounded border px-1 pt-2 shadow-md">
      <task-link v-if="relatedTask" :task="relatedTask" show-wiki-link />
      <task-objective v-if="relatedObjective" :objective="relatedObjective" />
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { logger } from '@/utils/logger';
  import type { CSSProperties } from 'vue';
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink.vue'));
  const TaskObjective = defineAsyncComponent(() => import('@/features/tasks/TaskObjective.vue'));
  const metadataStore = useMetadataStore();
  const objectives = computed(() => metadataStore.objectives);
  const tasks = computed(() => metadataStore.tasks);
  const props = defineProps({
    mark: {
      type: Object,
      required: true,
    },
    markLocation: {
      type: Object,
      required: true,
    },
    selectedFloor: {
      type: String,
      required: false,
      default: '',
    },
    map: {
      type: Object,
      required: true,
    },
  });
  const forceTooltip = ref(false);
  const hoverTooltip = ref(false);
  const forceTooltipToggle = () => {
    forceTooltip.value = !forceTooltip.value;
  };
  const showTooltip = () => {
    hoverTooltip.value = true;
  };
  const hideTooltip = () => {
    hoverTooltip.value = false;
  };
  const tooltipVisible = computed(() => {
    //if (props.mark.floor !== props.selectedFloor) return false;
    return forceTooltip.value || hoverTooltip.value;
  });
  const relatedObjective = computed(() => {
    return objectives.value.find((obj) => obj.id == props.mark.id);
  });
  const relatedTask = computed(() => {
    return tasks.value.find((task) => task.id == relatedObjective.value?.taskId);
  });
  const markerColor = computed(() => {
    return props.mark.users.includes('self') ? 'text-red-500' : 'text-orange-500';
  });
  const relativeLocation = computed(() => {
    // Add safety check for bounds
    const bounds = props.map?.svg?.bounds;
    if (
      !bounds ||
      !Array.isArray(bounds) ||
      bounds.length < 2 ||
      !Array.isArray(bounds[0]) ||
      !Array.isArray(bounds[1])
    ) {
      logger.warn('MapMarker: Invalid or missing map bounds for map:', props.map?.name);
      return { leftPercent: 0, topPercent: 0 }; // Return default if bounds are invalid
    }
    // Get original coordinates
    const originalX = props.markLocation.positions[0].x;
    const originalZ = props.markLocation.positions[0].z;
    // Apply coordinate rotation if specified (but keep original bounds)
    const coordinateRotation = props.map?.svg?.coordinateRotation || 0;
    let x = originalX;
    let z = originalZ;
    if (coordinateRotation === 90) {
      // Rotate 90 degrees: (x, z) -> (-z, x)
      x = -originalZ;
      z = originalX;
    } else if (coordinateRotation === 180) {
      // Rotate 180 degrees: (x, z) -> (-x, -z)
      x = -originalX;
      z = -originalZ;
    } else if (coordinateRotation === 270) {
      // Rotate 270 degrees: (x, z) -> (z, -x)
      x = originalZ;
      z = -originalX;
    }
    // Use original bounds (not rotated)
    const mapLeft = bounds[0][0];
    const mapTop = bounds[0][1];
    const mapWidth = Math.max(bounds[0][0], bounds[1][0]) - Math.min(bounds[0][0], bounds[1][0]);
    const mapHeight = Math.max(bounds[0][1], bounds[1][1]) - Math.min(bounds[0][1], bounds[1][1]);
    // Prevent division by zero if width or height is 0
    if (mapWidth === 0 || mapHeight === 0) {
      logger.warn('MapMarker: Map width or height is zero for map:', props.map?.name);
      return { leftPercent: 0, topPercent: 0 };
    }
    const relativeLeft = Math.abs(x - mapLeft);
    const relativeTop = Math.abs(z - mapTop);
    const relativeLeftPercent = (relativeLeft / mapWidth) * 100;
    const relativeTopPercent = (relativeTop / mapHeight) * 100;
    return {
      leftPercent: relativeLeftPercent,
      topPercent: relativeTopPercent,
    };
  });
  const markerStyle = computed<CSSProperties>(() => {
    return {
      position: 'absolute',
      top: relativeLocation.value.topPercent + '%',
      left: relativeLocation.value.leftPercent + '%',
      width: '20px',
      height: '20px',
      transform: 'translate(-50%, -50%)',
      // cursor: props.mark.floor === props.selectedFloor ? "pointer" : "inherit",
      // opacity: props.mark.floor === props.selectedFloor ? 1 : 0.2,
      cursor: 'pointer',
      opacity: 1,
    };
  });
  const tooltipStyle = computed<CSSProperties>(() => {
    return {
      position: 'absolute',
      top: relativeLocation.value.topPercent + '%',
      left: relativeLocation.value.leftPercent + '%',
      transform: 'translate(-50%, -125%)',
      zIndex: 100,
      pointerEvents: 'auto', 
    };
  });
</script>
