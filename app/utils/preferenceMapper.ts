export type FlatPreferences = Record<string, unknown>;
/**
 * Mapping of nested property paths to database column names.
 * Only properties that don't match the simple flattening logic
 * or need specific column names are listed here.
 */
const PROPERTY_TO_COLUMN_MAP: Record<string, string> = {
  'global.theme': 'theme',
  'global.localeOverride': 'locale_override',
  'global.streamerMode': 'streamer_mode',
  'global.enableHolidayEffects': 'enable_holiday_effects',
  'global.useAutomaticLevelCalculation': 'use_automatic_level_calculation',
  'team.individualHide': 'team_hide',
  'team.taskHideAll': 'task_team_hide_all',
  'team.itemsHideAll': 'items_team_hide_all',
  'team.itemsHideNonFIR': 'items_team_hide_non_fir',
  'team.itemsHideHideout': 'items_team_hide_hideout',
  'team.mapHideAll': 'map_team_hide_all',
  'tasks.views.primary': 'task_primary_view',
  'tasks.views.secondary': 'task_secondary_view',
  'tasks.views.map': 'task_map_view',
  'tasks.views.trader': 'task_trader_view',
  'tasks.views.user': 'task_user_view',
  'tasks.views.taskId': 'task_id',
  'tasks.filters.hideGlobal': 'hide_global_tasks',
  'tasks.filters.hideNonKappa': 'hide_non_kappa_tasks',
  'tasks.filters.search': 'task_search',
  'tasks.filters.showNonSpecial': 'show_non_special_tasks',
  'tasks.filters.showEod': 'show_eod_tasks',
  'tasks.filters.showLightkeeper': 'show_lightkeeper_tasks',
  'tasks.appearance.showRequiredLabels': 'show_required_labels',
  'tasks.appearance.showNotRequiredLabels': 'show_not_required_labels',
  'tasks.appearance.showExperienceRewards': 'show_experience_rewards',
  'tasks.appearance.showTaskIds': 'show_task_ids',
  'tasks.appearance.showNextQuests': 'show_next_quests',
  'tasks.appearance.showPreviousQuests': 'show_previous_quests',
  'tasks.appearance.cardDensity': 'task_card_density',
  'tasks.advanced.enableManualFail': 'enable_manual_task_fail',
  'neededItems.views.type': 'needed_type_view',
  'neededItems.views.style': 'neededitems_style',
  'neededItems.filters.hideNonFIR': 'items_hide_non_fir',
  'neededItems.filters.search': 'needed_items_search',
  'hideout.views.primary': 'hideout_primary_view',
  'hideout.filters.search': 'hideout_search',
  'maps.showExtracts': 'show_map_extracts',
};
// Reverse map for unflattening
const COLUMN_TO_PROPERTY_MAP: Record<string, string> = Object.entries(
  PROPERTY_TO_COLUMN_MAP
).reduce((acc, [prop, col]) => ({ ...acc, [col]: prop }), {});
/**
 * Flattens a nested preferences object into a flat object with snake_case keys for Supabase.
 */
export function flattenPreferences(nested: Record<string, unknown>): FlatPreferences {
  const result: FlatPreferences = {};
  const recurse = (obj: Record<string, unknown>, currentPath: string) => {
    for (const key in obj) {
      if (key === 'saving') continue; // Don't persist transient state
      const value = obj[key];
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        key !== 'individualHide'
      ) {
        recurse(value as Record<string, unknown>, newPath);
      } else {
        const columnName =
          PROPERTY_TO_COLUMN_MAP[newPath] ||
          key.replace(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, '_').toLowerCase();
        result[columnName] = value;
      }
    }
  };
  recurse(nested, '');
  return result;
}
/**
 * Unflattens a flat snake_case object from Supabase into a nested preferences object.
 */
export function unflattenPreferences(
  flat: FlatPreferences,
  defaultState: Record<string, unknown>
): Record<string, unknown> {
  const result = structuredClone(defaultState);
  for (const colName in flat) {
    if (['user_id', 'created_at', 'updated_at', 'id'].includes(colName)) continue;
    const propPath = COLUMN_TO_PROPERTY_MAP[colName];
    const value = flat[colName];
    if (propPath) {
      const parts = propPath.split('.');
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!part) continue;
        if (!current[part]) current[part] = {};
        current = current[part] as Record<string, unknown>;
      }
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        current[lastPart] = value;
      }
    } else {
      // Fallback for fields not in map (try camelCase conversion)
      const camelKey = colName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      // We don't know where it goes in the nested structure without a map,
      // so we only handle top-level defaults if they exist.
      if (camelKey in result) {
        result[camelKey] = value;
      }
    }
  }
  return result;
}
