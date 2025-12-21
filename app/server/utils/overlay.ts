/**
 * Overlay utility for applying tarkov-data-overlay corrections to tarkov.dev API data.
 *
 * Fetches overlay from GitHub and applies corrections to API responses.
 * The overlay contains corrections for incorrect data in tarkov.dev (e.g., wrong minPlayerLevel values).
 *
 * Deployment Note: Module-level cache persists across requests in long-running Node.js processes
 * but resets on cold starts in serverless/edge platforms. See fetchOverlay for TTL and fallback logic.
 */
import { createLogger } from './logger';
const logger = createLogger('Overlay');
// Overlay data structure
interface OverlayData {
  tasks?: Record<string, Record<string, unknown>>;
  items?: Record<string, Record<string, unknown>>;
  traders?: Record<string, Record<string, unknown>>;
  hideout?: Record<string, Record<string, unknown>>;
  editions?: Record<string, unknown>;
  $meta?: {
    version: string;
    generated: string;
    sha256: string;
  };
}
// Module-level cache behavior: cachedOverlay and cacheTimestamp persist across requests in
// long-running Node.js processes but reset on cold starts in serverless/edge platforms.
// Features a 1-hour TTL (OVERLAY_CACHE_TTL) and falls back to stale data on fetch errors.
// OVERLAY_URL can be overridden by the environment variable.
let cachedOverlay: OverlayData | null = null;
let cacheTimestamp = 0;
const OVERLAY_CACHE_TTL = 3600000; // 1 hour in milliseconds
const FETCH_TIMEOUT_MS = 5000; // 5 seconds
// GitHub raw URL for the overlay
// Note: Using raw.githubusercontent.com directly until jsDelivr cache propagates
const OVERLAY_URL =
  process.env.OVERLAY_URL?.trim() ||
  'https://raw.githubusercontent.com/tarkovtracker-org/tarkov-data-overlay/main/dist/overlay.json';
/**
 * Deep merge utility that recursively merges objects without mutation
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  const result: Record<string, unknown> = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else {
      // Replace primitive values, arrays, or when target doesn't have the key
      result[key] = sourceValue;
    }
  }
  return result as T;
}
/**
 * Validate overlay data structure
 */
function isValidOverlayData(data: unknown): data is OverlayData {
  if (!data || typeof data !== 'object') return false;
  const overlay = data as OverlayData;
  // Check for required $meta field with version
  if (!overlay.$meta || typeof overlay.$meta !== 'object') {
    logger.warn('Invalid overlay: missing $meta');
    return false;
  }
  if (typeof overlay.$meta.version !== 'string') {
    logger.warn('Invalid overlay: missing or invalid $meta.version');
    return false;
  }
  // Validate optional entity collections are records if present
  const collections = ['tasks', 'items', 'traders', 'hideout'] as const;
  for (const collection of collections) {
    if (
      overlay[collection] !== undefined &&
      (typeof overlay[collection] !== 'object' || overlay[collection] === null)
    ) {
      logger.warn(`Invalid overlay: ${collection} is not an object`);
      return false;
    }
  }
  return true;
}
/**
 * Fetch the overlay data from CDN (with caching)
 */
async function fetchOverlay(): Promise<OverlayData | null> {
  const now = Date.now();
  // Return cached overlay if still valid
  if (cachedOverlay && now - cacheTimestamp < OVERLAY_CACHE_TTL) {
    return cachedOverlay;
  }
  try {
    // Set up abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(OVERLAY_URL, { signal: controller.signal });
      if (!response.ok) {
        logger.warn(`Failed to fetch overlay: ${response.status}`);
        return cachedOverlay; // Return stale cache if available
      }
      const parsedData = await response.json();
      // Validate the parsed data before caching
      if (!isValidOverlayData(parsedData)) {
        logger.warn('Fetched overlay failed validation, using stale cache');
        return cachedOverlay;
      }
      cachedOverlay = parsedData;
      cacheTimestamp = now;
      logger.info(`Loaded overlay v${cachedOverlay.$meta?.version}`);
      return cachedOverlay;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn(`Fetch timeout after ${FETCH_TIMEOUT_MS}ms`);
    } else {
      logger.warn('Error fetching overlay:', error);
    }
    return cachedOverlay; // Return stale cache if available
  }
}
/**
 * Apply overlay corrections to an array of entities
 * Filters out entities marked as disabled after applying corrections
 */
function applyEntityOverlay<T extends { id: string }>(
  entities: T[],
  corrections: Record<string, Record<string, unknown>> | undefined
): T[] {
  if (!corrections || !entities) return entities;
  let appliedCount = 0;
  let disabledCount = 0;
  const result = entities
    .map((entity) => {
      const correction = corrections[entity.id];
      if (correction) {
        appliedCount++;
        logger.debug(`Applying correction to ${entity.id}:`, correction);
        // Deep merge the correction into the entity (recursively merges nested objects)
        return deepMerge(entity as Record<string, unknown>, correction) as T;
      }
      return entity;
    })
    .filter((entity) => {
      // Filter out entities marked as disabled in the overlay
      const disabled = (entity as Record<string, unknown>).disabled;
      if (disabled === true) {
        disabledCount++;
        logger.debug(`Filtering out disabled entity: ${entity.id}`);
        return false;
      }
      return true;
    });
  logger.info(
    `Applied ${appliedCount} corrections out of ${Object.keys(corrections).length} available`
  );
  if (disabledCount > 0) {
    logger.info(`Filtered out ${disabledCount} disabled entities`);
  }
  return result;
}
/**
 * Apply overlay corrections to tarkov.dev API response
 *
 * @param data - The raw API response from tarkov.dev
 * @returns The data with overlay corrections applied
 */
type OverlayTargetData = {
  tasks?: Array<{ id: string }>;
  items?: Array<{ id: string }>;
  traders?: Array<{ id: string }>;
};
export async function applyOverlay<T extends { data?: OverlayTargetData }>(data: T): Promise<T> {
  const overlay = await fetchOverlay();
  if (!overlay || !data?.data) {
    return data;
  }
  const result = { ...data, data: { ...data.data } };
  // Apply task corrections
  if (overlay.tasks && Array.isArray(result.data.tasks)) {
    result.data.tasks = applyEntityOverlay(
      result.data.tasks as Array<{ id: string }>,
      overlay.tasks
    );
  }
  // Apply item corrections (if present)
  if (overlay.items && Array.isArray(result.data.items)) {
    result.data.items = applyEntityOverlay(
      result.data.items as Array<{ id: string }>,
      overlay.items
    );
  }
  // Apply trader corrections (if present)
  if (overlay.traders && Array.isArray(result.data.traders)) {
    result.data.traders = applyEntityOverlay(
      result.data.traders as Array<{ id: string }>,
      overlay.traders
    );
  }
  return result;
}
