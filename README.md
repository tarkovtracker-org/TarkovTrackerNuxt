# TarkovTracker

A comprehensive Escape from Tarkov progress tracker built with Nuxt 4, featuring team collaboration, dual game mode support (PvP/PvE), and real-time synchronization via Supabase.

## Features

- **Dual Game Mode Support**: Track progress separately for PvP and PvE modes
- **Team Collaboration**: Share progress with teammates in real-time
- **Task Tracking**: Monitor quest completions and objectives
- **Hideout Progress**: Track module upgrades and parts
- **Player Level Progress**: Monitor leveling across different factions
- **Real-time Sync**: Automatic synchronization via Supabase
- **Multi-language Support**: Available in English, German, Spanish, French, Russian, and Ukrainian

## Tech Stack

- **Framework**: Nuxt 4 (SPA mode)
- **UI**: Nuxt UI component library
- **Styling**: Tailwind CSS v4
- **State Management**: Pinia with three-store architecture
- **Backend**: Supabase (authentication, database, real-time)
- **API**: Nuxt server-side proxy to tarkov.dev GraphQL API
- **Deployment**: Cloudflare Pages

## Setup

Install dependencies:

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required variables for your environment:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anonymous_key
```

### GitHub Issue Integration

The `/report-issue` page can automatically open GitHub issues when the following server-side variables are configured (either locally in `.env` or on your hosting provider such as Cloudflare Pages secrets):

```env
GITHUB_BOT_TOKEN=ghp_your_bot_or_fine_grained_token_with_repo_scope
GITHUB_REPO_OWNER=tarkovtracker-org
GITHUB_REPO_NAME=tarkovtrackernuxt
```

These values are injected into `runtimeConfig.github` inside `nuxt.config.ts`, so no manual edits to the config file are needed—just make sure the env vars exist. Use a dedicated machine account such as `tarkovtrackerbot` with a classic or fine-grained token that has `repo` scope for the target repository.

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Code Quality

```bash
# Lint code
npx eslint .

# Run tests
npx vitest
```

## Production

Build for production:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## Project Structure

- `app/` - Main application source directory
- `app/features/` - Feature-specific components organized by domain
- `app/components/` - Global/shared UI components
- `app/stores/` - Pinia stores for state management
- `app/composables/` - Reusable composition functions
- `app/pages/` - File-based routing
- `app/server/api/` - Nuxt server routes for API proxying
- `docs/` - Project documentation and migration guides

## Documentation

For detailed development guidelines, architecture information, and migration progress, see the files in the `docs/` directory.

## License

This project is licensed under the MIT License.
