<template>
  <GenericCard icon="mdi-account-supervisor" icon-color="white" highlight-color="secondary">
    <template #title>
      {{ $t("page.team.card.myteam.title") }}
    </template>
    <template #content>
      <div v-if="!localUserTeam" class="py-4 text-center">
        {{ $t("page.team.card.myteam.no_team") }}
      </div>
      <div v-else class="space-y-4 p-4">
        <!-- Display Name Input -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            {{ $t("page.team.card.myteam.display_name_label") }}
          </label>
          <div class="flex items-center gap-2">
            <UInput
              v-model="displayName"
              :maxlength="15"
              :placeholder="$t('page.team.card.myteam.display_name_placeholder')"
              class="flex-1"
              @blur="saveDisplayName"
              @keyup.enter="saveDisplayName"
            />
            <UButton
              icon="i-mdi-check"
              color="primary"
              variant="ghost"
              size="xs"
              :disabled="!displayNameChanged"
              @click="saveDisplayName"
            >
              {{ $t("page.team.card.myteam.save") }}
            </UButton>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ $t("page.team.card.myteam.display_name_hint") }}
          </p>
        </div>

        <!-- Team Invite URL -->
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">
            {{ $t("page.team.card.myteam.team_invite_url_label") }}
          </label>
          <div class="flex items-center gap-2">
            <UButton
              :icon="linkVisible ? 'i-mdi-eye-off' : 'i-mdi-eye'"
              variant="ghost"
              size="xs"
              @click="linkVisible = !linkVisible"
            >
              {{
                linkVisible
                  ? $t("page.team.card.myteam.hide_link")
                  : $t("page.team.card.myteam.show_link")
              }}
            </UButton>
            <UButton
              v-if="linkVisible"
              icon="i-mdi-content-copy"
              variant="ghost"
              size="xs"
              @click="copyUrl"
            >
              {{ $t("page.team.card.myteam.copy_link") }}
            </UButton>
          </div>
        </div>
        <div v-if="linkVisible" class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
          <div class="font-mono text-sm break-all">
            {{ teamUrl }}
          </div>
        </div>
        <div v-else class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
          <div class="text-sm text-gray-500 italic dark:text-gray-400">
            {{ $t("page.team.card.myteam.link_hidden_message") }}
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div
        class="flex items-center justify-start gap-2 border-t border-gray-200 p-4 dark:border-gray-700"
      >
        <UButton
          v-if="!localUserTeam"
          :disabled="loading.createTeam || !isLoggedIn"
          :loading="loading.createTeam"
          color="primary"
          icon="i-mdi-account-group"
          @click="handleCreateTeam"
        >
          {{ $t("page.team.card.myteam.create_new_team") }}
        </UButton>
        <UButton
          v-else
          :disabled="loading.leaveTeam || !isLoggedIn"
          :loading="loading.leaveTeam"
          color="error"
          variant="outline"
          icon="i-mdi-account-off"
          @click="handleLeaveTeam"
        >
          {{
            isTeamOwner
              ? $t("page.team.card.myteam.disband_team")
              : $t("page.team.card.myteam.leave_team")
          }}
        </UButton>
      </div>
    </template>
  </GenericCard>
