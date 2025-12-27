# Backend Status

## Architecture

- **Auth**: Supabase (Discord, Twitch OAuth)
- **Database**: Supabase PostgreSQL
- **Edge Functions**: Supabase Functions
- **Rate Limiting**: Cloudflare Workers (see `TEAM_SYSTEM.md`)

## In Progress

### Team Features

- [x] Integrate edge functions in `app/features/team/` components
- [x] Apply `user_system` table migration and redeploy `team-leave`

### API Tokens

- [x] `token-create` edge function
- [x] Integrate in `app/features/settings/ApiTokens.vue`
- [x] `token-list` (Implemented via direct Supabase client access)

## Deprecations

### `progress-update` edge function (removed 2025-12-25)

- [x] Confirmed all clients write to `user_progress`; no remaining calls to
      `progress-update`.
- [x] Downstream teams/apps notified; migration/release notes updated (this
      entry).
- [x] Legacy `{ error: string }` response shape recorded for historical
      reference.
- [x] Function removed from `supabase/functions/progress-update/`.

## Deployment Checklist

- [ ] Configure Cloudflare Pages environment variables
- [ ] Deploy Supabase functions: `supabase functions deploy`
- [ ] Deploy team gateway: `cd workers/team-gateway && npx wrangler deploy`
