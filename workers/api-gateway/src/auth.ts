import type { Env, ApiToken, Permission } from './types';

// Valid token prefixes: tt_ (legacy), PVE_, PVP_ (game mode specific)
const VALID_TOKEN_PREFIXES = ['tt_', 'PVE_', 'PVP_'];

/**
 * Check if token has a valid prefix format
 */
export function isValidTokenFormat(token: string): boolean {
  return VALID_TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix));
}

/**
 * SHA-256 hash a string and return hex
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
/**
 * Validate API token and return token data
 */
export async function validateToken(
  env: Env,
  token: string,
  requiredPermission?: Permission
): Promise<{ valid: true; token: ApiToken } | { valid: false; error: string; status: number }> {
  try {
    // Validate token format (must have valid prefix)
    if (!isValidTokenFormat(token)) {
      return { valid: false, error: 'Invalid token format', status: 401 };
    }
    // Hash the token for lookup
    const tokenHash = await sha256(token);
    // Query api_tokens table by hash
    const url = `${env.SUPABASE_URL}/rest/v1/api_tokens?token_hash=eq.${tokenHash}&select=*&limit=1`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (!response.ok) {
      return { valid: false, error: 'Token validation failed', status: 500 };
    }
    const tokens = (await response.json()) as ApiToken[];
    if (!tokens.length) {
      return { valid: false, error: 'Invalid token', status: 401 };
    }
    const apiToken = tokens[0];
    // Check if token is active
    if (!apiToken.is_active) {
      return { valid: false, error: 'Token is inactive', status: 401 };
    }
    // Check expiration
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return { valid: false, error: 'Token has expired', status: 401 };
    }
    // Check required permission
    if (requiredPermission && !apiToken.permissions.includes(requiredPermission)) {
      return {
        valid: false,
        error: `Missing required permission: ${requiredPermission}`,
        status: 403,
      };
    }
    // Update usage stats (non-blocking)
    updateTokenUsage(env, apiToken.token_id).catch(() => {});
    return { valid: true, token: apiToken };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, error: 'Token validation failed', status: 500 };
  }
}
/**
 * Update token usage statistics (non-blocking)
 */
async function updateTokenUsage(env: Env, tokenId: string): Promise<void> {
  // Use raw SQL via RPC to increment usage_count
  const url = `${env.SUPABASE_URL}/rest/v1/rpc/increment_token_usage`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_token_id: tokenId }),
  }).catch(() => {
    // Fallback: just update last_used_at if RPC doesn't exist
    fetch(`${env.SUPABASE_URL}/rest/v1/api_tokens?token_id=eq.${tokenId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    });
  });
}
