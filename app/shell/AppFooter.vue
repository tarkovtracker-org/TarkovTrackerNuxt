<template>
  <footer
    class="relative w-full border-t border-base bg-surface-elevated px-6 py-5 dark:border-white/10 dark:bg-transparent dark:bg-linear-to-t dark:from-black/60 dark:via-black/30 dark:to-black/20"
  >
    <div class="mx-auto w-full max-w-6xl">
      <!-- Top Row: Community & Support -->
      <div class="grid grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
        <!-- Community Links -->
        <div class="flex flex-col gap-2 text-center lg:items-start lg:text-left">
          <div class="text-[0.6875rem] font-semibold tracking-[0.08em] text-content-tertiary uppercase dark:text-white/55">
            {{ t('footer.community_label') }}
          </div>
          <div class="flex flex-col items-center gap-2.5 lg:items-start">
            <AppTooltip
              :text="
                t('footer.call_to_action.discord_phrase', {
                  discord: t('footer.call_to_action.discord'),
                })
              "
            >
              <a
                href="https://discord.gg/M8nBgA2sT6"
                target="_blank"
                rel="noopener noreferrer"
                class="group flex items-center gap-2.5 transition-all duration-150 hover:-translate-y-0.5"
              >
                <span
                  class="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-entity-discord),transparent_85%)] text-[var(--color-entity-discord)] transition-all duration-150 group-hover:bg-[color-mix(in_srgb,var(--color-entity-discord),black_10%)] group-hover:text-white group-hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--color-entity-discord),transparent_60%)]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"
                    />
                  </svg>
                </span>
                <span
                  class="text-primary-400 decoration-primary-400/40 group-hover:text-primary-300 group-hover:decoration-primary-300 text-sm font-semibold underline underline-offset-2 transition-colors duration-150"
                >
                  {{ t('footer.call_to_action.discord') }}
                </span>
              </a>
            </AppTooltip>
            <AppTooltip
              :text="
                t('footer.call_to_action.github_phrase', {
                  github: t('footer.call_to_action.github'),
                })
              "
            >
              <a
                href="https://github.com/tarkovtracker-org/TarkovTrackerNuxt"
                target="_blank"
                rel="noopener noreferrer"
                class="group flex items-center gap-2.5 transition-all duration-150 hover:-translate-y-0.5"
              >
                <span
                  class="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-200 text-content-primary transition-all duration-150 group-hover:bg-surface-300 group-hover:dark:bg-white/20 group-hover:text-black group-hover:dark:text-white dark:bg-white/10 dark:text-gray-200 group-hover:shadow-[0_4px_12px_rgba(255,255,255,0.2)]"
                >
                  <UIcon name="i-mdi-github" class="h-5 w-5" />
                </span>
                <span
                  class="text-primary-400 decoration-primary-400/40 group-hover:text-primary-300 group-hover:decoration-primary-300 text-sm font-semibold underline underline-offset-2 transition-colors duration-150"
                >
                  {{ t('footer.call_to_action.github') }}
                </span>
              </a>
            </AppTooltip>
          </div>
        </div>
        <!-- Support Button (Center Focus) -->
        <div class="flex flex-col items-center gap-2 text-center">
          <a
            href="https://ko-fi.com/dysektai"
            target="_blank"
            rel="noopener noreferrer"
            class="border-success-500 bg-success-600 hover:border-success-400 hover:bg-success-500 inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/40 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="text-error-500 h-4 w-4"
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
            <span>{{ t('footer.support_button') }}</span>
          </a>
          <p class="mt-1 text-xs text-content-tertiary italic dark:text-white/65 text-white/65">
            {{ t('footer.support_tagline') }}
          </p>
        </div>
        <!-- Legal Links -->
        <div class="flex flex-col gap-2 text-center lg:items-end lg:text-right">
          <div class="text-[0.6875rem] font-semibold tracking-[0.08em] text-content-tertiary uppercase dark:text-white/55">
            {{ t('footer.legal_label') }}
          </div>
          <div class="flex flex-col items-center gap-2 lg:items-end">
            <router-link
              to="/terms-of-service"
              class="text-primary-400 decoration-primary-400/40 hover:text-primary-300 hover:decoration-primary-300 text-sm font-semibold underline underline-offset-2 transition-colors duration-150"
            >
              {{ t('footer.terms_of_service') }}
            </router-link>
            <router-link
              to="/privacy"
              class="text-primary-400 decoration-primary-400/40 hover:text-primary-300 hover:decoration-primary-300 text-sm font-semibold underline underline-offset-2 transition-colors duration-150"
            >
              {{ t('footer.privacy_policy') }}
            </router-link>
          </div>
        </div>
      </div>
      <!-- Divider -->
      <div class="my-4 h-px bg-divider dark:bg-transparent dark:bg-linear-to-r dark:from-transparent dark:via-white/10 dark:to-transparent" />
      <!-- Bottom Row: Copyright & Attribution -->
      <div class="flex flex-col items-center gap-1.5 text-center">
        <div class="flex items-center justify-center gap-2 text-sm font-semibold text-content-secondary">
          <span>TarkovTracker &copy; 2020–{{ new Date().getFullYear() }}</span>
          <span class="text-sm text-content-tertiary dark:text-white/40">·</span>
          <router-link
            to="/credits"
            class="text-primary-400 decoration-primary-400/40 hover:text-primary-300 hover:decoration-primary-300 underline underline-offset-2 transition-colors duration-150"
          >
            {{ t('footer.credits') }}
          </router-link>
        </div>
        <p class="m-0 text-xs leading-snug text-content-tertiary dark:text-white/45">
          {{ t('footer.game_attribution') }}
        </p>
      </div>
    </div>
  </footer>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  const { t } = useI18n({ useScope: 'global' });
</script>
