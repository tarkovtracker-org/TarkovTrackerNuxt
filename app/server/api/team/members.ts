import { createError, defineEventHandler, getQuery, getRequestHeader } from 'h3';
import { useRuntimeConfig } from '#imports';
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const supabaseUrl = config.supabaseUrl as string;
  const supabaseServiceKey = config.supabaseServiceKey as string;
  const supabaseAnonKey = config.supabaseAnonKey as string;
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      statusMessage:
        '[team/members] Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY must all be set',
    });
  }
  const restFetch = async (path: string, init?: RequestInit) => {
    const url = `${supabaseUrl}/rest/v1/${path}`;
    const headers = {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    };
    return fetch(url, { ...init, headers });
  };
  const teamId = (getQuery(event).teamId as string | undefined)?.trim();
  if (!teamId) {
    throw createError({ statusCode: 400, statusMessage: 'teamId is required' });
  }
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing auth token' });
  }
  // Validate token -> user via auth endpoint
  const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey,
    },
  });
  if (!authResp.ok) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' });
  }
  const user = (await authResp.json()) as { id: string };
  const userId = user.id;
  // Ensure caller is member
  const membershipResp = await restFetch(
    `team_memberships?team_id=eq.${teamId}&user_id=eq.${userId}&select=user_id&limit=1`
  );
  if (!membershipResp.ok) {
    throw createError({ statusCode: 500, statusMessage: 'Failed membership check' });
  }
  const membershipJson = (await membershipResp.json()) as Array<{ user_id: string }>;
  if (!membershipJson?.length) {
    throw createError({ statusCode: 403, statusMessage: 'Not a team member' });
  }
  // Fetch all members
  const membersResp = await restFetch(`team_memberships?team_id=eq.${teamId}&select=user_id`);
  if (!membersResp.ok) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load members' });
  }
  const membersJson = (await membersResp.json()) as Array<{ user_id: string }>;
  const memberIds = membersJson.map((m) => m.user_id);
  // Fetch display name + pvp level snapshot (best-effort)
  const idsParam = memberIds.map((id) => `"${id}"`).join(',');
  const profilesResp = await restFetch(
    `user_progress?select=user_id,current_game_mode,pvp_data,pve_data&user_id=in.(${idsParam})`
  );
  if (!profilesResp.ok) {
    const errorText = await profilesResp.text();
    console.error(`[team/members] Profiles fetch error (${profilesResp.status}):`, errorText);
  }
  const profileMap: Record<
    string,
    { displayName: string | null; level: number | null; tasksCompleted: number | null }
  > = {};
  if (profilesResp.ok) {
    const profiles = (await profilesResp.json()) as Array<{
      user_id: string;
      current_game_mode?: string | null;
      pvp_data?: {
        displayName?: string | null;
        level?: number | null;
        taskCompletions?: Record<string, { complete?: boolean; failed?: boolean }>;
      };
      pve_data?: {
        displayName?: string | null;
        level?: number | null;
        taskCompletions?: Record<string, { complete?: boolean; failed?: boolean }>;
      };
    }>;
    profiles.forEach((p) => {
      const mode = (p.current_game_mode as 'pvp' | 'pve' | null) || 'pvp';
      const data = (p as Record<string, unknown>)[`${mode}_data`] as {
        displayName?: string | null;
        level?: number | null;
        taskCompletions?: Record<string, { complete?: boolean; failed?: boolean }>;
      } | null;
      const completedCount = data?.taskCompletions
        ? Object.values(data.taskCompletions).filter((t) => t?.complete).length
        : null;
      profileMap[p.user_id] = {
        displayName: data?.displayName ?? null,
        level: data?.level ?? null,
        tasksCompleted: completedCount,
      };
    });
  } else {
    // Fallback: fetch each user individually to avoid edge-case parsing/encoding errors
    for (const id of memberIds) {
      const resp = await restFetch(
        `user_progress?select=user_id,current_game_mode,pvp_data,pve_data&user_id=eq.${id}`
      );
      if (!resp.ok) continue;
      const profiles = (await resp.json()) as Array<{
        user_id: string;
        current_game_mode?: string | null;
        pvp_data?: {
          displayName?: string | null;
          level?: number | null;
          taskCompletions?: Record<string, { complete?: boolean; failed?: boolean }>;
        };
        pve_data?: {
          displayName?: string | null;
          level?: number | null;
          taskCompletions?: Record<string, { complete?: boolean; failed?: boolean }>;
        };
      }>;
      profiles.forEach((p) => {
        const mode = (p.current_game_mode as 'pvp' | 'pve' | null) || 'pvp';
        const data = (p as Record<string, unknown>)[`${mode}_data`] as {
          displayName?: string | null;
          level?: number | null;
          taskCompletions?: Record<string, { complete?: boolean; failed?: boolean }>;
        } | null;
        const completedCount = data?.taskCompletions
          ? Object.values(data.taskCompletions).filter((t) => t?.complete).length
          : null;
        profileMap[p.user_id] = {
          displayName: data?.displayName ?? null,
          level: data?.level ?? null,
          tasksCompleted: completedCount,
        };
      });
    }
  }
  return { members: memberIds, profiles: profileMap };
});
