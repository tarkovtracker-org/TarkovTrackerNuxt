<template>
  <div class="container mx-auto space-y-4 px-4 py-6">
    <!-- Section 1: Game Settings (merged Privacy Mode + Game Edition) -->
    <GenericCard
      icon="mdi-gamepad-variant"
      icon-color="accent-400"
      highlight-color="accent"
      :fill-height="false"
      :title="$t('settings.game_settings.title', 'Game Settings')"
      title-classes="text-lg font-semibold"
    >
      <template #title-right>
        <UAlert
          v-if="!user.loggedIn"
          icon="i-mdi-lock"
          color="warning"
          variant="soft"
          class="inline-flex items-center p-1 text-sm"
        >
          <template #description>
            <span class="text-sm">
              {{ $t('settings.general.login_required', 'Log in to enable cloud sync.') }}
            </span>
          </template>
        </UAlert>
      </template>
      <template #content>
        <div class="grid gap-6 px-4 py-4 md:grid-cols-2 lg:grid-cols-3">
          <!-- Privacy Mode -->
          <div class="space-y-2">
            <p class="text-surface-200 text-sm font-semibold">
              {{ $t('settings.general.privacy_mode', 'Privacy Mode') }}
            </p>
            <div class="flex items-center gap-3">
              <UCheckbox
                v-model="streamerMode"
                :disabled="!user.loggedIn || streamerModeCooldown"
                label=""
              />
              <span class="text-surface-400 text-xs">
                {{
                  $t(
                    'settings.general.privacy_mode_hint',
                    "Hides sensitive information while you're streaming."
                  )
                }}
              </span>
            </div>
          </div>
          <!-- Game Edition -->
          <div class="space-y-2">
            <p class="text-surface-200 text-sm font-semibold">
              {{ $t('settings.game_profile.game_edition', 'Game Edition') }}
            </p>
            <USelectMenu
              v-model="selectedGameEdition"
              :items="gameEditionOptions"
              value-key="value"
              :popper="{ placement: 'bottom-start', strategy: 'fixed' }"
              :ui="selectUi"
              :ui-menu="selectMenuUi"
            >
              <template #leading>
                <UIcon name="i-mdi-gift-open" class="text-surface-300 h-4 w-4" />
              </template>
            </USelectMenu>
          </div>
          <!-- Prestige Level -->
          <div class="space-y-2">
            <p class="text-surface-200 text-sm font-semibold">
              {{ $t('settings.prestige.current_level', 'Current Prestige Level') }}
            </p>
            <USelectMenu
              v-model="currentPrestige"
              :items="prestigeOptions"
              value-key="value"
              :popper="{ placement: 'bottom-start', strategy: 'fixed' }"
              :ui="selectUi"
              :ui-menu="selectMenuUi"
            >
              <template #leading>
                <UIcon name="i-mdi-trophy" class="text-gold-400 h-4 w-4" />
              </template>
            </USelectMenu>
            <p class="text-surface-400 text-xs">
              {{
                $t(
                  'settings.prestige.hint',
                  'Select your current prestige level. This is display-only and does not affect game progression.'
                )
              }}
            </p>
          </div>
        </div>
      </template>
    </GenericCard>
    <!-- Section 1.5: Display Name & Experience (side by side) -->
    <div class="grid gap-4 md:grid-cols-2">
      <DisplayNameCard />
      <ExperienceCard />
    </div>
    <!-- Section 3: Skills (Full Width) -->
    <SkillsCard />
    <!-- Section 3: Data Management -->
    <GenericCard
      icon="mdi-database"
      icon-color="warning"
      highlight-color="tan"
      :fill-height="false"
      :title="$t('settings.data_management.title', 'Data Management')"
      title-classes="text-lg font-semibold"
    >
      <template #title-right>
        <UAlert
          v-if="!user.loggedIn"
          icon="i-mdi-information"
          color="info"
          variant="soft"
          class="inline-flex items-center p-1 text-sm"
        >
          <template #description>
            <span class="text-sm">
              {{
                $t(
                  'settings.data_management.login_hint',
                  'Log in to enable cloud sync and manage your progress across devices.'
                )
              }}
            </span>
          </template>
        </UAlert>
      </template>
      <template #content>
        <div class="space-y-3 px-4 py-4">
          <div class="grid gap-3 md:grid-cols-3">
            <!-- Reset PvP Button -->
            <UButton
              icon="i-mdi-shield-sword"
              block
              :ui="{
                base: 'bg-pvp-900 hover:bg-pvp-800 active:bg-pvp-700 text-pvp-200 focus-visible:ring focus-visible:ring-pvp-500',
              }"
              @click="showResetPvPDialog = true"
            >
              {{ $t('settings.data_management.reset_pvp_data', 'Reset PvP Data') }}
            </UButton>
            <!-- Reset PvE Button -->
            <UButton
              icon="i-mdi-account-group"
              block
              :ui="{
                base: 'bg-pve-900 hover:bg-pve-800 active:bg-pve-700 text-pve-200 focus-visible:ring focus-visible:ring-pve-500',
              }"
              @click="showResetPvEDialog = true"
            >
              {{ $t('settings.data_management.reset_pve_data', 'Reset PvE Data') }}
            </UButton>
            <!-- Reset All Button -->
            <UButton
              color="error"
              variant="soft"
              icon="i-mdi-delete-sweep"
              block
              @click="showResetAllDialog = true"
            >
              {{ $t('settings.data_management.reset_all_data', 'Reset All Data') }}
            </UButton>
          </div>
          <p class="text-surface-400 text-center text-xs">
            {{
              $t(
                'settings.data_management.reset_hint',
                'Reset your progress for specific game modes or all data.'
              )
            }}
          </p>
        </div>
      </template>
    </GenericCard>
    <!-- Reset PvP Modal -->
    <UModal v-model:open="showResetPvPDialog">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-mdi-alert" class="text-pvp-400 h-5 w-5" />
          <h3 class="text-lg font-semibold">
            {{ $t('settings.data_management.reset_pvp_title', 'Reset PvP Data') }}
          </h3>
        </div>
      </template>
      <template #body>
        <div class="space-y-3">
          <UAlert
            icon="i-mdi-alert"
            color="pvp"
            variant="subtle"
            :title="
              $t(
                'settings.data_management.reset_pvp_confirmation',
                'Are you sure you want to reset your PvP progress?'
              )
            "
          />
          <p class="text-surface-200 text-sm">
            {{
              $t(
                'settings.data_management.reset_pvp_warning',
                'This will permanently delete all your PvP progress including tasks, hideout, and level. Your PvE data will not be affected.'
              )
            }}
          </p>
        </div>
      </template>
      <template #footer="{ close }">
        <div class="flex w-full items-center gap-3">
          <UButton
            color="neutral"
            variant="soft"
            class="min-w-26 justify-center text-center"
            @click="close"
          >
            {{ $t('settings.data_management.reset_cancel', 'Cancel') }}
          </UButton>
          <UButton
            color="error"
            variant="solid"
            class="ml-auto min-w-30 justify-center text-center"
            :loading="resetting"
            @click="resetPvPData"
          >
            {{ $t('settings.data_management.reset_confirm', 'Reset PvP Data') }}
          </UButton>
        </div>
      </template>
    </UModal>
    <!-- Reset PvE Modal -->
    <UModal v-model:open="showResetPvEDialog">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-mdi-alert" class="text-pve-400 h-5 w-5" />
          <h3 class="text-lg font-semibold">
            {{ $t('settings.data_management.reset_pve_title', 'Reset PvE Data') }}
          </h3>
        </div>
      </template>
      <template #body>
        <div class="space-y-3">
          <UAlert
            icon="i-mdi-alert"
            color="pve"
            variant="subtle"
            :title="
              $t(
                'settings.data_management.reset_pve_confirmation',
                'Are you sure you want to reset your PvE progress?'
              )
            "
          />
          <p class="text-surface-200 text-sm">
            {{
              $t(
                'settings.data_management.reset_pve_warning',
                'This will permanently delete all your PvE progress including tasks, hideout, and level. Your PvP data will not be affected.'
              )
            }}
          </p>
        </div>
      </template>
      <template #footer="{ close }">
        <div class="flex w-full items-center gap-3">
          <UButton
            color="neutral"
            variant="soft"
            class="min-w-26 justify-center text-center"
            @click="close"
          >
            {{ $t('settings.data_management.reset_cancel', 'Cancel') }}
          </UButton>
          <UButton
            color="error"
            variant="solid"
            class="ml-auto min-w-30 justify-center text-center"
            :loading="resetting"
            @click="resetPvEData"
          >
            {{ $t('settings.data_management.reset_confirm', 'Reset PvE Data') }}
          </UButton>
        </div>
      </template>
    </UModal>
    <!-- Reset All Modal -->
    <UModal v-model:open="showResetAllDialog">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-mdi-alert-octagon" class="text-error-400 h-5 w-5" />
          <h3 class="text-lg font-semibold">
            {{ $t('settings.data_management.reset_all_title', 'Reset All Data') }}
          </h3>
        </div>
      </template>
      <template #body>
        <div class="space-y-3">
          <UAlert
            icon="i-mdi-alert-octagon"
            color="error"
            variant="subtle"
            :title="
              $t(
                'settings.data_management.reset_all_confirmation',
                'Are you sure you want to reset ALL your progress?'
              )
            "
          />
          <p class="text-surface-200 text-sm">
            {{
              $t(
                'settings.data_management.reset_all_warning',
                'This will permanently delete ALL your progress for both PvP and PvE modes. This action cannot be undone!'
              )
            }}
          </p>
        </div>
      </template>
      <template #footer="{ close }">
        <div class="flex w-full items-center gap-3">
          <UButton
            color="neutral"
            variant="soft"
            class="min-w-26 justify-center text-center"
            @click="close"
          >
            {{ $t('settings.data_management.reset_cancel', 'Cancel') }}
          </UButton>
          <UButton
            color="error"
            variant="solid"
            class="ml-auto min-w-30 justify-center text-center"
            :loading="resetting"
            @click="resetAllData"
          >
            {{ $t('settings.data_management.reset_confirm', 'Reset All Data') }}
          </UButton>
        </div>
      </template>
    </UModal>
    <!-- Section 4: API Management -->
    <GenericCard
      icon="mdi-key-chain"
      icon-color="purple-400"
      highlight-color="purple"
      :fill-height="false"
      :title="$t('page.settings.card.apitokens.title', 'API Tokens')"
      title-classes="text-lg font-semibold"
    >
      <template #title-right>
        <UAlert
          v-if="!user.loggedIn"
          icon="i-mdi-lock"
          color="warning"
          variant="soft"
          class="inline-flex items-center p-1 text-sm"
        >
          <template #description>
            <span class="text-sm">
              {{
                $t(
                  'page.settings.card.apitokens.not_logged_in',
                  'You must be logged in to create and manage API tokens.'
                )
              }}
            </span>
          </template>
        </UAlert>
      </template>
      <template #content>
        <div class="relative px-4 py-4">
          <ApiTokens v-if="user.loggedIn" />
          <UAlert
            v-else
            color="warning"
            variant="soft"
            icon="i-mdi-lock"
            :title="$t('page.settings.card.apitokens.not_logged_in')"
          />
        </div>
      </template>
    </GenericCard>
    <!-- Section 5: Data Migration (temporarily disabled until migration flow is refactored) -->
    <!-- <DataMigrationCard v-if="user.loggedIn" /> -->
    <!-- Section 6: Account Management -->
    <AccountDeletionCard />
    <!-- Admin Panel Link (only visible to admins) -->
    <div v-if="isAdmin" class="flex justify-center pt-4">
      <NuxtLink
        to="/admin"
        class="hover:text-error-400 flex items-center gap-1.5 text-xs text-neutral-500 transition-colors"
      >
        <UIcon name="i-mdi-shield-crown" class="size-3.5" />
        Admin Panel
      </NuxtLink>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import AccountDeletionCard from '@/features/settings/AccountDeletionCard.vue';
  import ApiTokens from '@/features/settings/ApiTokens.vue';
  import DisplayNameCard from '@/features/settings/DisplayNameCard.vue';
  import ExperienceCard from '@/features/settings/ExperienceCard.vue';
  import SkillsCard from '@/features/settings/SkillsCard.vue';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useSystemStore, useSystemStoreWithSupabase } from '@/stores/useSystemStore';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { logger } from '@/utils/logger';
  // Page metadata
  useSeoMeta({
    title: 'Settings | TarkovTracker',
    description:
      'Customize your TarkovTracker experience. Manage preferences, game mode, and account settings.',
  });
  // Composables
  const { $supabase } = useNuxtApp();
  const toast = useToast();
  const metadataStore = useMetadataStore();
  const preferencesStore = usePreferencesStore();
  // Get hasInitiallyLoaded from the Supabase-aware wrapper; use the direct Pinia system store.
  const { hasInitiallyLoaded } = useSystemStoreWithSupabase();
  const systemStore = useSystemStore(); // Direct Pinia store
  const tarkovStore = useTarkovStore();
  const selectUi = {};
  const selectMenuUi = {
    container: 'z-[9999]',
    background: 'bg-surface-900',
    shadow: 'shadow-xl',
    rounded: 'rounded-lg',
    ring: 'ring-1 ring-white/10',
    padding: 'p-1',
    option: {
      base: 'px-3 py-2 text-sm cursor-pointer transition-colors rounded',
      inactive: 'text-surface-200 hover:bg-surface-800 hover:text-white',
      active: 'bg-surface-800 text-white',
      selected: 'bg-primary-500/10 text-primary-100 ring-1 ring-primary-500',
    },
  };
  // Reactive state
  const resetting = ref(false);
  const showResetPvPDialog = ref(false);
  const showResetPvEDialog = ref(false);
  const showResetAllDialog = ref(false);
  const streamerModeCooldown = ref(false);
  // Computed properties
  const user = computed(() => ({
    loggedIn: Boolean($supabase?.user?.loggedIn),
  }));
  // Admin status check using the isAdmin getter
  const isAdmin = computed(() => {
    // Only show admin button if data has loaded and user is admin
    if (!hasInitiallyLoaded.value) return false;
    return systemStore.isAdmin;
  });
  // Streamer mode with cooldown to prevent spam
  const streamerMode = computed({
    get() {
      return preferencesStore.getStreamerMode;
    },
    set(newValue) {
      if (streamerModeCooldown.value) return;
      preferencesStore.setStreamerMode(newValue);
      streamerModeCooldown.value = true;
      setTimeout(() => {
        streamerModeCooldown.value = false;
      }, 500);
    },
  });
  // Game edition
  const gameEditionOptions = computed(() =>
    metadataStore.editions.map((edition) => ({
      label: edition.title,
      value: edition.value,
    }))
  );
  const selectedGameEdition = computed({
    get(): number {
      return tarkovStore.getGameEdition() || 1;
    },
    set(newValue: number) {
      tarkovStore.setGameEdition(newValue || 1);
    },
  });
  // Prestige level
  const prestigeOptions = computed(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      label: i === 0 ? 'No Prestige' : `Prestige ${i}`,
      value: i,
    }));
  });
  const currentPrestige = computed({
    get(): number {
      return tarkovStore.getPrestigeLevel();
    },
    set(newValue: number) {
      tarkovStore.setPrestigeLevel(newValue);
    },
  });
  // Methods
  const resetPvPData = async () => {
    resetting.value = true;
    try {
      await tarkovStore.resetPvPData();
      toast.add({
        title: 'PvP Data Reset',
        description: 'Your PvP progress has been reset successfully.',
        color: 'success',
      });
      showResetPvPDialog.value = false;
    } catch (error) {
      logger.error('[Settings] Error resetting PvP data:', error);
      toast.add({
        title: 'Reset Failed',
        description: 'Failed to reset PvP data. Please try again.',
        color: 'error',
      });
    } finally {
      resetting.value = false;
    }
  };
  const resetPvEData = async () => {
    resetting.value = true;
    try {
      await tarkovStore.resetPvEData();
      toast.add({
        title: 'PvE Data Reset',
        description: 'Your PvE progress has been reset successfully.',
        color: 'success',
      });
      showResetPvEDialog.value = false;
    } catch (error) {
      logger.error('[Settings] Error resetting PvE data:', error);
      toast.add({
        title: 'Reset Failed',
        description: 'Failed to reset PvE data. Please try again.',
        color: 'error',
      });
    } finally {
      resetting.value = false;
    }
  };
  const resetAllData = async () => {
    resetting.value = true;
    try {
      await tarkovStore.resetAllData();
      toast.add({
        title: 'All Data Reset',
        description: 'All your progress has been reset successfully.',
        color: 'success',
      });
      showResetAllDialog.value = false;
    } catch (error) {
      logger.error('[Settings] Error resetting all data:', error);
      toast.add({
        title: 'Reset Failed',
        description: 'Failed to reset data. Please try again.',
        color: 'error',
      });
    } finally {
      resetting.value = false;
    }
  };
</script>
