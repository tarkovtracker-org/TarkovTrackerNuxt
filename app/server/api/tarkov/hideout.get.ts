import { createTarkovFetcher, edgeCache } from '~/server/utils/edgeCache';
import { API_SUPPORTED_LANGUAGES } from '~/utils/constants';
const TARKOV_HIDEOUT_QUERY = `
  query TarkovDataHideout($lang: LanguageCode, $gameMode: GameMode) {
    hideoutStations(lang: $lang, gameMode: $gameMode) {
      id
      name
      normalizedName
      imageLink
      levels {
        id
        level
        description
        constructionTime
          itemRequirements {
            id
            item {
              id
              shortName
              name
              link
              wikiLink
              image512pxLink
              gridImageLink
              baseImageLink
              iconLink
              image8xLink
              backgroundColor
            }
            count
            quantity
            attributes {
              type
              name
              value
            }
          }
        stationLevelRequirements {
          id
          station {
            id
            name
          }
          level
        }
        skillRequirements {
          id
          name
          level
        }
        traderRequirements {
          id
          trader {
            id
            name
          }
          value
        }
        crafts {
          id
          duration
          requiredItems {
            item {
              id
              shortName
              name
              link
              wikiLink
              image512pxLink
              gridImageLink
              baseImageLink
              iconLink
              image8xLink
              backgroundColor
            }
            count
            quantity
          }
          rewardItems {
            item {
              id
              shortName
              name
              link
              wikiLink
              image512pxLink
              gridImageLink
              baseImageLink
              iconLink
              image8xLink
              backgroundColor
            }
            count
            quantity
          }
        }
      }
    }
  }
`;
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
  // Create cache key from parameters (include language for localized data)
  const cacheKey = `hideout-${lang}-${gameMode}`;
  // Create fetcher function for tarkov.dev API
  const fetcher = createTarkovFetcher(TARKOV_HIDEOUT_QUERY, { lang, gameMode });
  // Use the shared edge cache utility
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL, { cacheKeyPrefix: 'tarkov' });
});
