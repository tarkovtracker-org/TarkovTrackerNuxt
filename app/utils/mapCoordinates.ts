/**
 * Map coordinate transformation utilities for Leaflet integration.
 * Uses tarkov.dev's approach with custom CRS and L.Transformation.
 */
import type L from 'leaflet';
export interface MapBounds {
  /** [x, z] coordinate of first corner */
  corner1: [number, number];
  /** [x, z] coordinate of second corner */
  corner2: [number, number];
}
export interface MapSvgConfig {
  file: string;
  floors: string[];
  defaultFloor: string;
  coordinateRotation: number;
  transform?: [number, number, number, number];
  bounds: number[][];
  /** Separate bounds for SVG overlay (if different from marker bounds) */
  svgBounds?: number[][];
  /** Whether lower floors should remain visible when a higher floor is selected */
  stackFloors?: boolean;
}
/**
 * Applies coordinate rotation using trigonometric functions.
 * This matches tarkov.dev's rotation implementation.
 * @param latLng LatLng object with lat and lng properties
 * @param rotation Rotation in degrees
 * @returns Rotated LatLng object
 */
export function applyRotation(
  latLng: { lat: number; lng: number },
  rotation: number
): { lat: number; lng: number } {
  if (rotation === 0) {
    return latLng;
  }
  const angleInRadians = (rotation * Math.PI) / 180;
  const cos = Math.cos(angleInRadians);
  const sin = Math.sin(angleInRadians);
  return {
    lat: latLng.lat * cos - latLng.lng * sin,
    lng: latLng.lat * sin + latLng.lng * cos,
  };
}
/**
 * Creates a custom CRS for the map using tarkov.dev's approach.
 * Uses L.Transformation with the map's transform array.
 * @param L Leaflet instance
 * @param svgConfig Map SVG configuration with transform and rotation
 * @returns Custom CRS for the map
 */
export function createMapCRS(L: typeof import('leaflet'), svgConfig: MapSvgConfig): L.CRS {
  let scaleX = 1;
  let scaleY = 1;
  let marginX = 0;
  let marginY = 0;
  if (svgConfig.transform) {
    scaleX = svgConfig.transform[0];
    scaleY = svgConfig.transform[2] * -1; // Negate Y scale like tarkov.dev
    marginX = svgConfig.transform[1];
    marginY = svgConfig.transform[3];
  }
  const rotation = svgConfig.coordinateRotation || 0;
  // Create custom CRS extending L.CRS.Simple
  return L.Util.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(scaleX, marginX, scaleY, marginY),
    projection: L.Util.extend({}, L.Projection.LonLat, {
      project: (latLng: L.LatLng) => {
        const rotated = applyRotation({ lat: latLng.lat, lng: latLng.lng }, rotation);
        return L.Projection.LonLat.project(L.latLng(rotated.lat, rotated.lng));
      },
      unproject: (point: L.Point) => {
        const unproj = L.Projection.LonLat.unproject(point);
        const rotated = applyRotation({ lat: unproj.lat, lng: unproj.lng }, -rotation);
        return L.latLng(rotated.lat, rotated.lng);
      },
    }),
  }) as L.CRS;
}
/**
 * Converts game position to Leaflet LatLng using tarkov.dev's approach.
 * Simply swaps z and x: lat = z, lng = x
 * The CRS transformation handles scaling and rotation.
 * @param position Game position with x and z coordinates
 * @returns Leaflet-compatible [lat, lng] array
 */
export function pos(position: { x: number; z: number }): [number, number] {
  return [position.z, position.x];
}
/**
 * Converts game coordinates to Leaflet LatLng.
 * Uses tarkov.dev's approach: lat = z, lng = x
 * @param x Game X coordinate
 * @param z Game Z coordinate
 * @returns Leaflet-compatible lat/lng coordinates
 */
export function gameToLatLng(x: number, z: number): { lat: number; lng: number } {
  // tarkov.dev approach: lat = z, lng = x
  return { lat: z, lng: x };
}
/**
 * Converts an array of outline points (zone polygon) to Leaflet LatLng array.
 * @param outline Array of {x, z} points defining the zone boundary
 * @returns Array of Leaflet LatLng coordinates
 */
export function outlineToLatLngArray(
  outline: Array<{ x: number; z: number }>
): Array<{ lat: number; lng: number }> {
  return outline.map((point) => gameToLatLng(point.x, point.z));
}
/**
 * Calculates Leaflet bounds from map SVG configuration.
 * Uses tarkov.dev's approach: swap coordinates in bounds.
 * @param svgConfig Map SVG configuration
 * @returns Leaflet bounds as [[lat1, lng1], [lat2, lng2]]
 */
