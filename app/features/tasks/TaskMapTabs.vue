<template>
  <div v-if="show" class="mb-2 w-full">
    <div class="bg-accent-800 border-surface-700 rounded-lg border shadow-sm">
      <UTabs
        :items="tabItems"
        :model-value="selectedTabIndex"
        class="w-full"
        @update:model-value="onTabChange"
      >
        <template #default="{ item, index }">
          <div class="relative flex items-center gap-2 px-2 py-1">
            <UIcon name="i-mdi-compass" class="h-4 w-4" />
            <span>{{ item.label }}</span>
            <GameBadge
              v-if="item.count > 0"
              :color="index === selectedTabIndex ? 'primary' : 'neutral'"
              variant="solid"
              size="xs"
              badge-class="ml-1 rounded-full"
              :label="item.count.toString()"
            />
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import GameBadge from '@/components/ui/GameBadge.vue';
  interface MapData {
    id: string;
    name: string;
    mergedIds?: string[];
  }
  interface Props {
    show: boolean;
    maps: MapData[];
    taskTotals: Record<string, number>;
    activeMapView: string;
  }
  interface Emits {
    (e: 'update:activeMapView', value: string): void;
  }
  const props = defineProps<Props>();
  const emit = defineEmits<Emits>();
  const getTaskTotal = (map: MapData): number => {
    const mapId = map.mergedIds?.[0] ?? map.id;
    return (mapId && props.taskTotals[mapId]) || 0;
  };
  const tabItems = computed(() => {
    return props.maps.map((map) => ({
      label: map.name,
      id: (map.mergedIds?.[0] || map.id) as string,
      count: getTaskTotal(map),
    }));
  });
  const selectedTabIndex = computed(() => {
    return tabItems.value.findIndex((item) => item.id === props.activeMapView);
  });
  const onTabChange = (val: string | number) => {
    const index = Number(val);
    const item = tabItems.value[index];
    if (item) {
      emit('update:activeMapView', item.id);
    }
  };
</script>
