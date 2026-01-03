import { extractBearerToken, validateToken } from './auth';
import {
  handleGetProgress,
  handleUpdateTask,
  handleUpdateTasks,
  handleUpdateLevel,
  handleUpdateObjective,
} from './handlers/progress';
import { handleGetToken } from './handlers/token';
import type { Env, TaskState, BatchTaskUpdate, LegacyTokenResponse } from './types';
/**
 * Normalize task updates to support both legacy object and array formats
 * Legacy: { "taskId1": "completed", "taskId2": "failed" }
 * New: [{ id: "taskId1", state: "completed" }, ...]
 */
function normalizeTaskUpdates(body: unknown): BatchTaskUpdate[] | null {
  if (Array.isArray(body)) {
    // New array format
    for (const item of body) {
      if (typeof item !== 'object' || !item) return null;
      const { id, state } = item as Record<string, unknown>;
      if (typeof id !== 'string' || typeof state !== 'string') return null;
      if (!['completed', 'uncompleted', 'failed'].includes(state)) return null;
    }
    return body as BatchTaskUpdate[];
  }
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    // Legacy object format: { taskId: state, ... }
    const updates: BatchTaskUpdate[] = [];
    for (const [id, state] of Object.entries(body)) {
      if (typeof state !== 'string') return null;
      if (!['completed', 'uncompleted', 'failed'].includes(state)) return null;
      updates.push({ id, state: state as TaskState });
    }
    return updates;
  }
  return null;
}
type Action = 'progress-read' | 'progress-write' | 'token-info';
const RATE_LIMITS: Record<Action, { limit: number; windowSec: number }> = {
  'progress-read': { limit: 60, windowSec: 60 },
  'progress-write': { limit: 30, windowSec: 60 },
  'token-info': { limit: 60, windowSec: 60 },
};
async function rateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSec * 1000));
  const kvKey = `rl:${bucket}:${key}`;
  const current = Number(await env.API_GATEWAY_KV.get(kvKey)) || 0;
  if (current >= limit) return false;
  await env.API_GATEWAY_KV.put(kvKey, String(current + 1), { expirationTtl: windowSec });
  return true;
}
function resolveOrigin(envOrigin?: string, requestOrigin?: string): string {
  if (!envOrigin || envOrigin === '*') return '*';
  const list = envOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (!list.length) return '*';
  if (requestOrigin && list.includes(requestOrigin)) return requestOrigin;
  return list[0];
}
function corsHeaders(envOrigin?: string, requestOrigin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(envOrigin, requestOrigin),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
}
/**
 * Create a flat response for token endpoint (legacy format - no data wrapper)
 */
function tokenFlatResponse(
  tokenData: LegacyTokenResponse,
  envOrigin?: string,
  requestOrigin?: string
): Response {
  const body = { success: true, ...tokenData };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(envOrigin, requestOrigin),
      'Cache-Control': 'no-store',
    },
  });
}
/**
 * Create a success response with legacy envelope format
 */
function successResponse(
  data: unknown,
  meta?: Record<string, unknown>,
  status = 200,
  envOrigin?: string,
  requestOrigin?: string
): Response {
  const body: Record<string, unknown> = { success: true };
  // If data has its own data/meta structure, flatten it
  if (data && typeof data === 'object' && 'data' in data) {
    body.data = (data as Record<string, unknown>).data;
    body.meta = (data as Record<string, unknown>).meta || meta;
  } else {
    body.data = data;
    if (meta) body.meta = meta;
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(envOrigin, requestOrigin),
      'Cache-Control': 'no-store',
    },
  });
}
/**
 * Create an error response with legacy envelope format
 */