export function getLeafletBounds(svgConfig?: MapSvgConfig): [[number, number], [number, number]] {
  if (!svgConfig?.bounds || svgConfig.bounds.length < 2) {
    // Fallback to default bounds
    return [
      [0, 0],
      [100, 100],
    ];
  }
  // tarkov.dev swaps coordinates: [z, x] format
  // bounds[0] = [x1, z1], bounds[1] = [x2, z2]
  // Convert to [[z1, x1], [z2, x2]]
  const b0 = svgConfig.bounds[0];
  const b1 = svgConfig.bounds[1];
  if (!b0 || !b1 || b0.length < 2 || b1.length < 2) {
    return [
      [0, 0],
      [100, 100],
    ];
  }
  return [
    [b0[1] ?? 0, b0[0] ?? 0],
    [b1[1] ?? 0, b1[0] ?? 0],
  ];
}
/**
 * Gets bounds for SVG overlay. Uses svgBounds if available, otherwise falls back to bounds.
 * Some maps (like Reserve) have different bounds for SVG overlay vs marker coordinates.
 * @param svgConfig Map SVG configuration
 * @returns Leaflet bounds for SVG overlay
 */
export function getSvgOverlayBounds(
  svgConfig?: MapSvgConfig
): [[number, number], [number, number]] {
  if (!svgConfig) {
    return [
      [0, 0],
      [100, 100],
    ];
  }
  // Use svgBounds if available, otherwise fall back to regular bounds
  const boundsToUse = svgConfig.svgBounds || svgConfig.bounds;
  if (!boundsToUse || boundsToUse.length < 2) {
    return [
      [0, 0],
      [100, 100],
    ];
  }
  // tarkov.dev swaps coordinates: [z, x] format
  const b0 = boundsToUse[0];
  const b1 = boundsToUse[1];
  if (!b0 || !b1 || b0.length < 2 || b1.length < 2) {
    return [
      [0, 0],
      [100, 100],
    ];
  }
  return [
    [b0[1] ?? 0, b0[0] ?? 0],
    [b1[1] ?? 0, b1[0] ?? 0],
  ];
}
/**
 * Creates Leaflet map options suitable for game maps.
 * Uses custom CRS with transformation for proper coordinate mapping.
 * @param L Leaflet instance
 * @param svgConfig Map SVG configuration
 * @returns Map initialization options
 */
export function getLeafletMapOptions(
  L: typeof import('leaflet'),
  svgConfig?: MapSvgConfig
): L.MapOptions {
  // Create custom CRS if we have config, otherwise use Simple
  const crs = svgConfig ? createMapCRS(L, svgConfig) : L.CRS.Simple;
  return {
    crs,
    minZoom: 1,
    maxZoom: 6,
    zoomSnap: 0.25,
    zoomDelta: 0.35,
    // Smoother than default, but faster than ultra-fine
    wheelPxPerZoomLevel: 120,
    wheelDebounceTime: 15,
    attributionControl: false,
    zoomControl: true,
    zoomAnimation: true,
    zoomAnimationThreshold: 8,
    // Touch support for mobile
    touchZoom: true,
    bounceAtZoomLimits: true,
    scrollWheelZoom: false, // Disabled default scroll zoom to allow Shift+Scroll interaction
  } as L.MapOptions;
}
/**
 * Validates map SVG configuration.
 * @param svg Map SVG configuration object
 * @returns True if configuration is valid
 */
export function isValidMapSvgConfig(svg: unknown): svg is MapSvgConfig {
  if (!svg || typeof svg !== 'object') return false;
  const config = svg as Record<string, unknown>;
  return (
    typeof config.file === 'string' &&
    Array.isArray(config.floors) &&
    typeof config.defaultFloor === 'string' &&
    typeof config.coordinateRotation === 'number' &&
    Array.isArray(config.bounds) &&
    config.bounds.length >= 2
  );
}
/**
 * Gets the CDN URL for a map SVG file.
 * @param mapName Map name (e.g., "Factory", "Customs")
 * @param floor Floor name (e.g., "Ground_Level", "Basement")
 * @returns CDN URL for the SVG file
 */
export function getMapSvgCdnUrl(mapName: string, floor: string): string {
  // Primary: tarkov.dev CDN
  return `https://assets.tarkov.dev/maps/svg/${mapName}-${floor}.svg`;
}
/**
 * Gets the fallback URL for a map SVG file.
 * @param filename SVG filename from maps.json
 * @returns Fallback URL for the SVG file
 */
export function getMapSvgFallbackUrl(filename: string): string {
  return `https://tarkovtracker.github.io/tarkovdata/maps/${filename}`;
}
/**
 * Gets the URL for Factory floor-specific SVG files.
 * Factory uses separate files per floor.
 * @param floor Floor name
 * @returns URL for the Factory floor SVG
 */
export function getFactoryFloorUrl(floor: string): string {
  // Try CDN first for Factory
  return `https://assets.tarkov.dev/maps/svg/Factory-${floor}.svg`;
}
/**
 * Gets the fallback URL for Factory floor-specific SVG files.
 * @param floor Floor name
 * @returns Fallback URL for the Factory floor SVG
 */
export function getFactoryFloorFallbackUrl(floor: string): string {
  return `/img/maps/Factory-${floor}.svg`;
}
