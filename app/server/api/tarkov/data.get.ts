import type { TarkovDataQueryResult } from '~/types/tarkov';
import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { createLogger } from '~/server/utils/logger';
import { applyOverlay } from '~/server/utils/overlay';
import { TARKOV_DATA_QUERY } from '~/server/utils/tarkov-queries';
import { API_SUPPORTED_LANGUAGES } from '~/utils/constants';
type TarkovGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; [key: string]: unknown }>;
};
const logger = createLogger('TarkovData');
/**
 * Custom error for GraphQL response validation failures
 */
class GraphQLResponseError extends Error {
  constructor(
    message: string,
    public readonly errors?: Array<{ message: string; [key: string]: unknown }>
  ) {
    super(message);
    this.name = 'GraphQLResponseError';
  }
}
/**
 * Sanitizes task data to remove invalid entries from the API response
 * This helps handle cases where the tarkov.dev API returns null values for non-nullable fields
 */
function sanitizeTaskData(response: { data: TarkovDataQueryResult }): {
  data: TarkovDataQueryResult;
} {
  const tasks = response.data?.tasks || [];
  // Filter out invalid skill level rewards (where skill is null)
  const sanitizedTasks = tasks.map((task) => {
    if (!task) return task;
    const sanitizedTask = { ...task };
    // Sanitize finishRewards
    if (sanitizedTask.finishRewards) {
      sanitizedTask.finishRewards = {
        ...sanitizedTask.finishRewards,
        skillLevelReward: sanitizedTask.finishRewards.skillLevelReward?.filter(
          (reward) => reward && reward.skill !== null
        ),
      };
    }
    // Sanitize startRewards
    if (sanitizedTask.startRewards) {
      sanitizedTask.startRewards = {
        ...sanitizedTask.startRewards,
        skillLevelReward: sanitizedTask.startRewards.skillLevelReward?.filter(
          (reward) => reward && reward.skill !== null
        ),
      };
    }
    return sanitizedTask;
  });
  return {
    data: {
      ...response.data,
      tasks: sanitizedTasks,
    },
  };
}
/**
 * Type guard to validate GraphQL response structure
 */
function isValidGraphQLResponse(
  response: unknown
): response is TarkovGraphqlResponse<TarkovDataQueryResult> {
  return (
    response !== null &&
    typeof response === 'object' &&
    ('data' in response || 'errors' in response)
  );
}
/**
 * Validates GraphQL response and narrows type to ensure data.data exists
 * @param allowPartialData - If true, allows responses with errors as long as data exists
 * @throws GraphQLResponseError if response is invalid or contains errors
 */
function validateGraphQLResponse(
  response: unknown,
  allowPartialData = false
): asserts response is { data: TarkovDataQueryResult } {
  // Check basic structure
  if (!isValidGraphQLResponse(response)) {
    throw new GraphQLResponseError('Invalid GraphQL response structure');
  }
  // Check for missing data
  if (!response.data) {
    throw new GraphQLResponseError('GraphQL response missing data field');
  }
  // Check for GraphQL errors (only throw if not allowing partial data)
  if (
    !allowPartialData &&
    response.errors &&
    Array.isArray(response.errors) &&
    response.errors.length > 0
  ) {
    const errorMessages = response.errors.map((e) => e.message).join('; ');
    throw new GraphQLResponseError(`GraphQL errors: ${errorMessages}`, response.errors);
  }
  // If we have partial data and errors, log them but don't throw
  if (
    allowPartialData &&
    response.errors &&
    Array.isArray(response.errors) &&
    response.errors.length > 0
  ) {
    logger.warn('GraphQL response contains errors but returning partial data:', response.errors);
  }
}
// Valid game modes
const VALID_GAME_MODES = ['regular', 'pve'] as const;
// Cache TTL: 12 hours in seconds
const CACHE_TTL = 43200;
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize inputs
  let lang = (query.lang as string)?.toLowerCase() || 'en';
  let gameMode = (query.gameMode as string)?.toLowerCase() || 'regular';
  // Ensure valid language (fallback to English if unsupported)
  if (!API_SUPPORTED_LANGUAGES.includes(lang as (typeof API_SUPPORTED_LANGUAGES)[number])) {
    lang = 'en';
  }
  // Ensure valid game mode
  if (!VALID_GAME_MODES.includes(gameMode as (typeof VALID_GAME_MODES)[number])) {
    gameMode = 'regular';
  }
  // Create cache key from parameters
  const cacheKey = `data-${lang}-${gameMode}`;
  // Create fetcher function for tarkov.dev API with overlay applied
  const baseFetcher = createTarkovFetcher(TARKOV_DATA_QUERY, { lang, gameMode });
  const fetcherWithOverlay = async () => {
    const rawResponse = await baseFetcher();
    // Validate GraphQL response has basic structure and data field
    // Allow partial data with errors - we'll sanitize them out
    try {
      validateGraphQLResponse(rawResponse, true);
    } catch (error) {
      if (error instanceof GraphQLResponseError) {
        logger.error('GraphQL validation failed:', error.message);
        if (error.errors) {
          logger.error('GraphQL errors detail:', JSON.stringify(error.errors, null, 2));
        }
      }
      throw error;
    }
    // At this point, TypeScript knows rawResponse has { data: TarkovDataQueryResult }
    // Sanitize data to remove invalid entries (e.g., null skill fields in skillLevelReward)
    // This allows us to handle partial data with errors from the API
    const sanitizedResponse = sanitizeTaskData(rawResponse);
    // Apply community overlay corrections (fixes incorrect minPlayerLevel values, etc.)
    try {
      return await applyOverlay(sanitizedResponse);
    } catch (overlayError) {
      logger.error('Failed to apply overlay:', overlayError);
      // Re-throw to prevent caching of potentially corrupted data
      throw overlayError;
    }
  };
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcherWithOverlay, CACHE_TTL, {
    cacheKeyPrefix: 'tarkov',
  });
});
