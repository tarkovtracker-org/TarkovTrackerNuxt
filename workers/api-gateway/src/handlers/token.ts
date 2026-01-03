import type { ApiToken, LegacyTokenResponse } from '../types';
/**
 * Handle GET /api/token - Return token info with legacy fields
 */
export function handleGetToken(token: ApiToken, rawToken: string): LegacyTokenResponse {
  return {
    permissions: token.permissions,
    token: rawToken, // Return the actual bearer token, not the UUID
    owner: token.user_id,
    note: token.note || '',
    calls: token.usage_count || 0,
    gameMode: token.game_mode,
  };
}
