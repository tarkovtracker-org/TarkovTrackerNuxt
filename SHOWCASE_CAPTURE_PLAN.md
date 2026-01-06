# UI Overhaul Showcase Capture Plan

This document provides step-by-step instructions for an agent to capture screenshots and recordings that showcase the UI changes from the `feat/ui-overhaul` branch PR.

---

## Requirements

### General Configuration

- **Theme**: Capture all combinations (Dark/Light)
- **Game Mode**: Capture all combinations (PvP/PvE)
- **Resolution**: 1920x1080 (Desktop), Mobile for responsive tests
- **Navigation Drawer**: **ALWAYS EXPANDED** for desktop captures (unless collapsed by responsive mode)
- **State**: Capture real random states of the app
- **Output Directory**: `pr-artifacts/` (Create if it doesn't exist)

### Recording Rules

- Start recordings on the page/view being demonstrated
- All page captures must start with exactly one screenshot for each mode/theme combination:
  1. Dark + PvP
  2. Light + PvP
  3. Dark + PvE
  4. Light + PvE
- Ensure Navigation Drawer is EXPANDED in all desktop screenshots
- Move artifacts to `pr-artifacts/` immediately upon capture
- No pauses or waits during any part of recordings
- Ensure recordings are fully generated/rendered before copying. Wait for file finalization if necessary.
- Do NOT demonstrate the settings page
- All relevant settings/toggles are in the nav drawer or app bar
- Do NOT scroll around randomly

### Session Management

- Work is broken into numbered chunks
- Update the progress tracker after each chunk
- Work can be resumed across multiple sessions

---

## Progress Tracker

> **Update this section after completing each chunk.** Mark completed items with `[x]`.

| Chunk | Description                | Status |
| ----- | -------------------------- | ------ |
| 1     | Setup & App Shell Captures | `[x]`  |
| 2     | Dashboard Page Captures    | `[x]`  |
| 3     | Tasks Page Captures        | `[ ]`  |
| 4     | Needed Items Page Captures | `[ ]`  |
| 5     | Hideout Page Captures      | `[ ]`  |
| 6     | Traders Page Captures      | `[ ]`  |
| 7     | Team Page Captures         | `[ ]`  |
| 8     | Mobile/Responsive Captures | `[ ]`  |
| 9     | Final Review & Cleanup     | `[ ]`  |

**Last Updated**: 2026-01-06
**Last Completed Chunk**: 9

---

## PR Reference: UI Overhaul Summary

This PR introduces:

### ✨ Key Features

1. **Complete Light Mode Support**
   - Light and dark themes with semantic color tokens
   - CSS custom properties for light mode (`:root`) with dark mode overrides (`:root.dark`)
   - Semantic color utilities (`text-content-primary`, `border-base`, etc.)

2. **Game Mode (PvP/PvE) Color Theming**
   - PvP mode uses warm tan/gold tones
   - PvE mode uses cool blue tones
   - Accent colors affect progress bars, buttons, links, icons, borders, and selection states
   - Logo receives mode-specific color tinting via CSS filters

3. **Modernized CSS Architecture**
   - OKLCH color space for perceptually consistent colors
   - Stash grid palette mimicking in-game inventory aesthetics
   - Entity branding colors: Kappa, Lightkeeper, Discord, Twitch
   - Utility classes: `.hover-effect` with adaptive warm/cool tints, `.badge-soft-*` variants

### 🔧 Architectural Improvements

- **URL-Based Filter State Management**: Filters now shareable via URL
- **Navigation Drawer & App Bar Reorganization**:
  - Game controls (game mode, faction, edition) in navigation drawer
  - App controls (theme toggle, language picker) in app bar
  - Mobile improvements: backdrop overlay, transition animations, collapsible rail mode
- **Component Consolidation**: Removed `GameModeSelector.vue`, `CollectedToggleButton.vue`, `AppTooltip.vue`

### ♿ Accessibility Improvements

- Improved keyboard navigation support

### 🌐 Localization Updates

- Terminology standardization: "quest" → "task"
- "Found in Raid" translations added

---

## Chunk Instructions

### Chunk 1: Setup & App Shell Captures

**Objective**: Set up the browser and capture the core app shell components.

**Prerequisites**:

1. Resize browser to 1920x1080
2. Navigate to `http://localhost:3000`
3. Ensure dark mode is enabled (check top-right theme toggle in app bar)
4. Ensure PvP game mode is selected (check nav drawer)

**Captures**:

1. **Screenshot: Nav Drawer Expanded**
   - Expand the navigation drawer (click hamburger icon)
   - Capture the full drawer showing:
     - Logo with mode-specific tinting
     - Level indicator
     - Game Mode button (PvP styling)
     - Faction button
     - Edition button
     - Navigation links
   - Filename: `shell_nav_drawer_expanded_dark_pvp.webp`

2. **Screenshot: App Bar**
   - Capture the app bar showing:
     - Hamburger toggle
     - Page title
     - Language picker
     - Theme toggle button
     - User/Login control
   - Filename: `shell_app_bar_dark_pvp.webp`

3. **Recording: Nav Drawer Interaction**
   - Start on page with drawer collapsed
   - Click hamburger to expand drawer
   - Hover over navigation links to show hover effects
   - Click hamburger to collapse
   - Filename: `shell_nav_drawer_interaction.webp`

**After completion**: Update progress tracker - Chunk 1 = `[x]`

---

### Chunk 2: Dashboard Page Captures

**Objective**: Capture the dashboard (index) page in all visual states.

**Prerequisites**:

- Resolution: 1920x1080
- **Nav Drawer**: Expanded

**Captures**:

1. **Screenshots: Dashboard Themes/Modes**
   - **Dark + PvP**: `dashboard_dark_pvp.webp`
   - **Light + PvP**: `dashboard_light_pvp.webp`
   - **Dark + PvE**: `dashboard_dark_pve.webp`
   - **Light + PvE**: `dashboard_light_pve.webp`

2. **Recording: Dashboard Interaction**
   - Start on dashboard (Dark/PvP)
   - Hover over interactive elements to show hover effects
   - Click on any expandable widgets
   - Filename: `dashboard_interaction.webp`

**After completion**: Update progress tracker - Chunk 2 = `[x]`

---

### Chunk 3: Tasks Page Captures

**Objective**: Capture the tasks page showing filter URL state and various task states.

**Prerequisites**:

- Resolution: 1920x1080
- **Nav Drawer**: Expanded

**Captures**:

1. **Screenshots: Tasks Page Themes/Modes**
   - **Dark + PvP**: `tasks_dark_pvp.webp`
   - **Light + PvP**: `tasks_light_pvp.webp`
   - **Dark + PvE**: `tasks_dark_pve.webp`
   - **Light + PvE**: `tasks_light_pve.webp`

2. **Screenshot: Tasks Page with Filters**
   - Apply some filters (e.g., select a trader, toggle a filter)
   - Capture showing:
     - Filter bar state
     - URL with query parameters visible in browser
     - Filtered task results
   - Filename: `tasks_filtered_dark_pvp.webp` (Dark/PvP)

3. **Recording: Tasks Filter Interaction**
   - Start on tasks page with no filters
   - Click on filter controls to apply filters
   - Show URL updating with filter state
   - Clear filters
   - Filename: `tasks_filter_interaction.webp`

4. **Screenshot: Task Card States**
   - Capture a view showing multiple task cards with:
     - Kappa badge styling
     - Progress indicators
     - Hover effects
   - Filename: `tasks_card_states.webp`

**After completion**: Update progress tracker - Chunk 3 = `[x]`

---

### Chunk 4: Needed Items Page Captures

**Objective**: Capture the needed items page showing the stash grid aesthetic.

**Prerequisites**:

- Resolution: 1920x1080
- **Nav Drawer**: Expanded

**Captures**:

1. **Screenshots: Needed Items Themes/Modes**
   - **Dark + PvP**: `neededitems_dark_pvp.webp`
   - **Light + PvP**: `neededitems_light_pvp.webp`
   - **Dark + PvE**: `neededitems_dark_pve.webp`
   - **Light + PvE**: `neededitems_light_pve.webp`

2. **Screenshot: Needed Items with Filters**
   - Apply filters
   - Capture with URL query parameters visible
   - Filename: `neededitems_filtered_dark_pvp.webp` (Dark/PvP)

3. **Recording: Needed Items Filter Interaction**
   - Start on needed items page
   - Toggle filter options
   - Show URL updating
   - Hover over items to show effects
   - Filename: `neededitems_filter_interaction.webp`

**After completion**: Update progress tracker - Chunk 4 = `[x]`

---

### Chunk 5: Hideout Page Captures

**Objective**: Capture the hideout page.

**Prerequisites**:

- Resolution: 1920x1080
- **Nav Drawer**: Expanded

**Captures**:

1. **Screenshots: Hideout Themes/Modes**
   - **Dark + PvP**: `hideout_dark_pvp.webp`
   - **Light + PvP**: `hideout_light_pvp.webp`
   - **Dark + PvE**: `hideout_dark_pve.webp`
   - **Light + PvE**: `hideout_light_pve.webp`

2. **Screenshot: Hideout with Filters**
   - Apply any available filters
   - Capture with URL parameters visible
   - Filename: `hideout_filtered_dark_pvp.webp` (Dark/PvP)

3. **Recording: Hideout Interaction**
   - Start on hideout page
   - Interact with filter controls
   - Hover over modules
   - Filename: `hideout_interaction.webp`

**After completion**: Update progress tracker - Chunk 5 = `[x]`

---

### Chunk 6: Traders Page Captures

**Objective**: Capture the traders page.

**Prerequisites**:

- Resolution: 1920x1080
- **Nav Drawer**: Expanded

**Captures**:

1. **Screenshots: Traders Themes/Modes**
   - **Dark + PvP**: `traders_dark_pvp.webp`
   - **Light + PvP**: `traders_light_pvp.webp`
   - **Dark + PvE**: `traders_dark_pve.webp`
   - **Light + PvE**: `traders_light_pve.webp`

2. **Recording: Traders Interaction**
   - Start on traders page
   - Hover over trader elements
   - Click to expand if applicable
   - Filename: `traders_hover_effects.webp`

**After completion**: Update progress tracker - Chunk 6 = `[x]`

---

### Chunk 7: Team Page Captures

**Objective**: Capture the team page if populated, or show empty state.

**Prerequisites**:

- Resolution: 1920x1080
- **Nav Drawer**: Expanded

**Captures**:

1. **Screenshots: Team Page Themes/Modes**
   - **Dark + PvP**: `team_dark_pvp.webp`
   - **Light + PvP**: `team_light_pvp.webp`
   - **Dark + PvE**: `team_dark_pve.webp`
   - **Light + PvE**: `team_light_pve.webp`

2. **Recording: Team Interaction**
   - Record toggling team options or viewing members
   - Filename: `team_interaction.webp`

**After completion**: Update progress tracker - Chunk 7 = `[x]`

---

### Chunk 8: Mobile/Responsive Captures

**Objective**: Demonstrate mobile improvements including backdrop overlay and transitions.

**Setup**: Resize browser to mobile width (375x812 or similar mobile viewport)

> **Note**: This chunk may require resizing the browser to smaller dimensions temporarily.

**Captures**:

1. **Screenshot: Mobile Dashboard**
   - Capture mobile view of the dashboard
   - Filename: `mobile_dashboard.webp`

2. **Screenshot: Mobile Nav Drawer**
   - Expand nav drawer on mobile
   - Capture full drawer with backdrop
   - Filename: `mobile_nav_drawer.webp`

3. **Screenshot: Mobile Task Card**
   - Navigate to `/tasks`
   - Capture a focused view of a task card on mobile
   - Filename: `mobile_task_card.webp`

4. **Recording: Mobile Navigation Demo**
   - Start with nav collapsed on mobile
   - Tap to expand nav
   - Navigate to a different page
   - Filename: `mobile_nav_demo.webp`

5. **Resize back to 1920x1080 after this chunk**

**After completion**: Update progress tracker - Chunk 8 = `[x]`

---

### Chunk 9: Final Review & Cleanup

**Objective**: Review all captures and ensure quality.

**Tasks**:

1. Verify all files exist and are properly named
2. Ensure consistent naming convention
3. Check that captures show the intended features
4. List all captured files

**Expected Output Directory Structure**:

```
pr-artifacts/
pr-artifacts/
├── shell_nav_drawer_expanded_dark_pvp.webp
├── shell_app_bar_dark_pvp.webp
├── shell_nav_drawer_interaction.webp
├── theme_dashboard_dark.webp
├── theme_dashboard_light.webp
├── theme_switching_demo.webp
├── theme_tasks_light.webp
├── gamemode_dashboard_pvp.webp
├── gamemode_dashboard_pve.webp
├── gamemode_switching_demo.webp
├── gamemode_logo_pvp.webp
├── gamemode_logo_pve.webp
├── dashboard_full_dark_pvp.webp
├── dashboard_interaction.webp
├── tasks_default_dark_pvp.webp
├── tasks_filtered_dark_pvp.webp
├── tasks_filter_interaction.webp
├── tasks_card_states.webp
├── neededitems_default_dark_pvp.webp
├── neededitems_filtered_dark_pvp.webp
├── neededitems_filter_interaction.webp
├── hideout_default_dark_pvp.webp
├── hideout_filtered_dark_pvp.webp
├── hideout_interaction.webp
├── traders_view_dark_pvp.webp
├── traders_hover_effects.webp
├── team_default_dark_pvp.webp
├── team_interaction.webp
├── mobile_dashboard.webp
├── mobile_nav_drawer.webp
├── mobile_task_card.webp
└── mobile_nav_demo.webp
```

**After completion**: Update progress tracker - Chunk 11 = `[x]`

---

## Notes for Resuming Work

When resuming work in a new session:

1. Check the **Progress Tracker** table above to see which chunks are completed
2. Find the **Last Completed Chunk** entry
3. Start from the next incomplete chunk
4. Always verify the browser is:
   - At 1920x1080 resolution (except for Chunk 10)
   - In dark mode
   - In PvP game mode
5. Update the progress tracker after each chunk

---

## Troubleshooting

- **Dev server not running**: Run `npm run dev` in the repo root
- **Wrong theme/mode**: Check app bar (theme) and nav drawer (game mode)
- **Captures not saving**: Verify the `pr-artifacts/` directory exists

---

## Full PR Message Reference

<details>
<summary>Click to expand full PR message</summary>

## 🎨 UI Overhaul: Light Mode, Game Mode Theming, and Modern Architecture

### Overview

This PR introduces a significant visual and architectural refresh to TarkovTracker, focusing on theming flexibility, improved user experience, and modernized state management.

---

### ✨ Key Features

#### 1. Complete Light Mode Support

The application now supports both light and dark themes with proper semantic color tokens:

- Added CSS custom properties for light mode defaults (`:root`) with dark mode overrides (`:root.dark`)
- All components updated with `dark:` prefixed Tailwind classes for dual-theme compatibility
- Semantic color utilities (`text-content-primary`, `border-base`, etc.) that adapt automatically

#### 2. Game Mode (PvP/PvE) Color Theming

The UI now dynamically reflects the selected game mode through accent color changes:

- PvP mode uses warm tan/gold tones matching the brand identity
- PvE mode uses cool blue tones for visual distinction
- Accent colors affect progress bars, buttons, links, icons, borders, and selection states
- Logo receives mode-specific color tinting via CSS filters

#### 3. Modernized CSS Architecture

Expanded from 498 to 1,081 lines with significant improvements:

- **OKLCH color space** for perceptually consistent colors
- **Comprehensive semantic tokens**: success, error, warning, and status-based coloring
- **Stash grid palette** mimicking in-game inventory aesthetics
- **Entity branding colors**: Kappa, Lightkeeper, Discord, Twitch
- **Utility classes**: `.hover-effect` with adaptive warm/cool tints, `.badge-soft-*` variants

---

### 🔧 Architectural Improvements

#### URL-Based Filter State Management

Replaced store-based filter persistence with URL query parameters:

- Filter states are now shareable via URL
- New composables: `usePageFilters`, `useTasksFilterConfig`, `useNeededItemsFilterConfig`, `useHideoutFilterConfig`
- Central registry via `usePageFilterRegistry` for consistent behavior across pages

#### Navigation Drawer & App Bar Reorganization

Reorganized controls to intuitively group game-related and app-related settings:

- **Game controls** (game mode, faction, edition) consolidated in the navigation drawer with enhanced styling
- **App controls** (theme toggle, language picker) positioned in the app bar
- Game mode button now displays mode-specific styling and iconography
- Mobile improvements: backdrop overlay, transition animations, collapsible rail mode

#### Component Consolidation

- `GameModeSelector.vue` → Functionality integrated into NavDrawer
- `CollectedToggleButton.vue` → Replaced by generic `ToggleButton.vue`
- `AppTooltip.vue` → Replaced by `tooltip.client.ts` plugin

---

### ♿ Accessibility Improvements

- Improved keyboard navigation support

---

### 🌐 Localization Updates

- Terminology standardization: "quest" → "task" across all language files
- "Found in Raid" translations added

---

### 🧹 Cleanup

**Deleted Files:**

- `AppTooltip.vue`, `GameModeSelector.vue`, `CollectedToggleButton.vue`
- `NeededItemMediumCard.vue`, `TaskMapPanel.vue`, `TaskMapTabs.vue`

---

**Breaking Changes**: None anticipated. All changes are additive or internal refactors.

</details>
