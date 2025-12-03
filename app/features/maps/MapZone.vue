<template>
  <div
    :style="zoneStyle"
    :class="zoneColor"
    @mouseenter="showTooltip()"
    @mouseleave="hideTooltip()"
    @click="forceTooltipToggle()"
  ></div>
  <div v-if="tooltipVisible" :style="tooltipStyle">
    <div class="bg-accent-800 border-surface-700 m-0 rounded border px-1 pt-2 shadow-md">
      <task-link :task="relatedTask" show-wiki-link />
      <task-objective
        v-if="props.mark.id"
        :objective="objectives.find((obj) => obj.id == props.mark.id)"
      />
    </div>
  </div>
</template>
<script setup>
  import { computed, defineAsyncComponent, ref } from 'vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  const TaskObjective = defineAsyncComponent(() => import('@/features/tasks/TaskObjective'));
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink'));
  const metadataStore = useMetadataStore();
  const objectives = computed(() => metadataStore.objectives);
  const tasks = computed(() => metadataStore.tasks);
  const props = defineProps({
    mark: {
      type: Object,
      required: true,
    },
    zoneLocation: {
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
  const zoneColor = computed(() => {
    if (tooltipVisible.value) return 'text-success-500';
    return props.mark.users.includes('self') ? 'text-error-500' : 'text-warning-500';
  });
  const relativeLocation = computed(() => {
    // Determine the leftmost x position in the array of zone positions
    // Take the bounds of the map and figure out the initial relative position
    const mapLeft = props.map.svg.bounds[0][0];
    const mapTop = props.map.svg.bounds[0][1];
    const mapWidth =
      Math.max(props.map.svg.bounds[0][0], props.map.svg.bounds[1][0]) -
      Math.min(props.map.svg.bounds[0][0], props.map.svg.bounds[1][0]);
    const mapHeight =
      Math.max(props.map.svg.bounds[0][1], props.map.svg.bounds[1][1]) -
      Math.min(props.map.svg.bounds[0][1], props.map.svg.bounds[1][1]);
    // Apply coordinate rotation to the outline points
    const coordinateRotation = props.map?.svg?.coordinateRotation || 0;
    const outlinePercents = [];
    props.zoneLocation.outline.forEach((outline) => {
      // Get original coordinates
      const originalX = outline.x;
      const originalZ = outline.z;
      // Apply coordinate rotation if specified
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
      // Calculate relative values using the coordinate system of the map
      const relativeLeft = Math.abs(x - mapLeft);
      const relativeTop = Math.abs(z - mapTop);
      // Calculate relative values relative to the map container
      const relativeLeftPercent = (relativeLeft / mapWidth) * 100;
      const relativeTopPercent = (relativeTop / mapHeight) * 100;
      outlinePercents.push({
        leftPercent: relativeLeftPercent,
        topPercent: relativeTopPercent,
      });
    });
    // Find the bounds of the outline
    const leftPercent = outlinePercents.reduce((min, current) => {
      return current.leftPercent < min ? current.leftPercent : min;
    }, outlinePercents[0].leftPercent);
    const topPercent = outlinePercents.reduce((min, current) => {
      return current.topPercent < min ? current.topPercent : min;
    }, outlinePercents[0].topPercent);
    const rightPercent = outlinePercents.reduce((max, current) => {
      return current.leftPercent > max ? current.leftPercent : max;
    }, outlinePercents[0].leftPercent);
    const bottomPercent = outlinePercents.reduce((max, current) => {
      return current.topPercent > max ? current.topPercent : max;
    }, outlinePercents[0].topPercent);
    // Now, calculate the percentages internally to the div based on the bounds
    const internalPercents = [];
    outlinePercents.forEach((outline) => {
      const internalLeftPercent =
        ((outline.leftPercent - leftPercent) / (rightPercent - leftPercent)) * 100;
      const internalTopPercent =
        ((outline.topPercent - topPercent) / (bottomPercent - topPercent)) * 100;
      internalPercents.push({
        leftPercent: internalLeftPercent,
        topPercent: internalTopPercent,
      });
    });
    return {
      leftPercent: leftPercent,
      topPercent: topPercent,
      rightPercent: rightPercent,
      bottomPercent: bottomPercent,
      internalPercents: internalPercents,
    };
  });
  const zoneStyle = computed(() => {
    return {
      position: 'absolute',
      top: relativeLocation.value.topPercent + '%',
      left: relativeLocation.value.leftPercent + '%',
      width: relativeLocation.value.rightPercent - relativeLocation.value.leftPercent + '%',
      height: relativeLocation.value.bottomPercent - relativeLocation.value.topPercent + '%',
      'clip-path':
        'polygon(' +
        relativeLocation.value.internalPercents
          .map((point) => {
            return point.leftPercent + '% ' + point.topPercent + '%';
          })
          .join(', ') +
        ')',
      background: tooltipVisible.value
        ? 'linear-gradient(90deg, rgba(155, 165, 0, 0.5) 0%, rgba(155, 165, 0, 0.5) 100%)'
        : 'linear-gradient(90deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%)',
      'border-style': 'dashed',
      // cursor: props.mark.floor === props.selectedFloor ? "pointer" : "inherit",
      // opacity: props.mark.floor === props.selectedFloor ? 1 : 0.2,
      cursor: 'pointer',
      opacity: 1,
    };
  });
  const tooltipStyle = computed(() => {
    return {
      position: 'absolute',
      top: relativeLocation.value.topPercent + '%',
      left: relativeLocation.value.leftPercent + '%',
      transform: 'translate(-50%, -125%)',
      zIndex: 100,
    };
  });
</script>
