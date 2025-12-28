<template>
  <div class="container mx-auto">
    <div class="flex flex-col gap-4">
      <div class="w-full">
        <template v-if="isSvgObject(props.map?.svg) && sortedFloors.length > 0">
          <template v-for="(floor, floorIndex) in sortedFloors" :key="floorIndex">
            <UButton
              variant="solid"
              :color="floor === selectedFloor ? 'success' : 'white'"
              class="mx-2"
              :class="{
                'text-green-500 hover:bg-gray-200': floor !== selectedFloor,
              }"
              @click="setFloor(floor)"
            >
              {{ floor.replace('_', ' ') }}
            </UButton>
          </template>
        </template>
      </div>
      <div class="w-full">
        <div :id="randomMapId" style="position: relative; width: 100%">
          <MapZone
            v-for="(zone, zoneLocationIndex) in sortedZones"
            :key="zoneLocationIndex"
            :mark="zone.mark"
            :zone-location="zone.zone"
            :selected-floor="selectedFloor"
            :map="props.map"
          />
          <template v-for="(mark, markIndex) in allMarks" :key="markIndex">
            <template
              v-for="(markLocation, markLocationIndex) in mark.possibleLocations"
              :key="markLocationIndex"
            >
              <MapMarker
                v-if="markLocation.map.id === props.map.id"
                :key="markLocationIndex"
                :mark="mark"
                :mark-location="markLocation"
                :selected-floor="selectedFloor"
                :map="props.map"
              />
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { select, xml } from 'd3';
  import { storeToRefs } from 'pinia';
  import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useProgressStore } from '@/stores/useProgress';
  import type { TarkovMap, TaskObjective } from '@/types/tarkov';
  import { logger } from '@/utils/logger';
  interface Props {
    map: TarkovMap;
    marks?: MapMark[];
    taskObjectives?: TaskObjective[];
  }
  type MapZoneOutline = { x: number; z: number }[];
  type MapZoneType = { map: { id: string }; outline: MapZoneOutline };
  type MapMarkLocation = { map: { id: string }; [key: string]: unknown };
  type MapMark = { id: string; users: string[]; zones: MapZoneType[]; possibleLocations?: MapMarkLocation[] };
  const randomMapId = ref(crypto.randomUUID());
  const props = withDefaults(defineProps<Props>(), {
    marks: () => [],
    taskObjectives: () => [],
  });
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const { objectiveCompletions } = storeToRefs(progressStore);
const objectiveMarks = computed(() => {
    if (!props.taskObjectives) return [];
    const userView = preferencesStore.getTaskUserView;
    return props.taskObjectives
      .filter((objective) => {
        const hasLocations = (objective.possibleLocations?.length ?? 0) > 0 || (objective.zones?.length ?? 0) > 0;
        const completions = objectiveCompletions.value?.[objective.id];
        const isCompleted =
          userView === 'all'
            ? !!completions &&
              Object.values(completions).length > 0 &&
              Object.values(completions).every(Boolean)
            : completions?.[userView] ?? false;
        return hasLocations && !isCompleted;
      })
      .map((objective) => {
        const cleanZones: MapZoneType[] = (objective.zones || [])
          .filter((z) => z.outline && z.outline.length > 0)
          .map((z) => ({
            map: z.map,
            outline: z.outline!.map((p) => ({ x: p.x, z: p.z }))
          }));
        const cleanLocations = (objective.possibleLocations || []) as unknown as MapMarkLocation[];
        return {
          id: objective.id,
          users: ['self'],
          possibleLocations: cleanLocations,
          zones: cleanZones, 
        };
      });
  });
  const sortedFloors = computed(() => {
    const svg = props.map?.svg;
    if (!isSvgObject(svg) || !svg.floors) {
      return [];
    }
    const floors = [...svg.floors];
    return floors.sort((a, b) => {
      const aIsUnderground = a.toLowerCase().includes('underground');
      const bIsUnderground = b.toLowerCase().includes('underground');
      if (aIsUnderground && !bIsUnderground) {
        return -1;
      }
      if (!aIsUnderground && bIsUnderground) {
        return 1;
      }
      return 0;
    });
  });
  const allMarks = computed(() => {
    return [...props.marks, ...objectiveMarks.value];
  });
  const MapMarker = defineAsyncComponent(() => import('~/features/maps/MapMarker.vue'));
  const MapZone = defineAsyncComponent(() => import('~/features/maps/MapZone.vue'));
  // Type guard to check if svg is an object with floors property
  const isSvgObject = (
    svg: unknown
  ): svg is {
    file: string;
    floors: string[];
    defaultFloor: string;
    coordinateRotation: number;
    bounds: number[][];
  } => {
    return svg !== null && svg !== undefined && typeof svg === 'object' && 'floors' in svg;
  };
  const selectedFloor = ref<string | undefined>(
    (() => {
      const svg = props.map?.svg;
      if (isSvgObject(svg)) {
        return svg.defaultFloor ?? sortedFloors.value?.[sortedFloors.value.length - 1];
      }
      return undefined;
    })()
  );
  // Cache for Factory floors to avoid refetching
  const factoryFloorsCache = ref<Map<string, Document>>(new Map());
  const isFactoryLoaded = ref(false);
  // trapezoidal form of the shoelace formula
  // https://en.wikipedia.org/wiki/Shoelace_formula
  const polygonArea = (points: MapZoneOutline) => {
    if (!points || points.length === 0) return 0;
    let area = 0;
    let j = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      const currentPoint = points[i];
      const prevPoint = points[j];
      if (currentPoint && prevPoint) {
        area += (prevPoint.x + currentPoint.x) * (prevPoint.z - currentPoint.z);
      }
      j = i;
    }
    return Math.abs(area / 2);
  };
