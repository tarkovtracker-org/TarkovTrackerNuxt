import type { TarkovBootstrapQueryResult } from '~/types/tarkov';
import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { createLogger } from '~/server/utils/logger';
import { TARKOV_BOOTSTRAP_QUERY } from '~/server/utils/tarkov-queries';
import { API_SUPPORTED_LANGUAGES } from '~/utils/constants';
const logger = createLogger('TarkovBootstrap');
// Cache TTL: 12 hours in seconds
const CACHE_TTL = 43200;
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Validate and sanitize inputs
  let lang = (query.lang as string)?.toLowerCase() || 'en';
  // Ensure valid language (fallback to English if unsupported)
  if (!API_SUPPORTED_LANGUAGES.includes(lang as (typeof API_SUPPORTED_LANGUAGES)[number])) {
    lang = 'en';
  }
  const cacheKey = `bootstrap-${lang}`;
  const fetcher = createTarkovFetcher<TarkovBootstrapQueryResult>(TARKOV_BOOTSTRAP_QUERY, {});
  try {
    return await edgeCache(event, cacheKey, fetcher, CACHE_TTL, { cacheKeyPrefix: 'tarkov' });
  } catch (error) {
    logger.error('Failed to fetch bootstrap data:', error);
    throw error;
  }
});
