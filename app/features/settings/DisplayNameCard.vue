<template>
  <GenericCard
    icon="mdi-account-edit"
    highlight-color="blue"
    :fill-height="false"
    :title="$t('settings.display_name.title', 'Display Name')"
    title-classes="text-lg font-bold sm:text-xl"
  >
    <template #content>
      <div class="space-y-4 px-4 py-4">
        <!-- Explanation Alert -->
        <UAlert icon="i-mdi-information" color="primary" variant="soft" class="text-sm">
          <template #description>
            {{
              $t(
                'settings.display_name.explanation',
                'Your display name is shown to teammates and in the navigation. Each game mode (PVP/PVE) has a separate display name.'
              )
            }}
          </template>
        </UAlert>
        <!-- Current Game Mode Indicator -->
        <div
          class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <span class="text-content-secondary text-sm font-semibold">
              {{ $t('settings.display_name.current_mode', 'Current Game Mode') }}
            </span>
            <span
              class="rounded px-2 py-1 text-xs font-bold uppercase"
              :class="currentMode === 'pvp' ? 'bg-pvp-700 text-pvp-100' : 'bg-pve-700 text-pve-100'"
            >
              {{ currentMode }}
            </span>
          </div>
          <p class="text-content-tertiary text-xs">
            {{ $t('settings.display_name.mode_hint', { mode: currentMode.toUpperCase() }) }}
          </p>
        </div>
        <!-- Display Name Input -->
        <div class="space-y-2">
          <label class="text-content-secondary text-sm font-semibold">
            {{ $t('settings.display_name.label', 'Display Name') }}
            <span class="text-content-tertiary ml-2 text-xs">
              ({{ currentMode.toUpperCase() }})
            </span>
          </label>
          <div class="flex max-w-sm items-center gap-2">
            <UInput
              v-model="localDisplayName"
              :maxlength="displayNameMaxLength"
              :placeholder="$t('settings.display_name.placeholder', 'Enter your display name...')"
              class="flex-1 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              @keyup.enter="saveDisplayName"
            />
            <UButton
              icon="i-mdi-check"
              color="primary"
              variant="soft"
              size="sm"
              :disabled="!hasChanges || isSaving"
              :loading="isSaving"
              @click="saveDisplayName"
            >
              {{ $t('settings.display_name.save', 'Save') }}
            </UButton>
          </div>
          <div class="flex items-center justify-between">
            <p class="text-content-tertiary text-xs">
              {{ localDisplayName?.length || 0 }} / {{ displayNameMaxLength }} characters
            </p>
            <UButton
              v-if="displayName"
              icon="i-mdi-close"
              variant="ghost"
              size="xs"
              color="neutral"
              @click="clearDisplayName"
            >
              {{ $t('settings.display_name.clear', 'Clear') }}
            </UButton>
          </div>
        </div>
        <!-- Preview Section -->
        <div
          class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-3"
        >
          <div class="text-content-secondary mb-2 text-sm font-semibold">
            {{ $t('settings.display_name.preview', 'Preview') }}
          </div>
          <div class="flex items-center gap-3">
            <UAvatar
              :src="
                preferencesStore.getStreamerMode
                  ? '/img/default-avatar.svg'
                  : $supabase.user.photoURL || '/img/default-avatar.svg'
              "
              size="sm"
              alt="Preview avatar"
            />
            <span class="text-content-secondary text-sm">
              {{ previewName }}
            </span>
          </div>
          <p class="text-content-tertiary mt-2 text-xs">
            {{
              $t(
                'settings.display_name.preview_hint',
                'This is how your name appears in the navigation drawer.'
              )
            }}
          </p>
        </div>
      </div>
    </template>
  </GenericCard>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { LIMITS } from '@/utils/constants';
  const tarkovStore = useTarkovStore();
  const preferencesStore = usePreferencesStore();
  const { $supabase } = useNuxtApp();
  const toast = useToast();
  const displayNameMaxLength = LIMITS.DISPLAY_NAME_MAX_LENGTH;
  // Track current game mode
  const currentMode = computed(() => tarkovStore.getCurrentGameMode());
  // Local state for input (allows editing without immediate save)
  const localDisplayName = ref(tarkovStore.getDisplayName() || '');
  const initialDisplayName = ref(tarkovStore.getDisplayName() || '');
  const isSaving = ref(false);
  // Computed: has changes
  const hasChanges = computed(() => {
    const trimmed = localDisplayName.value.trim();
    const initial = initialDisplayName.value || '';
    return trimmed !== initial && trimmed.length > 0;
  });
  // Computed: current display name from store
  const displayName = computed(() => tarkovStore.getDisplayName());
  // Computed: preview name (what will show in drawer)
  const previewName = computed(() => {
    if (preferencesStore.getStreamerMode) {
      return 'User';
    }
    const trimmed = localDisplayName.value.trim();
    if (trimmed) {
      return trimmed;
    }
    return $supabase.user.displayName || 'User';
  });
  // Watch for store changes (e.g., from sync or game mode switch)
  watch(
    () => tarkovStore.getDisplayName(),
    (newName) => {
      localDisplayName.value = newName || '';
      initialDisplayName.value = newName || '';
    }
  );
  // Watch for game mode changes
  watch(currentMode, () => {
    // Reset local state when game mode changes
    localDisplayName.value = tarkovStore.getDisplayName() || '';
    initialDisplayName.value = tarkovStore.getDisplayName() || '';
  });
  // Save display name
  const saveDisplayName = async () => {
    const trimmed = localDisplayName.value.trim();
    if (!trimmed || trimmed.length === 0) {
      toast.add({
        title: 'Validation Error',
        description: 'Display name cannot be empty',
        color: 'error',
      });
      return;
    }
    if (trimmed.length > displayNameMaxLength) {
      toast.add({
        title: 'Validation Error',
        description: `Display name cannot exceed ${displayNameMaxLength} characters`,
        color: 'error',
      });
      return;
    }
    isSaving.value = true;
    try {
      const sanitized = trimmed.substring(0, displayNameMaxLength);
      tarkovStore.setDisplayName(sanitized);
      initialDisplayName.value = sanitized;
      localDisplayName.value = sanitized;
      toast.add({
        title: 'Display Name Saved',
        description: `Your ${currentMode.value.toUpperCase()} display name has been updated`,
        color: 'success',
      });
    } catch (error) {
      console.error('[DisplayNameCard] Error saving display name:', error);
      toast.add({
        title: 'Save Failed',
        description: 'Failed to save display name. Please try again.',
        color: 'error',
      });
    } finally {
      isSaving.value = false;
    }
  };
  // Clear display name
  const clearDisplayName = () => {
    localDisplayName.value = '';
    tarkovStore.setDisplayName(null);
    initialDisplayName.value = '';
    toast.add({
      title: 'Display Name Cleared',
      description: `Your ${currentMode.value.toUpperCase()} display name has been cleared`,
      color: 'success',
    });
  };
</script>