const sortedZones = computed(() => {
    const zones: { zone: MapZoneType; mark: MapMark }[] = [];
    for (const mark of allMarks.value) {
      if (!mark.zones) continue;
      for (const zone of mark.zones) {
        if (zone.map.id === props.map.id) {
          zones.push({ zone, mark });
        }
      }
    }
    return zones.slice().sort((a, b) => polygonArea(b.zone.outline) - polygonArea(a.zone.outline));
  });
  const setFloor = (floor: string) => {
    selectedFloor.value = floor;
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;
    if (props.map.name?.toLowerCase() === 'factory' && isFactoryLoaded.value) {
      updateFactoryFloorVisibility();
    } else {
        const mapSvg = props.map?.svg;
        if (isSvgObject(mapSvg) && selectedFloor.value && sortedFloors.value && sortedFloors.value.length > 0) {
        const floors = sortedFloors.value;
        const selectedFloorIndex = floors.indexOf(selectedFloor.value);
        if (selectedFloorIndex !== -1) {
            floors.forEach((f: string, index: number) => {
                const floorElement = select(mapContainer).select('svg').select(`#${f}`);
                if (index > selectedFloorIndex) {
                    floorElement.style('opacity', 0.02);
                } else {
                    floorElement.style('opacity', 1);
                }
            });
        }
      }
    }
  };
  watch(
    () => props.map,
    (newMap) => {
      // Reset cache when map changes
      factoryFloorsCache.value.clear();
      isFactoryLoaded.value = false;
      draw();
      // Safely update selectedFloor only if floors exist, prioritize defaultFloor
      const svg = newMap?.svg;
      if (isSvgObject(svg)) {
        selectedFloor.value = svg.defaultFloor ?? sortedFloors.value?.[sortedFloors.value.length - 1] ?? undefined;
      } else {
        selectedFloor.value = undefined;
      }
    }
  );
  const draw = async () => {
    // Add check for map svg data before proceeding
    const svg = props.map?.svg;
    if (!svg || !isSvgObject(svg) || !svg.file) {
      logger.warn('Map SVG file info missing, skipping draw.');
      // Clear existing SVG if any
      select(document.getElementById(randomMapId.value)).selectAll('svg').remove();
      return;
    }
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;
    // Clear existing content
    select(mapContainer).selectAll('svg').remove();
    // Check if this is Factory - handle multi-file floor stacking
    if (props.map.name?.toLowerCase() === 'factory') {
      await drawFactoryFloors(mapContainer);
    } else {
      // Handle other maps with single SVG file containing all floors
      await drawStandardMap(mapContainer);
    }
  };
  const drawFactoryFloors = async (mapContainer: HTMLElement) => {
    const svg = props.map?.svg;
    if (!isSvgObject(svg) || !sortedFloors.value || !selectedFloor.value) {
      return;
    }
    const floors = sortedFloors.value;
    // Create a single main SVG container (like other maps do)
    const mainSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mainSvg.style.width = '100%';
    mainSvg.style.height = '100%';
    mainSvg.id = 'factory-main-svg';
    // Load all floors if not cached, or use cached versions
    let viewBoxSet = false;
    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      if (!floor) continue;
      try {
        let floorSvg;
        // Check cache first
        if (factoryFloorsCache.value.has(floor)) {
          floorSvg = factoryFloorsCache.value.get(floor);
        } else {
          // Load and cache the floor
          floorSvg = await xml(`/img/maps/Factory-${floor}.svg`);
          factoryFloorsCache.value.set(floor, floorSvg);
        }
        if (floorSvg && floorSvg.documentElement) {
          // Set the viewBox from the first floor SVG to ensure proper scaling
          if (!viewBoxSet && floorSvg.documentElement.getAttribute('viewBox')) {
            const viewBox = floorSvg.documentElement.getAttribute('viewBox');
            if (viewBox) {
              mainSvg.setAttribute('viewBox', viewBox);
            }
            viewBoxSet = true;
          }
          // Create a group for this floor
          const floorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          floorGroup.id = floor;
          // Copy all children from the loaded SVG to our group
          const svgChildren = Array.from(floorSvg.documentElement.children) as Element[];
          svgChildren.forEach((child) => {
            floorGroup.appendChild(child.cloneNode(true));
          });
          // Append the group to our main SVG
          mainSvg.appendChild(floorGroup);
        }
      } catch (error) {
        logger.error(`Failed to load Factory floor: ${floor}`, error);
      }
    }
    // Append the main SVG to the container
    mapContainer.appendChild(mainSvg);
    isFactoryLoaded.value = true;
    // Apply initial floor visibility
    updateFactoryFloorVisibility();
  };
  const updateFactoryFloorVisibility = () => {
    const mapSvg = props.map?.svg;
    if (!isSvgObject(mapSvg) || !sortedFloors.value || !selectedFloor.value) return;
    const floors = sortedFloors.value;
    const selectedFloorIndex = floors.indexOf(selectedFloor.value);
    if (selectedFloorIndex === -1) return;
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;
    const svgElement = mapContainer.querySelector('#factory-main-svg');
    if (!svgElement) return;
    // Show floors from basement up to selected floor, hide floors above
    floors.forEach((floor: string, index: number) => {
      const floorGroup = svgElement.querySelector(`#${floor}`);
      if (floorGroup && floorGroup instanceof SVGGElement) {
        if (index <= selectedFloorIndex) {
          floorGroup.style.display = 'block';
          floorGroup.style.opacity = '1';
        } else {
          floorGroup.style.display = 'none';
        }
      }
    });
  };
  const drawStandardMap = async (mapContainer: HTMLElement) => {
    // Use remote SVG files for other maps
    const mapSvgData = props.map?.svg;
    if (!isSvgObject(mapSvgData)) return;
    const svgUrl = `https://tarkovtracker.github.io/tarkovdata/maps/${mapSvgData.file}`;
    try {
      const svgDoc = await xml(svgUrl);
      if (!svgDoc?.documentElement) return;
      mapContainer.appendChild(svgDoc.documentElement);
      select(mapContainer).select('svg').style('width', '100%');
      select(mapContainer).select('svg').style('height', '100%');
    } catch (error) {
      logger.error(`Failed to load map SVG: ${svgUrl}`, error);
      return;
    }
    // Reorder floor layers to fix display issue
    const svgElement = select(mapContainer).select('svg');
    const floorElements = [];
    for (const floor of sortedFloors.value) {
        const floorElement = svgElement.select(`#${floor}`);
        if (!floorElement.empty()) {
            floorElements.push(floorElement.node());
            floorElement.remove();
        }
    }
    floorElements.forEach(floorNode => svgElement.node().appendChild(floorNode));
    // Apply floor visibility logic for standard maps
    const mapSvg = props.map?.svg;
    if (isSvgObject(mapSvg) && selectedFloor.value && sortedFloors.value && sortedFloors.value.length > 0) {
      const floors = sortedFloors.value;
      const selectedFloorIndex = floors.indexOf(selectedFloor.value);
      if (selectedFloorIndex !== -1) {
        floors.forEach((floor: string, index: number) => {
          if (index > selectedFloorIndex) {
            select(mapContainer).select('svg').select(`#${floor}`).style('opacity', 0.02);
          }
        });
      }
    }
  };
  onMounted(() => {
    draw();
  });
</script>