</template>
<script setup lang="ts">
  import { ref, computed, watch, nextTick, type WatchStopHandle } from "vue";
  import { useI18n } from "vue-i18n";
  import type { CreateTeamResponse, LeaveTeamResponse } from "@/types/team";
  // Team functions moved to Cloudflare Workers - TODO: Implement replacement
  import { useTeamStoreWithSupabase } from "@/stores/useTeamStore";
  import { useSystemStoreWithSupabase } from "@/stores/useSystemStore";
  import { useTarkovStore } from "@/stores/tarkov";
  import GenericCard from "@/components/ui/GenericCard.vue";
  import { useEdgeFunctions } from "@/composables/api/useEdgeFunctions";
  const { t } = useI18n({ useScope: "global" });
  const { teamStore } = useTeamStoreWithSupabase();
  const { systemStore } = useSystemStoreWithSupabase();
  const tarkovStore = useTarkovStore();
  const { $supabase } = useNuxtApp();
  const toast = useToast();
  const { createTeam, leaveTeam } = useEdgeFunctions();
  const isLoggedIn = computed(() => $supabase.user.loggedIn);
  const linkVisible = ref(false);

  // Display name management
  const displayName = ref(tarkovStore.getDisplayName() || "");
  const initialDisplayName = ref(tarkovStore.getDisplayName() || "");

  const displayNameChanged = computed(() => {
    return displayName.value !== initialDisplayName.value && displayName.value.trim() !== "";
  });

  const saveDisplayName = () => {
    if (displayName.value.trim() === "") return;

    const trimmedName = displayName.value.trim().substring(0, 15);
    tarkovStore.setDisplayName(trimmedName);
    initialDisplayName.value = trimmedName;
    displayName.value = trimmedName;
    showNotification(t("page.team.card.myteam.display_name_saved"));
  };

  // Watch for changes to the store's display name (e.g., from sync)
  watch(
    () => tarkovStore.getDisplayName(),
    (newName) => {
      if (newName && newName !== displayName.value) {
        displayName.value = newName;
        initialDisplayName.value = newName;
      }
    }
  );
  const generateRandomName = (length = 6) =>
    Array.from({ length }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
        Math.floor(Math.random() * 62)
      )
    ).join("");
  const localUserTeam = computed(() => systemStore.$state?.team || null);
  const isTeamOwner = computed(() => {
    const state = teamStore.$state as { owner_id?: string; owner?: string };
    const owner = state.owner_id ?? state.owner;
    return owner === $supabase.user.id && systemStore.$state?.team != null;
  });
  const loading = ref({ createTeam: false, leaveTeam: false });
  const validateAuth = () => {
    if (!$supabase.user.loggedIn || !$supabase.user.id) {
      throw new Error(t("page.team.card.myteam.user_not_authenticated"));
    }
  };
  const buildTeamName = () => {
    const displayName = tarkovStore.getDisplayName();
    const fallbackName =
      $supabase.user.displayName ||
      $supabase.user.username ||
      $supabase.user.email?.split("@")[0] ||
      "Team";
    return `${displayName || fallbackName}-${generateRandomName(4)}`;
  };

  const buildTeamPassword = () => generateRandomName(12);

  interface TeamFunctionPayload {
    name?: string;
    password?: string;
    maxMembers?: number;
    teamId?: string;
  }

  const callTeamFunction = async (
    functionName: string,
    payload: TeamFunctionPayload = {}
  ): Promise<CreateTeamResponse | LeaveTeamResponse> => {
    validateAuth();
    switch (functionName) {
      case "createTeam": {
        const teamName = payload.name || buildTeamName();
        const password = payload.password || buildTeamPassword();
        const maxMembers = payload.maxMembers || 5;
        return await createTeam(teamName, password, maxMembers);
      }
      case "leaveTeam": {
        const teamId = payload.teamId || systemStore.$state.team;
        if (!teamId) {
          throw new Error(t("page.team.card.myteam.no_team"));
        }
        return await leaveTeam(teamId);
      }
      default:
        throw new Error(`Unsupported team function: ${functionName}`);
    }
  };
  const waitForStoreUpdate = (
    storeFn: () => unknown,
    condition: (value: unknown) => boolean,
    timeout = 15000
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      let unwatch: WatchStopHandle | null = null;
      const timeoutId = setTimeout(() => {
        if (unwatch) {
          unwatch();
        }
        clearTimeout(timeoutId);
        reject(new Error("Store update timeout"));
      }, timeout);
      unwatch = watch(
        storeFn,
        (newValue) => {
          if (condition(newValue)) {
            clearTimeout(timeoutId);
            unwatch?.();
            resolve(newValue);
          }
        },
        { immediate: true, deep: true }
      );
    });
  };
  const showNotification = (message: string, color: "primary" | "error" = "primary") => {
    toast.add({ title: message, color: color === "error" ? "error" : "primary" });
  };
  const handleCreateTeam = async () => {
    loading.value.createTeam = true;
    try {
      validateAuth();
      // If backend thinks we're already in a team, sync local state and abort
      if (!systemStore.$state.team) {
        const { data: membership } = await $supabase.client
          .from("team_memberships")
          .select("team_id")
          .eq("user_id", $supabase.user.id)
          .maybeSingle();
        if (membership?.team_id) {
          systemStore.$patch({ team: membership.team_id });
          showNotification(t("page.team.card.myteam.create_team_error_ui_update"), "error");
          loading.value.createTeam = false;
          return;
        }
      }
      const result = (await callTeamFunction("createTeam")) as CreateTeamResponse;
      if (!result?.team) {
        throw new Error(t("page.team.card.myteam.create_team_error_ui_update"));
      }
      await waitForStoreUpdate(
        () => systemStore.$state.team,
        (teamId) => teamId != null
      );
      await waitForStoreUpdate(
        () => teamStore.$state,
        (state) => {
          if (!state || typeof state !== "object") return false;
          const teamState = state as {
            owner?: string;
            owner_id?: string;
            password?: string;
            join_code?: string;
          };
          const hasOwner =
            teamState.owner === $supabase.user.id || teamState.owner_id === $supabase.user.id;
          const hasPassword = Boolean(teamState.password || teamState.join_code);
          return hasOwner && hasPassword;
        }
      );
      await nextTick();
      if (localUserTeam.value) {
        if (isTeamOwner.value) {
          tarkovStore.setDisplayName(generateRandomName());
        }
        showNotification(t("page.team.card.myteam.create_team_success"));
      } else {
        throw new Error(t("page.team.card.myteam.create_team_error_ui_update"));
      }
    } catch (error: unknown) {
      console.error("[MyTeam] Error creating team:", error);
      const message =
        error &&
        typeof error === "object" &&
        "details" in error &&
        error.details &&
        typeof error.details === "object" &&
        "error" in error.details
          ? String(error.details.error)
          : error instanceof Error
            ? error.message
            : t("page.team.card.myteam.create_team_error");
      showNotification(message, "error");
    }
    loading.value.createTeam = false;
  };
  const handleLeaveTeam = async () => {
    loading.value.leaveTeam = true;
    try {
      validateAuth();
      const result = (await callTeamFunction("leaveTeam")) as LeaveTeamResponse;
      // Wait for store to update before checking team state
      await waitForStoreUpdate(
        () => systemStore.$state.team,
        (teamId) => teamId == null
      );
      await nextTick();
      // If the function succeeded, check that the store actually updated
      if (!result.success && systemStore.$state.team) {
        throw new Error(t("page.team.card.myteam.leave_team_error"));
      }
      const displayName = tarkovStore.getDisplayName();
      if (displayName && displayName.startsWith("User ")) {
        // Reset to a generic display name when leaving team
        tarkovStore.setDisplayName("User");
      }
      showNotification(t("page.team.card.myteam.leave_team_success"));
    } catch (error: unknown) {
      console.error("[MyTeam] Error leaving team:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("page.team.card.myteam.leave_team_error_unexpected");
      showNotification(message, "error");
    }
    loading.value.leaveTeam = false;
  };
  const copyUrl = async () => {
    // Guard against SSR - clipboard API is only available on client
    if (typeof window === "undefined" || !navigator || !navigator.clipboard) {
      console.warn("[MyTeam] Clipboard API is not available");
      return;
    }

    if (teamUrl.value) {
      try {
        await navigator.clipboard.writeText(teamUrl.value);
        showNotification("URL copied to clipboard");
      } catch (error) {
        console.error("[MyTeam] Failed to copy URL to clipboard:", error);
        showNotification("Failed to copy URL to clipboard", "error");
      }
    }
  };
  const teamUrl = computed(() => {
    const { team: teamId } = systemStore.$state;
    // Support legacy password and new join_code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (teamStore.$state as any).password || (teamStore.$state as any).join_code;
    if (!teamId || !code) return "";

    // Use Nuxt-safe route composables instead of window.location
    // This works during SSR and client-side
    if (import.meta.client) {
      const baseUrl = window.location.href.split("?")[0];
      const params = new URLSearchParams({ team: teamId, code });
      return `${baseUrl}?${params}`;
    } else {
      // During SSR, construct URL from route path
      const route = useRoute();
      const config = useRuntimeConfig();
      const baseUrl = config.public.siteUrl || "";
      const currentPath = route.path;
      const params = new URLSearchParams({ team: teamId, code });
      return `${baseUrl}${currentPath}?${params}`;
    }
  });
  watch(
    () => tarkovStore.getDisplayName,
    (newDisplayName) => {
      if (isTeamOwner.value && newDisplayName !== teamStore.getOwnerDisplayName) {
        teamStore.setOwnerDisplayName(newDisplayName);
      }
    }
  );
</script>
