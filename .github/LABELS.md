# Label Reference Guide

This document describes the label system used in the TarkovTracker repository.

## Label Categories

### Type Labels (What kind of issue/PR)
| Label | Color | Description | When to Use |
|-------|-------|-------------|-------------|
| `type:bug` | ![#d73a4a](https://via.placeholder.com/15/d73a4a/000000?text=+) `#d73a4a` | Something isn't working | Broken functionality, errors, unexpected behavior |
| `type:feature` | ![#0e8a16](https://via.placeholder.com/15/0e8a16/000000?text=+) `#0e8a16` | New feature or major addition | Completely new functionality |
| `type:enhancement` | ![#a2eeef](https://via.placeholder.com/15/a2eeef/000000?text=+) `#a2eeef` | Improvement to existing feature | Making existing features better |
| `type:refactor` | ![#fbca04](https://via.placeholder.com/15/fbca04/000000?text=+) `#fbca04` | Code refactoring | Restructuring code without changing behavior |
| `type:docs` | ![#0075ca](https://via.placeholder.com/15/0075ca/000000?text=+) `#0075ca` | Documentation changes | README, comments, guides |
| `type:dependencies` | ![#0366d6](https://via.placeholder.com/15/0366d6/000000?text=+) `#0366d6` | Dependency updates | npm package updates |
| `type:chore` | ![#fef2c0](https://via.placeholder.com/15/fef2c0/000000?text=+) `#fef2c0` | Maintenance tasks | Build scripts, configs, tooling |

### Area Labels (Which part of codebase)
All area labels use `#c2e0c6` (light green) for visual grouping.

| Label | Description | Examples |
|-------|-------------|----------|
| `area:frontend` | UI/UX components | Vue components, pages, styling |
| `area:backend` | Supabase/Nitro/Workers | Server routes, edge functions, workers |
| `area:tasks` | Task/quest tracking | Quest completion, objectives, dependencies |
| `area:team` | Team features | Team sync, multiplayer, sharing |
| `area:hideout` | Hideout tracking | Module upgrades, requirements |
| `area:maps` | Map features | Interactive maps, markers |
| `area:traders` | Trader features | Trader levels, barters |
| `area:i18n` | Translations/localization | Language files, i18n system |
| `area:api` | API endpoints | REST APIs, GraphQL, webhooks |

### Priority Labels (How urgent)
| Label | Color | Description | When to Use |
|-------|-------|-------------|-------------|
| `priority:critical` | ![#b60205](https://via.placeholder.com/15/b60205/000000?text=+) `#b60205` | Blocking issues, security, data loss | Site down, data corruption, security vulnerabilities |
| `priority:high` | ![#d93f0b](https://via.placeholder.com/15/d93f0b/000000?text=+) `#d93f0b` | Important features/bugs | Major bugs affecting many users, important features |
| `priority:medium` | ![#fbca04](https://via.placeholder.com/15/fbca04/000000?text=+) `#fbca04` | Normal priority | Standard bugs and features |
| `priority:low` | ![#0e8a16](https://via.placeholder.com/15/0e8a16/000000?text=+) `#0e8a16` | Nice to have | Minor improvements, edge cases |

### Status Labels (Current state)
| Label | Color | Description | When to Use |
|-------|-------|-------------|-------------|
| `status:inbox` | ![#ededed](https://via.placeholder.com/15/ededed/000000?text=+) `#ededed` | Needs triage | New issues not yet reviewed |
| `status:blocked` | ![#d93f0b](https://via.placeholder.com/15/d93f0b/000000?text=+) `#d93f0b` | Blocked by external factor | Waiting on third-party, upstream issue |
| `status:needs-info` | ![#d4c5f9](https://via.placeholder.com/15/d4c5f9/000000?text=+) `#d4c5f9` | Waiting for more information | Need response from reporter or clarification |
| `status:in-progress` | ![#0052cc](https://via.placeholder.com/15/0052cc/000000?text=+) `#0052cc` | Actively being worked on | Someone is working on this |
| `status:ready-for-review` | ![#0e8a16](https://via.placeholder.com/15/0e8a16/000000?text=+) `#0e8a16` | PR ready for review | PR complete, needs review |

### Data Labels (Game data issues)
Both use `#f9d0c4` (light pink) for visual grouping.

| Label | Description | Examples |
|-------|-------------|----------|
| `data:quest` | Quest data issues | Wrong requirements, missing quests, incorrect objectives |
| `data:item` | Item data issues | Wrong item properties, missing items, incorrect images |

### Special Labels
| Label | Color | Description | When to Use |
|-------|-------|-------------|-------------|
| `good-first-issue` | ![#7057ff](https://via.placeholder.com/15/7057ff/000000?text=+) `#7057ff` | Good for newcomers | Simple issues perfect for first-time contributors |
| `help-wanted` | ![#008672](https://via.placeholder.com/15/008672/000000?text=+) `#008672` | Community help needed | Issues where community contributions are especially welcome |
| `duplicate` | ![#cfd3d7](https://via.placeholder.com/15/cfd3d7/000000?text=+) `#cfd3d7` | Duplicate issue | Link to original issue and close |
| `wontfix` | ![#ffffff](https://via.placeholder.com/15/ffffff/000000?text=+) `#ffffff` | Will not be addressed | Issues that won't be worked on (explain why in comments) |

## Label Usage Guidelines

### Combining Labels
Issues and PRs should typically have:
1. **One Type label** (required) - What kind of change is it?
2. **One or more Area labels** - Which parts are affected?
3. **One Priority label** (for issues) - How urgent is it?
4. **Zero or one Status label** - What's the current state?
5. **Zero or more Special labels** - Additional context

### Examples

**Bug Report:**
```
type:bug, area:tasks, priority:high, status:inbox
```

**Feature Request:**
```
type:feature, area:team, area:api, priority:medium, status:inbox, help-wanted
```

**Data Issue:**
```
type:bug, area:tasks, data:quest, priority:medium
```

**Enhancement PR:**
```
type:enhancement, area:frontend, area:maps, status:ready-for-review
```

**Dependency Update:**
```
type:dependencies, area:backend
```

### Automated Labeling
- Issue templates automatically apply initial labels
- Status labels are managed through project board automation
- Type and Area labels should be added during triage

### Label Hygiene
- Remove `status:inbox` after triage
- Update priority as needed
- Remove `status:needs-info` when information is provided
- Keep labels current and accurate

## For Maintainers

### Triage Process
1. Review new issues with `status:inbox`
2. Add appropriate `area:*` labels
3. Add `priority:*` label
4. Add `data:*` label if applicable
5. Add special labels (`good-first-issue`, `help-wanted`) if appropriate
6. Remove `status:inbox` or change to `status:needs-info` if clarification needed
7. Move to appropriate project board column

### Label Management
- Keep labels organized and consistent
- Don't create new labels without discussion
- Use existing labels whenever possible
- Archive unused labels rather than deleting
