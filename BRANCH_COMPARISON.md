# feat/ui-overhaul Branch Comparison

A comprehensive analysis of code changes between `feat/ui-overhaul` and `main` branches.

**Summary**: 107 files changed with 6,890 insertions and 4,154 deletions.

---

## Global / Cross-Cutting Changes

### 1. Light Mode Support (NEW)

The app previously only had a dark theme. This branch adds **complete light mode support** with proper semantic color tokens.

**Key Changes:**

- `:root` now defines light mode defaults (`--ui-bg: #ffffff`, `--ui-text: #18181b`, etc.)
- `:root.dark` defines dark mode overrides
- All components updated to use `dark:` prefixed Tailwind classes for dual-theme support
- Border colors now use semantic `border-base` utility that adapts to light/dark mode
- Text colors use semantic classes like `text-content-primary`, `text-content-secondary`

**Example Pattern (seen throughout all pages):**

```diff
- class="border-surface-700/50 bg-surface-800/50"
+ class="border-gray-200 bg-gray-100 dark:border-surface-700/50 dark:bg-surface-800/50"
```

---

### 2. Game Mode (PvP/PvE) Color Theming (NEW)

The app now **dynamically changes its accent color** based on the selected game mode.

**How it works:**

- CSS defines `--color-accent-*` variables that point to `--color-pvp-*` by default
- When `.pve-mode` class is applied to `<html>`, accent colors switch to `--color-pve-*`
- PvP uses warm tan/gold tones (matching brand)
- PvE uses cool blue tones

**Affected Properties:**

- Progress bars, buttons, links, icons, borders, selection states
- Logo tinting (`.logo-pvp-tint` / `.logo-pve-tint` CSS filters)
- Hover tints (warm in PvP, cool in PvE)

**New NavDrawer Game Mode Button:**

- Prominently displays current mode (PvP/PvE) with mode-specific icon
- Click to cycle between modes
- Mode-specific styling applied to button based on selection

---

### 3. CSS Architecture Overhaul

**Before**: 498 lines of CSS
**After**: 1,081 lines of CSS (116% increase)

**New CSS Features:**

- **OKLCH color support**: Modern perceptual color space for better consistency
- **Semantic color tokens**: `--color-success-*`, `--color-error-*`, `--color-warning-*`
- **Stash grid palette**: In-game inventory look with `--color-stash-*` tokens
- **Entity colors**: Kappa, Lightkeeper, Discord, Twitch branding colors
- **Task/reward semantic colors**: Status-based coloring for tasks
- **Soft badge utilities**: `.badge-soft-accent`, `.badge-soft-success`, etc.
- **Global hover effect**: `.hover-effect` class with adaptive warm/cool tints

---

## Pages (In Navigation Order)

### 1. Dashboard (index.vue)

**Visual Updates:**

- Hero section now has light mode variant with white background
- Progress cards use semantic colors (`text-success-600 dark:text-success-400`)
- All stat boxes have light/dark adaptive styling
- Progress bars use `.candy-cane` class option for holiday effects

**Behavioral Changes:**

- `navigateToTraderTasks()` now uses `router.push()` with explicit query params instead of store-based navigation
- Resets "sticky" filters (search, taskId) before navigating
- Sets both `view: 'traders'` and `trader: traderId` in the URL

```diff
- tarkovStore.setTaskTraderView(traderId);
- router.push('/tasks');
+ preferencesStore.setTaskSearch('');
+ preferencesStore.setTaskId(null);
+ preferencesStore.setTaskPrimaryView('traders');
+ preferencesStore.setTaskTraderView(traderId);
+ router.push({
+   path: '/tasks',
+   query: { view: 'traders', trader: traderId }
+ });
```

---

### 2. Tasks (tasks.vue)

**Visual Updates:**

- All cards and containers have light mode variants
- Filter bar, task cards, modals all support dual themes
- Map display area uses adaptive background colors

**Structural Changes:**

- Uses `usePageFilters()` composable for URL-based filter state
- Uses `useTasksFilterConfig()` for filter configuration
- Infinite scroll implementation with sentinel element
- Task status update toast notification with undo functionality

**Query Parameter Handling:**

- Single task viewing via `?task=taskId` parameter
- View switching persists last selection to localStorage
- Primary view options: `all`, `maps`, `traders`
- Secondary view (status filter): `all`, `available`, etc.

---

### 3. Needed Items (neededitems.vue)

**Visual Updates:**

- Item cards with stash-grid styling (in-game inventory look)
- Light mode uses lighter stash base color
- FIR (Found in Raid) indicator styling updated

**Data Structure Updates:**

- `NeededItem` interface includes new fields:
  - `foundInRaid: boolean` tracking requirement
  - Cleaner type structure in `types/neededItems.ts`
- Better item categorization and grouping

**Filter System:**

- Uses `useNeededItemsFilterConfig()` composable
- URL-based filter state management
- Improved filter persistence

---

### 4. Traders (traders.vue)

**Visual Updates:**

- Light mode card styling added
- WIP placeholder styling updated for both themes

```diff
- class="text-gray-600 dark:text-slate-200"
+ class="mt-1 text-sm text-gray-600 dark:text-white"
```

