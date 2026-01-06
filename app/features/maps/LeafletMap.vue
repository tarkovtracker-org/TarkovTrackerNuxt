<template>
  <div class="relative w-full">
    <!-- Unavailable map placeholder -->
    <div
      v-if="isMapUnavailable"
      class="dark:bg-surface-900 flex h-[400px] w-full flex-col items-center justify-center rounded bg-gray-100 sm:h-[500px] lg:h-[600px]"
    >
      <UIcon name="i-mdi-map-marker-off" class="mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />
      <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-300">Map Not Available</h3>
      <p class="max-w-md text-center text-sm text-gray-600 dark:text-gray-500">
        The interactive map for {{ props.map?.name || 'this location' }} is not yet available. We
        are waiting for a compatible map to be created.
      </p>
    </div>
    <!-- Map content (only shown when map is available) -->
    <template v-else>
      <!-- Floor selector (positioned below Leaflet zoom controls) -->
      <div
        v-if="hasMultipleFloors"
        class="dark:bg-surface-800/90 absolute top-20 left-2 z-[1000] flex flex-col gap-1 rounded bg-white/90 p-1.5"
      >
        <span class="px-1 text-[10px] font-medium tracking-wide text-gray-400 uppercase">
          Floors
        </span>
        <!-- Display floors in reverse order so lowest floor is at bottom, highest at top -->
        <div class="flex flex-col-reverse gap-1">
          <UButton
            v-for="floor in floors"
            :key="floor"
            :color="floor === selectedFloor ? 'primary' : 'neutral'"
            :variant="floor === selectedFloor ? 'soft' : 'ghost'"
            size="sm"
            class="justify-start"
            @click="setFloor(floor)"
          >
            {{ floor.replace(/_/g, ' ') }}
          </UButton>
        </div>
      </div>
      <!-- Loading indicator -->
      <div
        v-if="isLoading"
        class="dark:bg-surface-900/50 absolute inset-0 z-[1001] flex items-center justify-center bg-gray-100/50"
      >
        <UIcon name="i-mdi-loading" class="text-accent-500 h-8 w-8 animate-spin" />
      </div>
      <!-- Map controls (top right) -->
      <div
        class="dark:bg-surface-800/90 absolute top-2 right-2 z-[1000] flex gap-2 rounded bg-white/90 p-1.5"
      >
        <!-- Reset view button -->
        <UButton
          color="primary"
          variant="soft"
          size="sm"
          icon="i-mdi-fit-to-screen"
          title="Reset view to default"
          @click="refreshView"
        >
          Reset
        </UButton>
        <!-- Extract toggle -->
        <UButton
          v-if="props.showExtractToggle"
          :color="showPmcExtracts ? 'primary' : 'neutral'"
          :variant="showPmcExtracts ? 'soft' : 'ghost'"
          size="sm"
          icon="i-mdi-exit-run"
          @click="showPmcExtracts = !showPmcExtracts"
        >
          PMC
        </UButton>
        <UButton
          v-if="props.showExtractToggle"
          :color="showScavExtracts ? 'primary' : 'neutral'"
          :variant="showScavExtracts ? 'soft' : 'ghost'"
          size="sm"
          icon="i-mdi-exit-run"
          @click="showScavExtracts = !showScavExtracts"
        >
          Scav
        </UButton>
      </div>
      <!-- Map container -->
      <div
        ref="mapContainer"
        class="dark:bg-surface-900 h-[400px] w-full rounded bg-gray-100 sm:h-[500px] lg:h-[600px]"
      />
      <!-- Legends Footer -->
      <div class="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <!-- Main Objective Legend -->
        <div
          v-if="props.showLegend"
          class="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-300"
        >
          <div class="flex items-center gap-1">
            <div class="h-3 w-3 rounded-full bg-[var(--color-map-marker-self)]" />
            <span>Your Objectives</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-3 w-3 rounded-full bg-[var(--color-map-marker-team)]" />
            <span>Team Objectives</span>
          </div>
          <div v-if="showPmcExtracts" class="flex items-center gap-1">
            <UIcon name="i-mdi-exit-run" class="h-3 w-3 text-[var(--color-map-extract-pmc)]" />
            <span>PMC Extract</span>
          </div>
          <div v-if="showScavExtracts" class="flex items-center gap-1">
            <UIcon name="i-mdi-exit-run" class="h-3 w-3 text-[var(--color-map-extract-scav)]" />
            <span>Scav Extract</span>
          </div>
          <div
            v-if="(showPmcExtracts || showScavExtracts) && hasSharedExtracts"
            class="flex items-center gap-1"
          >
            <UIcon name="i-mdi-exit-run" class="h-3 w-3 text-sky-400" />
            <span>Shared Extract (Either Faction)</span>
          </div>
          <div
            v-if="(showPmcExtracts || showScavExtracts) && hasCoopExtracts"
            class="flex items-center gap-1"
          >
            <UIcon name="i-mdi-exit-run" class="h-3 w-3 text-[var(--color-map-extract-coop)]" />
            <span>Co-op Extract (PMC + Scav)</span>
          </div>
        </div>
        <!-- Controls Legend -->
        <div
          class="ml-auto flex flex-wrap-reverse items-center justify-end gap-x-4 gap-y-1 text-[10px] font-medium text-gray-500 dark:text-gray-400"
        >
          <div v-if="hasMultipleFloors" class="flex items-center gap-1">
            <kbd
              class="dark:bg-surface-700 rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-700 dark:text-gray-300"
            >
              Ctrl
            </kbd>
            <span>+ Scroll to Cycle Floors</span>
          </div>
          <div class="flex items-center gap-1">
            <kbd
              class="dark:bg-surface-700 rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-700 dark:text-gray-300"
            >
              Shift
            </kbd>
            <span>+ Scroll to Zoom</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
  import { ref, watch, onUnmounted, computed, toRef } from 'vue';
  import { useLeafletMap } from '@/composables/useLeafletMap';
  import { useMetadataStore } from '@/stores/useMetadata';
  import type { TarkovMap, MapExtract } from '@/types/tarkov';
  import { logger } from '@/utils/logger';
  import { gameToLatLng, outlineToLatLngArray, isValidMapSvgConfig } from '@/utils/mapCoordinates';
  import type L from 'leaflet';
  // Types for marks (matching TarkovMap.vue structure)
  interface MapZone {
    map: { id: string };
    outline: Array<{ x: number; z: number }>;
  }
  interface MapMarkLocation {
    map: { id: string };
    positions?: Array<{ x: number; y?: number; z: number }>;
    [key: string]: unknown;
  }
  interface MapMark {
    id?: string;
    zones: MapZone[];
    possibleLocations?: MapMarkLocation[];
    users?: string[];
  }
  interface Props {
    map: TarkovMap;
    marks?: MapMark[];
    showExtracts?: boolean;
    showPmcExtracts?: boolean;
    showScavExtracts?: boolean;
    showExtractToggle?: boolean;
    showLegend?: boolean;
  }
  const props = withDefaults(defineProps<Props>(), {
    marks: () => [],
    showExtracts: true,
    showExtractToggle: true,
    showLegend: true,
  });
  const metadataStore = useMetadataStore();
  // Check if map is unavailable
  const isMapUnavailable = computed(() => {
    return props.map?.unavailable === true;
  });
  // Local state
  const mapContainer = ref<HTMLElement | null>(null);
  const showPmcExtracts = ref(props.showPmcExtracts ?? props.showExtracts);
  const showScavExtracts = ref(props.showScavExtracts ?? props.showExtracts);
  // Use the Leaflet map composable
  const {
    mapInstance,
    leaflet,
    selectedFloor,
    floors,
    hasMultipleFloors,
    isLoading,
    objectiveLayer,
    extractLayer,
    setFloor,
    refreshView,
    clearMarkers,
  } = useLeafletMap({
    containerRef: mapContainer,
    map: toRef(props, 'map'),
  });
  // Get extracts for the current map
  const mapExtracts = computed<MapExtract[]>(() => {
    if (!props.map?.extracts) return [];
    return props.map.extracts;
  });
  const isCoopExtract = (extract: MapExtract): boolean => {
    return /\bco-?op\b/i.test(extract.name || '');
  };
  const hasSharedExtracts = computed(() => {
    return mapExtracts.value.some(
      (extract) => extract.faction === 'shared' && !isCoopExtract(extract)
    );
  });
  const hasCoopExtracts = computed(() => {
    return mapExtracts.value.some(
      (extract) => extract.faction === 'shared' && isCoopExtract(extract)
    );
  });
  const popupOptions = {
    autoClose: false,
    closeOnClick: false,
    closeButton: true,
  };
  /**
   * Generates inline styles for Leaflet popups.
   * Uses dark background with light text in both themes to match app-wide tooltip pattern.
   * Leaflet injects popups outside Vue's DOM tree, so we use inline styles.
   */
  const getPopupStyles = () => {
    const isDark = document.documentElement.classList.contains('dark');
    // Tooltips are always dark (gray-900/surface-800) with light text, matching tooltip.client.ts
    return {
      container: `background-color: ${isDark ? 'var(--color-surface-800)' : '#1a1a1e'}; color: ${isDark ? 'var(--color-gray-200)' : '#fff'}; border-radius: 0.375rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);`,
      secondary: `color: var(--color-gray-400); font-size: 0.75rem;`,
    };
  };
  const attachTogglePopup = (
    layer: L.Layer,
    html: string,
    getLatLng: () => L.LatLngExpression
  ): void => {
    if (!leaflet.value || !mapInstance.value) return;
    const popup = leaflet.value.popup(popupOptions).setContent(html);
    const togglePopup = () => {
      if (!mapInstance.value) return;
      if (mapInstance.value.hasLayer(popup)) {
        popup.remove();
        return;
      }
      popup.setLatLng(getLatLng());
      popup.addTo(mapInstance.value);
    };
    layer.on('click', (event) => {
      leaflet.value?.DomEvent.stop(event);
      togglePopup();
    });
    layer.on('remove', () => {
      popup.remove();
    });
  };
  /**
   * Creates objective markers on the map.
   */
  function createObjectiveMarkers(): void {
    if (!leaflet.value || !objectiveLayer.value || !props.map) return;
    const L = leaflet.value;
    const svgConfig = props.map.svg;
    if (!isValidMapSvgConfig(svgConfig)) return;
    objectiveLayer.value.clearLayers();
    const zoneEntries: Array<{
      polygon: L.Polygon;
      area: number;
      popupContent?: string;
    }> = [];
    const pointEntries: Array<{
      marker: L.CircleMarker;
      popupContent?: string;
    }> = [];
    const calculateZoneArea = (outline: Array<{ x: number; z: number }>): number => {
      if (outline.length < 3) return 0;
      let sum = 0;
      for (let i = 0; i < outline.length; i++) {
        const current = outline[i];
        const next = outline[(i + 1) % outline.length];
        if (!current || !next) continue;
        sum += current.x * next.z - next.x * current.z;
      }
      return Math.abs(sum / 2);
    };
    // Create markers and zones, but add zones later sorted by size.
    props.marks.forEach((mark) => {
      const objective = metadataStore.objectives.find((obj) => obj.id === mark.id);
      const task = objective ? metadataStore.tasks.find((t) => t.id === objective.taskId) : null;
      const styles = getPopupStyles();
      const popupContent =
        task || objective
          ? `
          <div style="${styles.container}">
             <div>
               ${task ? `<div style="font-weight: 600; font-size: 0.875rem;">${task.name}</div>` : ''}
               ${objective ? `<div style="${styles.secondary}">${objective.description}</div>` : ''}
             </div>
           </div>
        `
          : undefined;
      // Handle point markers (possibleLocations)
      mark.possibleLocations?.forEach((location) => {
        if (location.map.id !== props.map.id) return;
        const positions = location.positions;
        if (!positions || positions.length === 0) return;
        const pos = positions[0];
        if (!pos) return;
        const latLng = gameToLatLng(pos.x, pos.z);
        const isSelf = mark.users?.includes('self') ?? false;
        const markerColor = isSelf
          ? getComputedStyle(document.documentElement)
              .getPropertyValue('--color-map-marker-self')
              .trim() || '#ef4444'
          : getComputedStyle(document.documentElement)
              .getPropertyValue('--color-map-marker-team')
              .trim() || '#f97316';
        const marker = L.circleMarker([latLng.lat, latLng.lng], {
          radius: 8,
          fillColor: markerColor,
          fillOpacity: 0.8,
          color: '#ffffff',
          weight: 2,
        });
        pointEntries.push({ marker, popupContent });
      });
      // Handle zone polygons
      mark.zones.forEach((zone) => {
        if (zone.map.id !== props.map.id) return;
        if (zone.outline.length < 3) return;
        const latLngs = outlineToLatLngArray(zone.outline);
        if (latLngs.length < 3) return;
        const isSelf = mark.users?.includes('self') ?? false;
        const zoneColor = isSelf
          ? getComputedStyle(document.documentElement)
              .getPropertyValue('--color-map-marker-self')
              .trim() || '#ef4444'
          : getComputedStyle(document.documentElement)
              .getPropertyValue('--color-map-marker-team')
              .trim() || '#f97316';
        const polygon = L.polygon(
          latLngs.map((ll) => [ll.lat, ll.lng]),
          {
            color: zoneColor,
            fillColor: zoneColor,
            fillOpacity: 0.2,
            weight: 2,
            dashArray: '5, 5',
          }
        );
        zoneEntries.push({
          polygon,
          area: calculateZoneArea(zone.outline),
          popupContent,
        });
      });
    });
    // Add larger zones first so smaller zones stay on top (clickable)
    zoneEntries
      .sort((a, b) => b.area - a.area)
      .forEach(({ polygon, popupContent }) => {
        if (popupContent) {
          attachTogglePopup(polygon, popupContent, () => polygon.getBounds().getCenter());
          polygon.bindTooltip(popupContent, {
            className: 'leaflet-tooltip-reset',
            opacity: 1,
            sticky: false,
            direction: 'top',
          });
        }
        polygon.on('mouseover', () => polygon.setStyle({ fillOpacity: 0.35, weight: 3 }));
        polygon.on('mouseout', () => polygon.setStyle({ fillOpacity: 0.2, weight: 2 }));
        objectiveLayer.value!.addLayer(polygon);
      });
    // Add point markers last so they render above zones
    pointEntries.forEach(({ marker, popupContent }) => {
      if (popupContent) {
        attachTogglePopup(marker, popupContent, () => marker.getLatLng());
        marker.bindTooltip(popupContent, {
          className: 'leaflet-tooltip-reset',
          opacity: 1,
          direction: 'top',
        });
      }
      objectiveLayer.value!.addLayer(marker);
    });
  }
  /**
   * Creates extract markers on the map.
   */
  function createExtractMarkers(): void {
    if (!leaflet.value || !extractLayer.value || !props.map) return;
    const L = leaflet.value;
    const svgConfig = props.map.svg;
    if (!isValidMapSvgConfig(svgConfig)) return;
    extractLayer.value.clearLayers();
    const showAnyExtracts = showPmcExtracts.value || showScavExtracts.value;
    if (!showAnyExtracts) return;
    mapExtracts.value.forEach((extract) => {
      if (!extract.position) return;
      const isCoop = extract.faction === 'shared' && isCoopExtract(extract);
      const shouldShow =
        extract.faction === 'pmc'
          ? showPmcExtracts.value
          : extract.faction === 'scav'
            ? showScavExtracts.value
            : showAnyExtracts;
      if (!shouldShow) return;
      const latLng = gameToLatLng(extract.position.x, extract.position.z);
      // Color based on faction
      let markerColor: string;
      switch (extract.faction) {
        case 'pmc':
          markerColor =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--color-map-extract-pmc')
              .trim() || '#22c55e';
          break;
        case 'scav':
          markerColor =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--color-map-extract-scav')
              .trim() || '#f59e0b';
          break;
        case 'shared':
          markerColor = isCoop
            ? getComputedStyle(document.documentElement)
                .getPropertyValue('--color-map-extract-coop')
                .trim() || '#0284c7'
            : '#38bdf8'; // Keep simpler blue for generic shared
          break;
        default:
          markerColor = '#3b82f6';
          break;
      }
      const iconHtml = `<span style="
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background-color: ${markerColor};
    "></span>`;
      // Create custom icon for extracts
      // Use inline styles instead of Tailwind classes since Leaflet injects these outside Vue context
      const extractIcon = L.divIcon({
        className: 'extract-marker',
        html: `<div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: #1a1a1e;
        border: 2px solid ${markerColor};
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
      ">${iconHtml}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([latLng.lat, latLng.lng], { icon: extractIcon });
      // Popup with extract info
      const factionText = isCoop
        ? 'Co-op (PMC + Scav)'
        : extract.faction
          ? extract.faction.charAt(0).toUpperCase() + extract.faction.slice(1)
          : 'Unknown';
      const extractStyles = getPopupStyles();
      const popupContent = `
      <div style="${extractStyles.container}">
        <div>
          <div style="font-weight: 600; font-size: 0.875rem;">${extract.name}</div>
          <div style="${extractStyles.secondary}">Faction: ${factionText}</div>
        </div>
      </div>
    `;
      attachTogglePopup(marker, popupContent, () => marker.getLatLng());
      extractLayer.value!.addLayer(marker);
    });
  }
  /**
   * Updates all markers on the map.
   */
  function updateMarkers(): void {
    try {
      createObjectiveMarkers();
      createExtractMarkers();
    } catch (error) {
      logger.error('Error updating map markers:', error);
    }
  }
  // Watch for changes that require marker updates
  watch(
    () => props.marks,
    () => updateMarkers(),
    { deep: true }
  );
  watch([showPmcExtracts, showScavExtracts], () => createExtractMarkers());
  watch(selectedFloor, () => {
    // Markers might need floor-based visibility in the future
    updateMarkers();
  });
  // Wait for map to be ready, then create markers
  watch(
    mapInstance,
    (instance) => {
      if (instance) {
        // Give the SVG time to load
        setTimeout(() => updateMarkers(), 500);
      }
    },
    { immediate: true }
  );
  // Watch for theme changes to update popup styles
  const colorMode = useColorMode();
  watch(() => colorMode.value, () => {
    // defer slightly to let DOM update
    setTimeout(() => updateMarkers(), 0);
  });
  // Cleanup
  onUnmounted(() => {
    clearMarkers();
  });
</script>
<style>
  /* Leaflet Map Library Overrides
     !important required throughout this section: Leaflet applies its own inline
     styles and high-specificity CSS. Without !important, our styling is overridden. */
  /* Container styling */
  :root.dark .leaflet-container {
    background-color: var(--color-surface-900);
    font-family: inherit;
  }
  .leaflet-container {
    background-color: var(--color-gray-100);
    font-family: inherit;
  }
  /* Popup wrapper - dark in both themes for consistency with app tooltips.
     Using .leaflet-container prefix for higher specificity to override Leaflet defaults. */
  .leaflet-container .leaflet-popup-content-wrapper {
    background: #1a1a1e !important;
    color: #fff !important;
    border-radius: 0.5rem !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
    border: none !important;
    padding: 0 !important;
  }
  :root.dark .leaflet-container .leaflet-popup-content-wrapper {
    background: var(--color-surface-800) !important;
    color: var(--color-gray-200) !important;
  }
  /* Popup tip (arrow) - match wrapper background */
  .leaflet-container .leaflet-popup-tip {
    background: #1a1a1e !important;
    border: none !important;
    box-shadow: none !important;
  }
  :root.dark .leaflet-container .leaflet-popup-tip {
    background: var(--color-surface-800) !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
  }
  /* Zoom controls */
  :root.dark .leaflet-control-zoom a {
    background-color: var(--color-surface-800) !important;
    color: var(--color-gray-200) !important;
    border-color: var(--color-surface-700) !important;
  }
  :root.dark .leaflet-control-zoom a:hover {
    background-color: var(--color-surface-700) !important;
  }
  .extract-marker {
    background: transparent;
    border: none;
  }
  /* Leaflet Tooltip Reset
     !important required: Leaflet tooltip has high-specificity default styles.
     We reset them completely to allow our popup content to style itself. */
  .leaflet-tooltip-reset {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .leaflet-tooltip-reset::before {
    display: none !important;
  }
</style>
