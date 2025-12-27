<template>
  <div class="account-deletion-card" :class="$attrs.class">
    <GenericCard
      icon="mdi-account-cog"
      icon-color="error-400"
      highlight-color="red"
      :title="$t('settings.account.title', 'Account Management')"
      title-classes="text-lg font-semibold"
    >
      <template #title-right>
        <UAlert
          v-if="!isLoggedIn"
          icon="i-mdi-lock"
          color="warning"
          variant="soft"
          class="inline-flex items-center p-1 text-sm"
        >
          <template #description>
            <span class="text-sm">
              {{ $t('settings.account.login_required', 'Log in to manage your account.') }}
            </span>
          </template>
        </UAlert>
      </template>
      <template #content>
        <div class="p-4">
          <!-- Logged out state -->
          <template v-if="!isLoggedIn">
            <div class="mb-6 rounded-lg border border-gray-700 bg-gray-800/30 p-4 opacity-60">
              <div class="mb-3 text-base font-bold text-gray-500">Account Information</div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div class="mb-2 flex items-center">
                    <UIcon name="i-mdi-account" class="mr-2 h-4.5 w-4.5 text-gray-500" />
                    <span class="text-sm text-gray-500">Username: —</span>
                  </div>
                  <div class="mb-2 flex items-center">
                    <UIcon name="i-mdi-email" class="mr-2 h-4.5 w-4.5 text-gray-500" />
                    <span class="text-sm text-gray-500">Email: —</span>
                  </div>
                </div>
                <div>
                  <div class="mb-2 flex items-center">
                    <UIcon name="i-mdi-login" class="mr-2 h-4.5 w-4.5 text-gray-500" />
                    <span class="text-sm text-gray-500">Auth Method: —</span>
                  </div>
                  <div class="flex items-center">
                    <UIcon name="i-mdi-calendar" class="mr-2 h-4.5 w-4.5 text-gray-500" />
                    <span class="text-sm text-gray-500">Member since: —</span>
                  </div>
                </div>
              </div>
              <div class="my-3 border-t border-gray-700"></div>
              <div class="flex items-center">
                <UIcon name="i-mdi-identifier" class="mr-2 h-4.5 w-4.5 text-gray-500" />
                <span class="text-sm text-gray-500">Account ID: —</span>
              </div>
            </div>
            <!-- Deletion Warning (disabled state) -->
            <UAlert
              icon="i-mdi-alert-circle"
              color="neutral"
              variant="soft"
              class="mb-4 opacity-60"
              title="Permanent Account Deletion"
            >
              <template #description>
                <div class="mb-2 text-sm">
                  This action cannot be undone. All your data will be permanently deleted.
                </div>
                <ul class="mb-3 ml-4 list-disc text-sm">
                  <li>Your progress tracking data</li>
                  <li>Team memberships and owned teams</li>
                  <li>API tokens and settings</li>
                  <li>All personal information</li>
                </ul>
                <div class="text-sm font-bold">
                  This does
                  <span class="underline">not</span>
                  affect your Escape from Tarkov account, only Tarkov Tracker data.
                </div>
              </template>
            </UAlert>
            <div class="mt-6 flex justify-center">
              <UButton
                color="error"
                variant="soft"
                size="lg"
                icon="i-mdi-delete-forever"
                disabled
                class="cursor-not-allowed px-6 py-3 font-semibold opacity-50"
              >
                {{ $t('settings.account.begin_deletion', 'Begin Account Deletion') }}
              </UButton>
            </div>
          </template>
          <!-- Logged in state -->
          <template v-else>
            <!-- Account Information (Moved to Top) -->
            <div class="mb-6 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div class="mb-3 text-base font-bold">Account Information</div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div class="mb-2 flex items-center">
                    <UIcon name="i-mdi-account" class="mr-2 h-4.5 w-4.5 text-gray-400" />
                    <span class="text-sm">
                      <span class="text-gray-400">Username:</span>
                      <span class="ml-1 font-medium">{{ $supabase.user.username || 'N/A' }}</span>
                    </span>
                  </div>
                  <div class="mb-2 flex items-center">
                    <UIcon name="i-mdi-email" class="mr-2 h-4.5 w-4.5 text-gray-400" />
                    <span class="text-sm">
                      <span class="text-gray-400">Email:</span>
                      <span class="ml-1 font-medium">{{ $supabase.user.email || 'N/A' }}</span>
                    </span>
                  </div>
                </div>
                <div>
                  <div class="mb-2 flex items-center">
                    <UIcon name="i-mdi-login" class="mr-2 h-4.5 w-4.5 text-gray-400" />
                    <span class="flex items-center text-sm">
                      <span class="mr-2 text-gray-400">Auth Method:</span>
                      <UBadge size="xs" :color="providerColor" variant="solid" class="text-white">
                        <UIcon :name="providerIcon" class="mr-1 h-4 w-4" />
                        {{ providerLabel }}
                      </UBadge>
                    </span>
                  </div>
                  <div class="flex items-center">
                    <UIcon name="i-mdi-calendar" class="mr-2 h-4.5 w-4.5 text-gray-400" />
                    <span class="text-sm">
                      <span class="text-gray-400">Member since:</span>
                      <span class="ml-1 font-medium">
                        {{ formatDate($supabase.user.createdAt) }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div class="my-3 border-t border-gray-700"></div>
              <div class="flex items-center">
                <UIcon name="i-mdi-identifier" class="mr-2 h-4.5 w-4.5 text-gray-400" />
                <span class="mr-2 text-sm text-gray-400">Account ID:</span>
                <code class="rounded bg-gray-700 px-2 py-1 text-xs">{{ $supabase.user.id }}</code>
                <AppTooltip :text="accountIdCopied ? 'Copied!' : 'Copy Account ID'">
                  <UButton
                    size="xs"
                    variant="ghost"
                    :icon="accountIdCopied ? 'i-mdi-check' : 'i-mdi-content-copy'"
                    :color="accountIdCopied ? 'success' : 'primary'"
                    class="ml-1"
                    @click="copyAccountId"
                  />
                </AppTooltip>
              </div>
            </div>
            <!-- Deletion Warning -->
            <UAlert
              icon="i-mdi-alert-circle"
              color="error"
              variant="soft"
              class="mb-4"
              title="Permanent Account Deletion"
            >
              <template #description>
                <div class="mb-2 text-sm">
                  This action cannot be undone. All your data will be permanently deleted.
                </div>
                <ul class="mb-3 ml-4 list-disc text-sm">
                  <li>Your progress tracking data</li>
                  <li>Team memberships and owned teams</li>
                  <li>API tokens and settings</li>
                  <li>All personal information</li>
                </ul>
                <div class="text-sm font-bold">
                  This does
                  <span class="underline">not</span>
                  affect your Escape from Tarkov account, only Tarkov Tracker data.
                </div>
              </template>
            </UAlert>
            <UAlert
              v-if="hasOwnedTeams"
              icon="i-mdi-account-group"
              color="warning"
              variant="soft"
              class="mb-4"
              title="Team Ownership Transfer"
            >
              <template #description>
                <div class="text-sm">
                  You own {{ ownedTeamsCount }} team(s). Team ownership will be automatically
                  transferred to the oldest member in each team. Teams without other members will be
                  deleted.
                </div>
              </template>
            </UAlert>
            <div class="mt-6 flex justify-center">
              <UButton
                color="error"
                variant="solid"
                size="lg"
                icon="i-mdi-delete-forever"
                :loading="isDeleting"
                :disabled="isDeleting"
                class="px-6 py-3 font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                @click="showConfirmationDialog = true"
              >
                {{ $t('settings.account.begin_deletion', 'Begin Account Deletion') }}
              </UButton>
            </div>
          </template>
        </div>
      </template>
    </GenericCard>
  </div>
  <UModal v-model:open="showConfirmationDialog" prevent-close>
    <template #header>
      <div class="flex items-center text-xl font-medium text-red-500">
        <UIcon name="i-mdi-alert-circle" class="mr-2 h-6 w-6 text-red-500" />
        Confirm Account Deletion
      </div>
    </template>
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="error"
          variant="solid"
          title="This action is irreversible!"
          description="All your data will be permanently deleted and cannot be recovered."
        />
        <div>
          <div class="mb-2 text-base font-medium">Security Confirmation</div>
          <div class="mb-3 text-sm text-gray-400">
            Account deletion requires typing the exact confirmation phrase below. This action is
            permanent and cannot be undone.
          </div>
        </div>
        <div>
          <div class="mb-2 text-base font-medium">Type "DELETE MY ACCOUNT" to confirm:</div>
          <UInput
            v-model="confirmationText"
            placeholder="DELETE MY ACCOUNT"
            :color="confirmationError ? 'error' : 'neutral'"
            @input="confirmationError = false"
          />
          <div v-if="confirmationError" class="mt-1 text-xs text-red-500">
            Please type exactly: DELETE MY ACCOUNT
          </div>
        </div>
        <UAlert v-if="deleteError" color="error" variant="soft" :title="deleteError" />
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end">
        <UButton variant="ghost" color="neutral" :disabled="isDeleting" @click="close">
          Cancel
        </UButton>
        <UButton
          color="error"
          variant="solid"
          :loading="isDeleting"
          :disabled="!canDelete || isDeleting"
          class="ml-3"
          @click="deleteAccount"
        >
          Delete Account Forever
        </UButton>
      </div>
    </template>
  </UModal>
  <UModal v-model:open="showSuccessDialog" prevent-close>
    <template #header>
      <div class="flex items-center text-xl font-medium text-green-500">
        <UIcon name="i-mdi-check-circle" class="mr-2 h-6 w-6 text-green-500" />
        Account Deleted Successfully
      </div>
    </template>
    <template #body>
      <div class="space-y-3">
        <div class="text-base">
          Your account and all associated data have been permanently deleted.
        </div>
        <div class="text-sm text-gray-400">
          Thank you for using TarkovTracker. You will be redirected to the dashboard.
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <UButton color="primary" variant="solid" @click="redirectToHome">Go to Dashboard</UButton>
      </div>
    </template>
  </UModal>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import { useTeamStoreWithSupabase } from '@/stores/useTeamStore';
  import { logger } from '@/utils/logger';
  defineOptions({
    inheritAttrs: false,
  });
  const { $supabase } = useNuxtApp();
  const router = useRouter();
  const { teamStore } = useTeamStoreWithSupabase();
  const showConfirmationDialog = ref(false);
  const showSuccessDialog = ref(false);
  const confirmationText = ref('');
  const confirmationError = ref(false);
  const deleteError = ref('');
  const isDeleting = ref(false);
  const accountIdCopied = ref(false);
  const isLoggedIn = computed(() => {
    return Boolean($supabase?.user?.loggedIn);
  });
  // Safely extract provider information with proper typing
  type AuthProvider = 'discord' | 'twitch' | null;
  interface SupabaseUserWithProvider {
    app_metadata?: { provider?: string };
    provider?: string;
  }
  const provider = computed<AuthProvider>(() => {
    if (!$supabase?.user) return null;
    const user = $supabase.user as SupabaseUserWithProvider;
    const providerValue = user.app_metadata?.provider || user.provider;
    if (providerValue === 'discord' || providerValue === 'twitch') {
      return providerValue;
    }
    return null;
  });
  const providerLabel = computed(() => {
    if (!provider.value) return 'Unknown';
    return provider.value.charAt(0).toUpperCase() + provider.value.slice(1);
  });
  const providerIcon = computed(() => {
    if (provider.value === 'discord') return 'i-mdi-discord';
    if (provider.value === 'twitch') return 'i-mdi-twitch';
    return 'i-mdi-account';
  });
  const providerColor = computed(() => {
    if (provider.value === 'discord') return 'primary';
    return 'secondary';
  });
  const hasOwnedTeams = computed(() => {
    if (!isLoggedIn.value) return false;
    return teamStore.$state.team && teamStore.$state.team.owner === $supabase.user.id;
  });
  const ownedTeamsCount = computed(() => {
    return hasOwnedTeams.value ? 1 : 0;
  });
  const canDelete = computed(() => {
    return confirmationText.value === 'DELETE MY ACCOUNT';
  });
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };
  const copyAccountId = async () => {
    try {
      await navigator.clipboard.writeText($supabase.user.id || '');
      accountIdCopied.value = true;
      setTimeout(() => {
        accountIdCopied.value = false;
      }, 2000);
    } catch (error) {
      logger.error('Failed to copy account ID:', error);
    }
  };
  const deleteAccount = async () => {
    if (!canDelete.value) {
      confirmationError.value = true;
      return;
    }
    isDeleting.value = true;
    deleteError.value = '';
    try {
      const { data: sessionData } = await $supabase.client.auth.getSession();
      if (!sessionData.session) {
        throw new Error('You must be logged in to delete your account.');
      }
      const { data, error } = await $supabase.client.functions.invoke('account-delete');
      if (error) {
        throw error;
      }
      if (data?.success) {
        showConfirmationDialog.value = false;
        showSuccessDialog.value = true;
      } else {
        throw new Error('Failed to delete account.');
      }
    } catch (error) {
      logger.error('Account deletion error:', error);
      deleteError.value = (error as Error).message || 'Failed to delete account. Please try again.';
    } finally {
      isDeleting.value = false;
    }
  };
  const redirectToHome = async () => {
    try {
      showSuccessDialog.value = false;
      logger.info('Signing out user and redirecting to dashboard...');
      localStorage.clear();
      await $supabase.signOut();
      await router.push('/');
      logger.info('Successfully signed out and redirected to dashboard');
    } catch (error) {
      logger.error('Failed to sign out and redirect:', error);
      window.location.href = '/';
    }
  };
</script>
