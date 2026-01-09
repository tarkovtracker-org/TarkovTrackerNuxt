# Single-Task Navigation Logic Refinement

## Goal

Improve single-task navigation "smarts" to handle re-clicks and objective completion states more intuitively.

## New Direction

The user found the "toggle" behavior (clicking the same task link to switch views) to be bad UX.
**New Requirement**:

1.  **Ditch Toggle**: Clicking a task link always ensures you are on the "best" view (smart resolution). It should not "toggle back" if you are already there.
2.  **Explicit Link**: The "X objectives hidden" display in the card should be a clickable link that explicitly leaves Map View (sets `view=all`).

## Implementation Steps

1.  **Modify `tasks.vue`**:
    - **Revert/Simplify Watcher**: Remove any "toggle prevention" logic. The smart resolution logic (without the `from` check) handles "refresh/nav-to-best".
    - **Add Event Handler**: Listen for `view-all-objectives` from `TaskCard`.
    - **Handler Logic**: `setFilters({ view: 'all', map: null })`.

2.  **Modify `QuestObjectives.vue`**:
    - Make the "objectives hidden" div interactive (cursor-pointer, hover styles).
    - Add `@click` handler to emit `view-all-objectives`.
    - Update styling to look like a link or interactive element (e.g., `text-primary` on hover).

3.  **Modify `TaskCard.vue`**:
    - Propagate `view-all-objectives` event from `QuestObjectives` to parent.

## Code Changes

### `tasks.vue`

Simplify watcher:

```typescript
watch(
  () => router.currentRoute.value,
  (to, from) => {
    // Just resolve smart navigation.
    // If we are on map and click clean link, smart nav will put us back on map.
    // This is "refresh" behavior, which is fine/desired now.
    resolveSmartNavigation(to, from);
  },
  { immediate: true }
);
```

Add handler:

```html
<TaskCard ... @view-all-objectives="setFilters({ view: 'all', map: null })" />
```

### `QuestObjectives.vue`

```html
<div
  v-if="irrelevantCount > 0"
  class="hover:text-primary-500 flex w-full items-center p-1 text-sm text-gray-500 transition-colors hover:cursor-pointer hover:underline"
  role="button"
  @click="$emit('view-all-objectives')"
>
  <!-- content -->
</div>
```
