/**
 * Composable for calling Supabase Edge Functions
 * Provides typed methods for common edge function operations
 */

import type {
  CreateTeamResponse,
  LeaveTeamResponse,
  JoinTeamResponse,
  KickMemberResponse,
} from "@/types/team";

type GameMode = "pvp" | "pve";

interface ProgressData {
  level?: number;
  faction?: string;
  taskCompletions?: Record<string, boolean>;
  taskObjectives?: Record<string, boolean>;
  hideoutModules?: Record<string, number>;
  hideoutParts?: Record<string, number>;
}

export const useEdgeFunctions = () => {
  const { $supabase } = useNuxtApp();
  const runtimeConfig = useRuntimeConfig();
  const gatewayUrl =
    runtimeConfig?.public?.teamGatewayUrl ||
    runtimeConfig?.public?.team_gateway_url || // safety for snake_case envs
    "";

  const getAuthToken = async () => {
    const { data, error } = await $supabase.client.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) {
      throw new Error("User not authenticated");
    }
    return token;
  };

  const callGateway = async <T>(action: string, body: Record<string, unknown>): Promise<T> => {
    if (!gatewayUrl) {
      throw new Error("Gateway URL not configured");
    }
    const token = await getAuthToken();
    const response = await $fetch<T>(`${gatewayUrl}/team/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });
    return response;
  };

  const callSupabaseFunction = async <T>(fnName: string, body: Record<string, unknown>) => {
    const { data, error } = await $supabase.client.functions.invoke<T>(fnName, {
      body,
      method: "POST",
    });

    if (error) {
      throw error;
    }

    return data as T;
  };

  const preferGateway = async <T>(action: string, body: Record<string, unknown>): Promise<T> => {
    if (gatewayUrl) {
      try {
        return await callGateway<T>(action, body);
      } catch (error) {
        console.warn(`[EdgeFunctions] Gateway failed, falling back to Supabase:`, error);
      }
    }
    const fnName = `team-${action}`;
    return await callSupabaseFunction<T>(fnName, body);
  };

  /**
   * Update user progress for a specific game mode
   * @param gameMode The game mode (pvp or pve)
   * @param progressData The progress data to update
   */
  const updateProgress = async (gameMode: GameMode, progressData: ProgressData) => {
    const { data, error } = await $supabase.client.functions.invoke("progress-update", {
      body: { gameMode, progressData },
      method: "POST",
    });

    if (error) {
      console.error("Progress update failed:", error);
      throw error;
    }

    return data;
  };

  /**
   * Create a new team
   * @param name Team name
   * @param password Team password
   * @param maxMembers Maximum number of team members (2-10)
   */
  const createTeam = async (
    name: string,
    password: string,
    maxMembers = 5
  ): Promise<CreateTeamResponse> => {
    return await preferGateway<CreateTeamResponse>("create", { name, password, maxMembers });
  };

  /**
   * Join an existing team
   * @param teamId The ID of the team to join
   * @param password The team password
   */
  const joinTeam = async (teamId: string, password: string): Promise<JoinTeamResponse> => {
    return await preferGateway<JoinTeamResponse>("join", { teamId, password });
  };

  /**
   * Leave a team
   * @param teamId The ID of the team to leave
   */
  const leaveTeam = async (teamId: string): Promise<LeaveTeamResponse> => {
    return await preferGateway<LeaveTeamResponse>("leave", { teamId });
  };

  /**
   * Kick a member from a team (owner only)
   * @param teamId The ID of the team
   * @param memberId The ID of the member to kick
   */
  const kickTeamMember = async (teamId: string, memberId: string): Promise<KickMemberResponse> => {
    return await preferGateway<KickMemberResponse>("kick", { teamId, memberId });
  };

  /**
   * Revoke an API token
   * @param tokenId The ID of the token to revoke
   */
  const revokeToken = async (tokenId: string) => {
    const { data, error } = await $supabase.client.functions.invoke("token-revoke", {
      body: { tokenId },
      method: "DELETE",
    });

    if (error) {
      console.error("Token revocation failed:", error);
      throw error;
    }

    return data;
  };

  return {
    // Progress management
    updateProgress,

    // Team management
    createTeam,
    joinTeam,
    leaveTeam,
    kickTeamMember,

    // API token management
    revokeToken,
  };
};