function errorResponse(
  error: string,
  status = 500,
  envOrigin?: string,
  requestOrigin?: string
): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(envOrigin, requestOrigin),
      'Cache-Control': 'no-store',
    },
  });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = '/' + url.pathname.split('/').filter(Boolean).join('/');
    const origin = env.ALLOWED_ORIGIN;
    const reqOrigin = request.headers.get('Origin') || undefined;
    const headers = corsHeaders(origin, reqOrigin);
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    // Health check
    if (path === '/health') {
      return successResponse(
        {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          service: 'tarkovtracker-api',
        },
        undefined,
        200,
        origin,
        reqOrigin
      );
    }
    // Match API routes (support both /api and /api/v2 prefixes)
    const apiMatch = path.match(/^\/api(?:\/v2)?(.*)$/);
    if (!apiMatch) {
      return new Response('Not Found', { status: 404, headers });
    }
    const apiPath = apiMatch[1] || '/';
    // Extract and validate token
    const authHeader = request.headers.get('Authorization');
    const rawToken = extractBearerToken(authHeader);
    if (!rawToken) {
      return errorResponse('Unauthorized', 401, origin, reqOrigin);
    }
    try {
      // GET /token - Token info
      if (apiPath === '/token' && request.method === 'GET') {
        const validation = await validateToken(env, rawToken, 'GP');
        if (!validation.valid) {
          return errorResponse(validation.error, validation.status, origin, reqOrigin);
        }
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rlKey = `token-info:${clientIp}:${rawToken.slice(-16)}`;
        if (
          !(await rateLimit(
            env,
            rlKey,
            RATE_LIMITS['token-info'].limit,
            RATE_LIMITS['token-info'].windowSec
          ))
        ) {
          return errorResponse('Rate limit exceeded', 429, origin, reqOrigin);
        }
        const tokenResponse = handleGetToken(validation.token, rawToken);
        return tokenFlatResponse(tokenResponse, origin, reqOrigin);
      }
      // GET /progress - Player progress
      if (apiPath === '/progress' && request.method === 'GET') {
        const validation = await validateToken(env, rawToken, 'GP');
        if (!validation.valid) {
          return errorResponse(validation.error, validation.status, origin, reqOrigin);
        }
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rlKey = `progress-read:${clientIp}:${rawToken.slice(-16)}`;
        if (
          !(await rateLimit(
            env,
            rlKey,
            RATE_LIMITS['progress-read'].limit,
            RATE_LIMITS['progress-read'].windowSec
          ))
        ) {
          return errorResponse('Rate limit exceeded', 429, origin, reqOrigin);
        }
        const effectiveGameMode = validation.token.game_mode;
        const progress = await handleGetProgress(env, validation.token, effectiveGameMode);
        return successResponse(progress, undefined, 200, origin, reqOrigin);
      }
      // POST /progress/level/:levelValue - Update player level
      const levelMatch = apiPath.match(/^\/progress\/level\/(\d+)$/);
      if (levelMatch && request.method === 'POST') {
        const validation = await validateToken(env, rawToken, 'WP');
        if (!validation.valid) {
          return errorResponse(validation.error, validation.status, origin, reqOrigin);
        }
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rlKey = `progress-write:${clientIp}:${rawToken.slice(-16)}`;
        if (
          !(await rateLimit(
            env,
            rlKey,
            RATE_LIMITS['progress-write'].limit,
            RATE_LIMITS['progress-write'].windowSec
          ))
        ) {
          return errorResponse('Rate limit exceeded', 429, origin, reqOrigin);
        }
        const level = parseInt(levelMatch[1], 10);
        if (isNaN(level) || level < 1 || level > 79) {
          return errorResponse('Invalid level value (must be 1-79)', 400, origin, reqOrigin);
        }
        const effectiveGameMode = validation.token.game_mode;
        const result = await handleUpdateLevel(env, validation.token, level, effectiveGameMode);
        return successResponse(result, undefined, 200, origin, reqOrigin);
      }
      // POST /progress/task/objective/:objectiveId - Update task objective
      const objectiveMatch = apiPath.match(/^\/progress\/task\/objective\/([^/]+)$/);
      if (objectiveMatch && request.method === 'POST') {
        const validation = await validateToken(env, rawToken, 'WP');
        if (!validation.valid) {
          return errorResponse(validation.error, validation.status, origin, reqOrigin);
        }
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rlKey = `progress-write:${clientIp}:${rawToken.slice(-16)}`;
        if (
          !(await rateLimit(
            env,
            rlKey,
            RATE_LIMITS['progress-write'].limit,
            RATE_LIMITS['progress-write'].windowSec
          ))
        ) {
          return errorResponse('Rate limit exceeded', 429, origin, reqOrigin);
        }
        const body = (await request.json()) as { state?: string; count?: number };
        if (!body.state && body.count === undefined) {
          return errorResponse('Must provide state or count', 400, origin, reqOrigin);
        }
        if (body.state && !['completed', 'uncompleted'].includes(body.state)) {
          return errorResponse(
            'Invalid state (must be completed or uncompleted)',
            400,
            origin,
            reqOrigin
          );
        }
        const effectiveGameMode = validation.token.game_mode;
        const result = await handleUpdateObjective(
          env,
          validation.token,
          objectiveMatch[1],
          body,
          effectiveGameMode
        );
        return successResponse(result, undefined, 200, origin, reqOrigin);
      }
      // POST /progress/task/:taskId - Update single task
      const taskMatch = apiPath.match(/^\/progress\/task\/([^/]+)$/);
      if (taskMatch && request.method === 'POST') {
        const validation = await validateToken(env, rawToken, 'WP');
        if (!validation.valid) {
          return errorResponse(validation.error, validation.status, origin, reqOrigin);
        }
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rlKey = `progress-write:${clientIp}:${rawToken.slice(-16)}`;
        if (
          !(await rateLimit(
            env,
            rlKey,
            RATE_LIMITS['progress-write'].limit,
            RATE_LIMITS['progress-write'].windowSec
          ))
        ) {
          return errorResponse('Rate limit exceeded', 429, origin, reqOrigin);
        }
        const body = (await request.json()) as { state?: string };
        const state = body.state as TaskState;
        if (!state || !['completed', 'uncompleted', 'failed'].includes(state)) {
          return errorResponse('Invalid state', 400, origin, reqOrigin);
        }
        const effectiveGameMode = validation.token.game_mode;
        const result = await handleUpdateTask(
          env,
          validation.token,
          taskMatch[1],
          state,
          effectiveGameMode
        );
        return successResponse(result, undefined, 200, origin, reqOrigin);
      }
      // POST /progress/tasks - Batch update tasks
      if (apiPath === '/progress/tasks' && request.method === 'POST') {
        const validation = await validateToken(env, rawToken, 'WP');
        if (!validation.valid) {
          return errorResponse(validation.error, validation.status, origin, reqOrigin);
        }
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rlKey = `progress-write:${clientIp}:${rawToken.slice(-16)}`;
        if (
          !(await rateLimit(
            env,
            rlKey,
            RATE_LIMITS['progress-write'].limit,
            RATE_LIMITS['progress-write'].windowSec
          ))
        ) {
          return errorResponse('Rate limit exceeded', 429, origin, reqOrigin);
        }
        const body = await request.json();
        // Support both legacy object format and new array format
        const updates = normalizeTaskUpdates(body);
        if (!updates) {
          return errorResponse('Invalid request body', 400, origin, reqOrigin);
        }
        const effectiveGameMode = validation.token.game_mode;
        const result = await handleUpdateTasks(env, validation.token, updates, effectiveGameMode);
        return successResponse(result, undefined, 200, origin, reqOrigin);
      }
      // Route not found
      return errorResponse('Not Found', 404, origin, reqOrigin);
    } catch (error) {
      console.error('API error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500,
        origin,
        reqOrigin
      );
    }
  },
};
