// Special hideout stations with edition-based default levels
// Uses normalizedName for language-independent, stable identification
export const SPECIAL_STATIONS = {
  STASH: 'stash',
  CULTIST_CIRCLE: 'cultist-circle',
} as const;
// PMC faction values
export const PMC_FACTIONS = ['USEC', 'BEAR'] as const;
export const DEFAULT_PMC_FACTION = 'USEC' as const;
export type PMCFaction = (typeof PMC_FACTIONS)[number]; // "USEC" | "BEAR"
// Helper to normalize and validate PMC faction input
export function normalizePMCFaction(input: string | undefined | null): PMCFaction {
  if (!input) return DEFAULT_PMC_FACTION;
  const upper = input.toUpperCase();
  return PMC_FACTIONS.includes(upper as PMCFaction) ? (upper as PMCFaction) : DEFAULT_PMC_FACTION;
}
// Default values for game setup
export const DEFAULT_GAME_EDITION = 1; // Standard Edition
// Game edition string values for legacy data validation
export const GAME_EDITION_STRING_VALUES = [
  'standard',
  'leftbehind',
  'prepareescape',
  'edgeofDarkness',
  'unheard',
] as const;
// Map internal game modes to API game modes
// Internal: "pvp" | "pve"
// API: "regular" | "pve"
export const GAME_MODES = {
  PVP: 'pvp',
  PVE: 'pve',
} as const;
export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];
export const API_GAME_MODES = {
  [GAME_MODES.PVP]: 'regular',
  [GAME_MODES.PVE]: 'pve',
} as const;
export const GAME_MODE_OPTIONS = [
  {
    label: 'PvP',
    value: GAME_MODES.PVP,
    icon: 'mdi-sword-cross',
    description: 'Player vs Player (Standard)',
  },
  {
    label: 'PvE',
    value: GAME_MODES.PVE,
    icon: 'mdi-account-group',
    description: 'Player vs Environment (Co-op)',
  },
];
// Scav Karma (Fence Rep) tasks excluded from tracking
// These "Compensation for Damage" tasks require Scav Karma validation which isn't yet implemented
// They would always show as incomplete without proper Fence reputation tracking
export const EXCLUDED_SCAV_KARMA_TASKS = [
  '61e6e5e0f5b9633f6719ed95', // Compensation for Damage - Trust (Scav Karma -1 Quest)
  '61e6e60223374d168a4576a6', // Compensation for Damage - Wager (Scav Karma -1 Quest)
  '61e6e621bfeab00251576265', // Compensation for Damage - Collection (Scav Karma -1 Quest)
  '61e6e615eea2935bc018a2c5', // Compensation for Damage - Barkeep (Scav Karma -1 Quest)
  '61e6e60c5ca3b3783662be27', // Compensation for Damage - Wergild (Scav Karma -3 Quest)
];
// Currency item IDs to exclude from quest item tracking
// These represent in-game currencies that are always obtainable and don't need to be tracked
export const CURRENCY_ITEM_IDS = [
  '5696686a4bdc2da3298b456a', // Dollars (USD)
  '5449016a4bdc2d6f028b456f', // Roubles (RUB)
  '569668774bdc2da2298b4568', // Euros (EUR)
] as const;
// API Language Configuration
export const API_SUPPORTED_LANGUAGES = [
  'cs', // Czech
  'de', // German
  'en', // English
  'es', // Spanish
  'fr', // French
  'hu', // Hungarian
  'it', // Italian
  'ja', // Japanese
  'ko', // Korean
  'pl', // Polish
  'pt', // Portuguese
  'ro', // Romanian
  'ru', // Russian
  'sk', // Slovak
  'tr', // Turkish
  'zh', // Chinese
] as const;
// Mapping from frontend locale to API language code
// Used when the API doesn't support the specific locale
export const LOCALE_TO_API_MAPPING: Record<string, string> = {
  uk: 'en', // Ukrainian -> English (Not supported by API)
};
// Mapping from GraphQL map names to static data keys (kept for backward compatibility)
export const MAP_NAME_MAPPING: Record<string, string> = {
  'night factory': 'factory',
  'the lab': 'lab',
  'ground zero 21+': 'groundzero',
  'the labyrinth': 'labyrinth',
};
// API Permissions
export const API_PERMISSIONS: Record<string, { title: string; description: string }> = {
  GP: {
    title: 'Get Progression',
    description:
      'Allows access to read your progression information, ' +
      'including your TarkovTracker display name, quest progress, hideout progress. ' +
      "Data access is restricted by the token's game mode (PvP or PvE).",
  },
  TP: {
    title: 'Get Team Progression',
    description:
      "Allows access to read a virtual copy of your team's progress, " +
      'including display names, quest, and hideout progress. ' +
      "Data access is restricted by the token's game mode (PvP or PvE).",
  },
  WP: {
    title: 'Write Progression',
    description:
      'Allows access to update your TarkovTracker progress data on your behalf. ' +
      "Updates are restricted by the token's game mode (PvP or PvE).",
  },
};
// Limits and configuration constants
export const LIMITS = {
  // Maximum characters for display name
  DISPLAY_NAME_MAX_LENGTH: 15,
  // Maximum team members (sync with Supabase edge function)
  TEAM_MAX_MEMBERS: 5,
  // Random name generation default length
  RANDOM_NAME_LENGTH: 6,
  // Maximum player level in Tarkov
  GAME_MAX_LEVEL: 79,
} as const;
// Cache configuration (sync with tarkovCache.ts)
export const CACHE_CONSTANTS = {
  // Cache TTL in hours
  DEFAULT_TTL_HOURS: 12,
  MAX_TTL_HOURS: 24,
} as const;
// Trader display order (matches in-game order)
// Uses normalizedName for language-independent, stable identification
export const TRADER_ORDER = [
  'prapor',
  'therapist',
  'fence',
  'skier',
  'peacekeeper',
  'mechanic',
  'ragman',
  'jaeger',
  'lightkeeper',
  'btr-driver',
  'ref',
  'mr-kerman', // Arena trader
  'taran', // Arena trader
  'voevoda', // Arena trader
  'radio-station', // Radio operator
] as const;
// Sort traders by in-game order using normalizedName
// Traders not in TRADER_ORDER are placed at the end, sorted alphabetically
export function sortTradersByGameOrder<T extends { name: string; normalizedName?: string }>(
  traders: T[]
): T[] {
  return [...traders].sort((a, b) => {
    const aIndex = TRADER_ORDER.indexOf(a.normalizedName as (typeof TRADER_ORDER)[number]);
    const bIndex = TRADER_ORDER.indexOf(b.normalizedName as (typeof TRADER_ORDER)[number]);
    // Traders not in the order list go to the end, sorted alphabetically
    if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}
