import { getTasks, getHideoutStations } from '../services/tarkov';
import { extractGameModeData, transformProgress } from '../utils/transform';
import type {
  Env,
  ApiToken,
  UserProgressRow,
  ProgressResponse,
  TaskState,
  BatchTaskUpdate,
} from '../types';
const DISPLAY_NAME_CACHE_TTL_SECONDS = 86400;
function getMetaString(metadata: Record<string, unknown>, key: string): string | null {
  return typeof metadata[key] === 'string' ? (metadata[key] as string) : null;
}
function extractUsername(
  userMetadata: Record<string, unknown>,
  email: string | null,
  provider: string | null
): string | null {
  if (provider === 'discord') {
    const globalName = getMetaString(userMetadata, 'global_name');
    const username = getMetaString(userMetadata, 'username');
    const preferredUsername = getMetaString(userMetadata, 'preferred_username');
    const fullName = getMetaString(userMetadata, 'full_name');
    const legacyName = getMetaString(userMetadata, 'name');
    return (
      globalName ||
      username ||
      preferredUsername ||
      fullName ||
      legacyName?.split('#')[0] ||
      email?.split('@')[0] ||
      null
    );
  }
  if (provider === 'twitch') {
    return (
      getMetaString(userMetadata, 'preferred_username') ||
      getMetaString(userMetadata, 'name') ||
      email?.split('@')[0] ||
      null
    );
  }
  return getMetaString(userMetadata, 'name') || email?.split('@')[0] || null;
}
function extractDisplayName(
  userMetadata: Record<string, unknown>,
  provider: string | null,
  username: string | null
): string | null {
  const fullName = getMetaString(userMetadata, 'full_name');
  if (provider === 'discord') {
    return username;
  }
  if (provider === 'twitch') {
    return fullName || username;
  }
  return fullName || username;
}
async function getUserDisplayName(env: Env, userId: string): Promise<string | null> {
  const cacheKey = `user-display:${userId}`;
  const cached = await env.API_GATEWAY_KV.get(cacheKey);
  if (cached) return cached;
  try {
    const url = `${env.SUPABASE_URL}/auth/v1/admin/users/${userId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      email?: string | null;
      user_metadata?: Record<string, unknown> | null;
      app_metadata?: Record<string, unknown> | null;
    };
    const userMetadata =
      data.user_metadata && typeof data.user_metadata === 'object' ? data.user_metadata : {};
    const appMetadata =
      data.app_metadata && typeof data.app_metadata === 'object' ? data.app_metadata : {};
    const provider = typeof appMetadata.provider === 'string' ? appMetadata.provider : null;
    const email = typeof data.email === 'string' ? data.email : null;
    const username = extractUsername(userMetadata, email, provider);
    const displayName = extractDisplayName(userMetadata, provider, username);
    const resolved = displayName || username || (email ? email.split('@')[0] : null);
    if (resolved) {
      await env.API_GATEWAY_KV.put(cacheKey, resolved, {
        expirationTtl: DISPLAY_NAME_CACHE_TTL_SECONDS,
      });
    }
    return resolved;
  } catch {
    return null;
  }
}
/**
 * Handle GET /api/progress - Return player progress
 */
export async function handleGetProgress(
  env: Env,
  token: ApiToken,
  gameMode: 'pvp' | 'pve'
): Promise<ProgressResponse> {
  // Fetch user progress from Supabase
  const url = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${token.user_id}&select=*&limit=1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user progress');
  }
  const rows = (await response.json()) as UserProgressRow[];
  const row = rows[0] || null;
  const gameEdition = row?.game_edition ?? 1;
  // Extract game mode specific data
  const progressData = extractGameModeData(row, gameMode);
  const fallbackDisplayName =
    progressData?.displayName?.trim() || (await getUserDisplayName(env, token.user_id));
  // Fetch task and hideout data (cached)
  const [tasks, hideoutStations] = await Promise.all([getTasks(env), getHideoutStations(env)]);
  // Transform to API response format
  const data = transformProgress(
    progressData,
    token.user_id,
    gameEdition,
    tasks,
    hideoutStations,
    fallbackDisplayName
  );
  return {
    data,
    meta: {
      self: token.user_id,
      gameMode: gameMode,
    },
  };
}
/**
 * Handle POST /api/progress/level/:levelValue - Update player level
 */
export async function handleUpdateLevel(
  env: Env,
  token: ApiToken,
  level: number,
  gameMode: 'pvp' | 'pve'
): Promise<{ level: number; message: string }> {
  const dataField = gameMode === 'pve' ? 'pve_data' : 'pvp_data';
  // Fetch current data
  const getUrl = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${token.user_id}&select=${dataField}`;
  const getRes = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  const rows = (await getRes.json()) as Array<Record<string, unknown>>;
  const currentData = (rows[0]?.[dataField] as Record<string, unknown>) || {};
  // Update level
  currentData.level = level;
  // Save back
  const patchUrl = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${token.user_id}`;
  await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ [dataField]: currentData }),
  });
  return { level, message: 'Level updated successfully' };
}
/**
 * Handle POST /api/progress/task/objective/:objectiveId - Update task objective
 */
export async function handleUpdateObjective(
  env: Env,
  token: ApiToken,
  objectiveId: string,
  update: { state?: string; count?: number },
  gameMode: 'pvp' | 'pve'
): Promise<{ objectiveId: string; state?: string; count?: number; message: string }> {
  const dataField = gameMode === 'pve' ? 'pve_data' : 'pvp_data';
  const updateTime = Date.now();
  // Fetch current data
  const getUrl = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${token.user_id}&select=${dataField}`;
  const getRes = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  const rows = (await getRes.json()) as Array<Record<string, unknown>>;
  const currentData = (rows[0]?.[dataField] as Record<string, unknown>) || {};
  const taskObjectives =
    (currentData.taskObjectives as Record<string, Record<string, unknown>>) || {};
  // Get or create objective data
  const objectiveData = taskObjectives[objectiveId] || {};
  // Update state if provided
  if (update.state !== undefined) {
    objectiveData.complete = update.state === 'completed';
    objectiveData.timestamp = updateTime;
  }
  // Update count if provided
  if (update.count !== undefined) {
    objectiveData.count = update.count;
    if (!objectiveData.timestamp) {
      objectiveData.timestamp = updateTime;
    }
  }
  taskObjectives[objectiveId] = objectiveData;
  currentData.taskObjectives = taskObjectives;
  // Save back
  const patchUrl = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${token.user_id}`;
  await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ [dataField]: currentData }),
  });
  return {
    objectiveId,
    ...(update.state !== undefined && { state: update.state }),
    ...(update.count !== undefined && { count: update.count }),
    message: 'Task objective updated successfully',
  };
}
/**
 * Handle POST /api/progress/task/:taskId - Update single task
 */
export async function handleUpdateTask(
  env: Env,
  token: ApiToken,
  taskId: string,
  state: TaskState,
  gameMode: 'pvp' | 'pve'
): Promise<{ taskId: string; state: string; message: string }> {
  const updateTime = Date.now();
  // Build update data based on state
  const taskData: Record<string, boolean | number> = {
    complete: state === 'completed' || state === 'failed',
    failed: state === 'failed',
    timestamp: updateTime,
  };
  // Use RPC to update nested JSON field
  const url = `${env.SUPABASE_URL}/rest/v1/rpc/update_task_completion`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: token.user_id,
      p_game_mode: gameMode,
      p_task_id: taskId,
      p_complete: taskData.complete,
      p_failed: taskData.failed,
      p_timestamp: taskData.timestamp,
    }),
  });
  if (!response.ok) {
    // Fallback: fetch, modify, and update the entire row
    await updateTaskFallback(env, token.user_id, gameMode, taskId, taskData);
  }
  return { taskId, state, message: 'Task updated successfully' };
}
/**
 * Fallback: fetch, modify, and update entire progress row
 */
async function updateTaskFallback(
  env: Env,
  userId: string,
  gameMode: 'pvp' | 'pve',
  taskId: string,
  taskData: Record<string, boolean | number>
): Promise<void> {
  const dataField = gameMode === 'pve' ? 'pve_data' : 'pvp_data';
  // Fetch current data
  const getUrl = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${userId}&select=${dataField}`;
  const getRes = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  const rows = (await getRes.json()) as Array<Record<string, unknown>>;
  const currentData = (rows[0]?.[dataField] as Record<string, unknown>) || {};
  const taskCompletions = (currentData.taskCompletions as Record<string, unknown>) || {};
  // Update task completion
  taskCompletions[taskId] = taskData;
  currentData.taskCompletions = taskCompletions;
  // Save back
  const patchUrl = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${userId}`;
  await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ [dataField]: currentData }),
  });
}
/**
 * Handle POST /api/progress/tasks - Batch update tasks
 */
export async function handleUpdateTasks(
  env: Env,
  token: ApiToken,
  updates: BatchTaskUpdate[],
  gameMode: 'pvp' | 'pve'
): Promise<{ updatedTasks: string[]; message: string }> {
  const dataField = gameMode === 'pve' ? 'pve_data' : 'pvp_data';
  const updateTime = Date.now();
  // Fetch current data
  const getUrl = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${token.user_id}&select=${dataField}`;
  const getRes = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  const rows = (await getRes.json()) as Array<Record<string, unknown>>;
  const currentData = (rows[0]?.[dataField] as Record<string, unknown>) || {};
  const taskCompletions = (currentData.taskCompletions as Record<string, unknown>) || {};
  // Apply all updates
  for (const update of updates) {
    taskCompletions[update.id] = {
      complete: update.state === 'completed' || update.state === 'failed',
      failed: update.state === 'failed',
      timestamp: updateTime,
    };
  }
  currentData.taskCompletions = taskCompletions;
  // Save back
  const patchUrl = `${env.SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${token.user_id}`;
  await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ [dataField]: currentData }),
  });
  return { updatedTasks: updates.map((u) => u.id), message: 'Tasks updated successfully' };
}
