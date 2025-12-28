<template>
  <div class="flex flex-col gap-4">
    <!-- Map Display -->
    <div v-if="selectedMap" class="relative">
      <TarkovMap
        :key="selectedMapId"
        :map="selectedMap"
        :marks="[]"
        :task-objectives="objectivesForSelectedMap"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useMetadataStore } from '@/stores/useMetadata';
import { usePreferencesStore } from '@/stores/usePreferences';
import type { Task, TaskObjective } from '@/types/tarkov';
const props = defineProps<{
  tasks: Task[];
}>();
const metadataStore = useMetadataStore();
const { mapsWithSvg: maps } = storeToRefs(metadataStore);
const preferencesStore = usePreferencesStore();
const { getTaskMapView } = storeToRefs(preferencesStore);
const allObjectives = computed(() => {
  return props.tasks.flatMap(task => task.objectives || []);
});
const selectedMapId = computed({
  get: () => getTaskMapView.value,
  set: (val) => preferencesStore.setTaskMapView(val),
});
const selectedMap = computed(() => {
    return maps.value.find(m => m.id === selectedMapId.value);
});
const objectivesForSelectedMap = computed(() => {
    if (!selectedMap.value) return [];
    return allObjectives.value.filter(obj => {
        return obj.maps?.some(m => m.id === selectedMap.value.id);
    });
});
// Method to be called from parent page
const centerOnObjective = (objective: TaskObjective) => {
  if (objective.maps && objective.maps.length > 0) {
    selectedMapId.value = objective.maps[0].id;
    // TODO: Highlight the marker
  }
};
defineExpose({
  centerOnObjective,
});
</script>