---

### 5. Hideout (hideout.vue)

**Visual Updates:**

- Station cards support light/dark themes
- Progress indicators use accent colors

**Behavioral Updates:**

- Uses `useHideoutFilterConfig()` composable
- URL-based station query parameter handling
- Improved station selection logic:

```diff
- const handleStationQueryParam = () => {
+ watch([stationId, loading]) => {
+   if (stationId && !loading) {
+     handleStationQueryParam(stationId);
+   }
```

---

### 6. Team (team.vue)

**Visual Updates:**

- Team member cards use semantic text colors
- Light mode compatible styling

**Component Updates:**

- Uses async component loading for `MyTeam` and `TeamOptions`
- Team member card displays level using localized text

---

### 7. Settings (settings.vue)

**Visual Updates:**

- Settings tabs and panels support light/dark mode
- Button styling uses new semantic patterns

**Tab Styling Pattern:**

```diff
- ring: 'ring-1 ring-white/10',
+ selected: 'bg-primary-500/10 text-primary-100 dark:bg-primary-500/10 dark:text-primary-100',
+ active: 'hover-effect bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-white',
```

---

## Shell Components

### NavDrawer.vue

**New Features:**

- **Game mode cycling button**: Large button showing PvP/PvE with mode-specific styling
- **Faction cycling button**: Quick USEC/BEAR toggle
- **Edition display button**: Shows current game edition, links to settings
- **Logo tinting**: Logo color-shifts based on game mode

**Mobile Improvements:**

- Backdrop overlay when drawer is expanded on mobile
- Transition animations for drawer state changes
- Collapsed "rail" mode on mobile, expands on tap

---

### AppBar.vue

**Updates:**

- Language picker has hover effect
- Theme toggle (light/dark) added
- Logout menu uses localized strings

---

### LoadingScreen.vue

**Updates:**

- Updated styling for light mode compatibility
- Glitch text effects preserved

---

### default.vue (Layout)

**Updates:**

- Skip navigation link for accessibility
- Shared breakpoints composable usage
- Holiday effects detection from preferences

---

## Stores

### usePreferences.ts

**Removed Properties (Cleaned Up):**

- `showNonSpecialTasks`
- `showLightkeeperTasks`
- `showRequiredLabels`
- `showNotRequiredLabels`
- `showExperienceRewards`
- `showTaskIds`
- `showNextQuests`

**Reason**: These were migrated to URL-based filter state or simplified.

---

### useMetadata.ts

**Updates:**

- Changes for edition name lookup
- Used by NavDrawer for edition display

---

## New Files (Added in This Branch)

### UI Components

- `FilterPill.vue`: Reusable filter pill component
- `GameBadge.vue`: Game mode badge display
- `GameItemImage.vue`: Item image with stash-grid styling
- `ItemStatusBadge.vue`: Status indicator badges
- `ToggleButton.vue`: Toggle button component

### Composables

- `usePageFilterRegistry.ts`: Central registry for page filter configs
- `usePageFilters.ts`: URL-based filter state management
- `useTasksFilterConfig.ts`: Tasks page filter configuration
- `useNeededItemsFilterConfig.ts`: Needed items filter configuration
- `useHideoutFilterConfig.ts`: Hideout filter configuration

### Other

- `tooltip.client.ts`: Client-side tooltip plugin (replaces `AppTooltip.vue`)
- `types/neededItems.ts`: TypeScript types for needed items
- `utils/preferenceMapper.ts`: Preference serialization utilities

---

## Deleted Files (Removed in This Branch)

- `AppTooltip.vue`: Replaced by `tooltip.client.ts` plugin
- `GameModeSelector.vue`: Functionality moved to NavDrawer
- `CollectedToggleButton.vue`: Replaced by generic `ToggleButton.vue`
- `NeededItemMediumCard.vue`: Consolidated into other card components
- `TaskMapPanel.vue`: Map display refactored into main tasks page
- `TaskMapTabs.vue`: Map tabs integrated into TaskFilterBar

---

## Modified Components

### Drawer Components

- `DrawerItem.vue`: Added navigation URL intelligence, light mode support
- `DrawerLinks.vue`: Updated icon colors, light mode styling
- `DrawerLevel.vue`: Light mode styling, improved toggle display

### Task Components

- `TaskCard`: Light mode styling, improved objective rendering, FIR indicator
- `TaskFilterBar`: Responsive controls, URL-based state, settings modal

---

## Localization

**Updates Across All Language Files:**

- Terminology standardization: "quest" → "task"
- New keys for navigation drawer, game mode UI
- Display name settings for PvP/PvE modes
- Found in Raid translations

---

## Summary by Impact

| Area             | Impact Level | Description                                 |
| ---------------- | ------------ | ------------------------------------------- |
| Theming          | **Major**    | Full light mode + game mode color switching |
| CSS Architecture | **Major**    | 116% increase, semantic tokens, OKLCH       |
| Filter System    | **Major**    | URL-based state, shareable links            |
| Navigation       | **Moderate** | Improved drawer, mode switching UI          |
| Accessibility    | **Moderate** | Skip links, ARIA improvements               |
| Localization     | **Minor**    | Terminology updates                         |
