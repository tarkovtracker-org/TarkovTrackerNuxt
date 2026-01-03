export interface Env {
  TEAM_GATEWAY_KV: KVNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGIN?: string;
}
type TeamAction = "team-create" | "team-join" | "team-leave" | "team-kick";
type TokenAction = "token-create" | "token-revoke";
type Action = TeamAction | TokenAction;
const RATE_LIMITS: Record<Action, { limit: number; windowSec: number }> = {
  "team-create": { limit: 10, windowSec: 3600 }, // 10 creates/hour per ip+user
  "team-join": { limit: 30, windowSec: 600 }, // 30 joins/10min
  "team-leave": { limit: 30, windowSec: 3600 },
  "team-kick": { limit: 20, windowSec: 3600 },
  // Token operations: separate buckets
  "token-revoke": { limit: 50, windowSec: 600 },
  "token-create": { limit: 8, windowSec: 3600 },
};
const fnMap: Record<TeamAction, string> = {
  "team-create": "team-create",
  "team-join": "team-join",
  "team-leave": "team-leave",
  "team-kick": "team-kick",
};
async function rateLimit(env: Env, key: string, limit: number, windowSec: number) {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSec * 1000));
  const kvKey = `rl:${bucket}:${key}`;
  const current = Number(await env.TEAM_GATEWAY_KV.get(kvKey)) || 0;
  if (current >= limit) {
    return false;
  }
  await env.TEAM_GATEWAY_KV.put(kvKey, String(current + 1), {
    expirationTtl: windowSec,
  });
  return true;
}
function resolveOrigin(envOrigin?: string, requestOrigin?: string) {
  if (!envOrigin || envOrigin === "*") return "*";
  const list = envOrigin.split(",").map((o) => o.trim()).filter(Boolean);
  if (!list.length) return "*";
  if (requestOrigin && list.includes(requestOrigin)) return requestOrigin;
  // default to first configured origin to avoid open CORS in prod
  return list[0];
}
function corsHeaders(envOrigin?: string, requestOrigin?: string) {
  const allowOrigin = resolveOrigin(envOrigin, requestOrigin);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,apikey",
  };
}
function jsonResponse(data: unknown, status = 200, envOrigin?: string, requestOrigin?: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(envOrigin, requestOrigin),
      "cache-control": "no-store",
    },
  });
}
async function proxyToSupabase(
  env: Env,
  action: TeamAction,
  authHeader: string | null,
  body: Record<string, unknown>
) {
  const fnName = fnMap[action];
  const url = `${env.SUPABASE_URL}/functions/v1/${fnName}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_ANON_KEY,
  };
  if (authHeader) headers.Authorization = authHeader;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}
async function handleAction(request: Request, env: Env, action: TeamAction) {
  const origin = env.ALLOWED_ORIGIN;
  const reqOrigin = request.headers.get("Origin") || undefined;
  const headers = corsHeaders(origin, reqOrigin);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers });
  }
  const clientIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  const key = `${action}:${clientIp}:${authHeader.slice(-24)}`;
  const { limit, windowSec } = RATE_LIMITS[action];
  const allowed = await rateLimit(env, key, limit, windowSec);
  if (!allowed) {
    return new Response("Rate limit exceeded", { status: 429, headers });
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // keep empty
  }
  // Try proxy to Supabase Function first
  let resp: Response;
  try {
    resp = await proxyToSupabase(env, action, authHeader, body);
    if (resp.status < 500 || action !== "team-leave") {
      const outHeaders = new Headers(resp.headers);
      Object.entries(headers).forEach(([k, v]) => outHeaders.set(k, v));
      return new Response(await resp.text(), { status: resp.status, headers: outHeaders });
    }
  } catch {
    if (action !== "team-leave") {
      return new Response("Internal Server Error", { status: 500, headers });
    }
    // fall through for leave fallback
  }
  // Fallback path for team-leave: perform the operation directly with service role to avoid edge-function reachability issues
  if (action === "team-leave") {
    const { teamId } = body as { teamId?: string };
    if (!teamId) {
      return jsonResponse({ error: "teamId required" }, 400, origin, reqOrigin);
    }
    let userId = "";
    try {
      const user = await fetchUser(env, authHeader!);
      userId = user.id;
    } catch (error) {
      if (error instanceof Response) return error;
      return new Response("Unauthorized", { status: 401, headers });
    }
    const api = (path: string, init?: RequestInit) =>
      fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          ...(init?.headers as Record<string, string> | undefined),
        },
      });
    const fetchTeam = async () => {
      const teamRes = await api(
        `teams?id=eq.${teamId}&select=id,game_mode&limit=1`
      );
      if (!teamRes.ok) {
        const txt = await teamRes.text();
        return jsonResponse(
          { error: "Failed to load team", details: txt },
          teamRes.status,
          origin,
          reqOrigin
        );
      }
      const teamData = (await teamRes.json()) as Array<{ game_mode?: string | null }>;
      const team = teamData[0];
      if (!team) {
        return jsonResponse({ error: "Team not found" }, 404, origin, reqOrigin);
      }
      if (!team.game_mode) {
        return jsonResponse({ error: "Team missing game_mode" }, 400, origin, reqOrigin);
      }
      return team;
    };
    const clearUserSystem = async (gameMode: "pvp" | "pve"): Promise<Response | null> => {
      const body =
        gameMode === "pve"
          ? { user_id: userId, pve_team_id: null, updated_at: new Date().toISOString() }
          : { user_id: userId, pvp_team_id: null, updated_at: new Date().toISOString() };
      const res = await api(`user_system`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { Prefer: "resolution=merge-duplicates" },
      });
      if (!res.ok) {
        const txt = await res.text();
        return jsonResponse(
          { error: "Failed to clear user system", details: txt },
          res.status,
          origin,
          reqOrigin
        );
      }
      return null;
    };
    const teamInfo = await fetchTeam();
    if (teamInfo instanceof Response) return teamInfo;
    const gameMode = teamInfo.game_mode === "pve" ? "pve" : "pvp";
    // Fetch membership
    const membershipRes = await api(
      `team_memberships?team_id=eq.${teamId}&user_id=eq.${userId}&select=role,user_id&limit=1`
    );
    if (!membershipRes.ok) {
      const txt = await membershipRes.text();
      return jsonResponse({ error: "Failed to load membership", details: txt }, 500, origin, reqOrigin);
    }
    const membershipData = (await membershipRes.json()) as Array<{ role?: string }>;
    const membership = membershipData[0];
    if (!membership) {
      return jsonResponse({ error: "You are not a member of this team" }, 404, origin, reqOrigin);
    }
    // If owner, ensure no other members then delete team
    if (membership.role === "owner") {
      const othersRes = await api(
        `team_memberships?team_id=eq.${teamId}&user_id=neq.${userId}&select=user_id&limit=1`
      );
      if (!othersRes.ok) {
        const txt = await othersRes.text();
        return jsonResponse({ error: "Failed to check team members", details: txt }, 500, origin, reqOrigin);
      }
      const others = await othersRes.json();
      if (Array.isArray(others) && others.length > 0) {
        return jsonResponse(
          { error: "Team owner cannot leave while other members exist" },
          400,
          origin,
          reqOrigin
        );
      }
      // 1. Clear user_system first (to avoid FK constraint)
      const clearError = await clearUserSystem(gameMode);
      if (clearError) return clearError;
      // 2. Delete all memberships (including owner's)
      const delMemberships = await api(`team_memberships?team_id=eq.${teamId}`, { method: "DELETE" });
      if (!delMemberships.ok) {
        const txt = await delMemberships.text();
        return jsonResponse({ error: "Failed to delete memberships", details: txt }, delMemberships.status, origin, reqOrigin);
      }
      // 3. Delete the team
      const delTeam = await api(`teams?id=eq.${teamId}`, { method: "DELETE" });
      if (!delTeam.ok) {
        const txt = await delTeam.text();
        return jsonResponse({ error: "Failed to delete team", details: txt }, delTeam.status, origin, reqOrigin);
      }
    } else {
      // Regular member: delete membership
      const delMem = await api(
        `team_memberships?team_id=eq.${teamId}&user_id=eq.${userId}`,
        { method: "DELETE" }
      );
      if (!delMem.ok) {
        const txt = await delMem.text();
        return jsonResponse({ error: "Failed to leave team", details: txt }, delMem.status, origin, reqOrigin);
      }
      // Update user_system
      const clearError = await clearUserSystem(gameMode);
      if (clearError) return clearError;
    }
    // Log event (best-effort)
    await api(`team_events`, {
      method: "POST",
      body: JSON.stringify({
        team_id: teamId,
        event_type: "member_left",
        target_user: userId,
        initiated_by: userId,
        created_at: new Date().toISOString(),
      }),
    });
    return jsonResponse({ success: true }, 200, origin, reqOrigin);
  }
  return new Response("Internal Server Error", { status: 500, headers });
}
async function fetchUser(env: Env, authHeader: string) {
  const url = `${env.SUPABASE_URL}/auth/v1/user`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return (await res.json()) as { id: string };
}
async function handleTokenAction(request: Request, env: Env, action: TokenAction) {
  const origin = env.ALLOWED_ORIGIN;
  const reqOrigin = request.headers.get("Origin") || undefined;
  const headers = corsHeaders(origin, reqOrigin);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers });
  }
  const clientIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // keep empty
  }
  let userId = "";
  try {
    const user = await fetchUser(env, authHeader);
    userId = user.id;
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response("Unauthorized", { status: 401, headers });
  }
  const rlKey = `${action}:${clientIp}:${userId}`;
  const { limit = 20, windowSec = 3600 } = RATE_LIMITS[action];
  const allowed = await rateLimit(env, rlKey, limit, windowSec);
  if (!allowed) {
    return new Response("Rate limit exceeded", { status: 429, headers });
  }
  if (action === "token-revoke") {
    const tokenId = body.tokenId as string;
    if (!tokenId) return jsonResponse({ error: "tokenId required" }, 400, origin, reqOrigin);
    const url = `${env.SUPABASE_URL}/rest/v1/api_tokens?token_id=eq.${tokenId}&user_id=eq.${userId}`;
    const resp = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      return jsonResponse({ error: "Failed to revoke", details: text }, resp.status, origin, reqOrigin);
    }
    return jsonResponse({ success: true }, 200, origin, reqOrigin);
  }
  if (action === "token-create") {
    // Accept either client-provided token_hash/token_value or generate server-side
    let tokenValue = (body.tokenValue as string) || "";
    const permissions = (body.permissions as string[]) || [];
    const gameMode = (body.gameMode as string) || "";
    const note = (body.note as string | null) || null;
    if (!gameMode || permissions.length === 0) {
      return jsonResponse({ error: "gameMode and permissions are required" }, 400, origin, reqOrigin);
    }
    if (!tokenValue) {
      // generate a token if the client did not supply one
      const bytes = crypto.getRandomValues(new Uint8Array(9));
      const prefix = gameMode === "pve" ? "PVE" : "PVP";
      tokenValue = `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
    }
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(tokenValue));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const insertBody = {
      user_id: userId,
      token_hash: tokenHash,
      token_value: tokenValue,
      permissions,
      game_mode: gameMode,
      note,
    };
    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/api_tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(insertBody),
    });
    let text = await resp.text();
    if (!resp.ok) {
      // If the column does not exist (old DB), retry without token_value
      try {
        const errJson = JSON.parse(text);
        if (errJson?.code === "42703") {
          delete (insertBody as Record<string, unknown>).token_value;
          const retry = await fetch(`${env.SUPABASE_URL}/rest/v1/api_tokens`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(insertBody),
          });
          text = await retry.text();
          if (!retry.ok) {
            return jsonResponse(
              { error: "Failed to create token", details: text },
              retry.status,
              origin,
              reqOrigin
            );
          }
          // return here with tokenValue still available for client display
          return jsonResponse({ success: true, tokenId: JSON.parse(text)[0]?.token_id, tokenValue }, 200, origin, reqOrigin);
        }
      } catch {
        // fall through
      }
      return jsonResponse({ error: "Failed to create token", details: text }, resp.status, origin, reqOrigin);
    }
    let created: { token_id?: string } | undefined;
    try {
      created = JSON.parse(text)[0];
    } catch {
      // ignore
    }
    return jsonResponse({ success: true, tokenId: created?.token_id, tokenValue }, 200, origin, reqOrigin);
  }
  return new Response("Not Implemented", { status: 501, headers });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Normalize path: collapse duplicate slashes, strip trailing slash (except root)
    const normalized = "/" + url.pathname.split("/").filter(Boolean).join("/");
    const path = normalized === "//" || normalized === "/" ? "/" : normalized;
    if (path === "/health") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders(env.ALLOWED_ORIGIN, request.headers.get("Origin") || undefined),
      });
    }
    if (path === "/token/revoke") return handleTokenAction(request, env, "token-revoke");
    if (path === "/token/create") return handleTokenAction(request, env, "token-create");
    if (path === "/team/create") return handleAction(request, env, "team-create");
    if (path === "/team/join") return handleAction(request, env, "team-join");
    if (path === "/team/leave") return handleAction(request, env, "team-leave");
    if (path === "/team/kick") return handleAction(request, env, "team-kick");
    return new Response("Not Found", { status: 404, headers: corsHeaders(env.ALLOWED_ORIGIN) });
  },
};
