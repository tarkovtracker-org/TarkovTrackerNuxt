import { createI18n, type I18n, type LocaleMessages } from 'vue-i18n';
import { markI18nReady } from '@/composables/i18nHelpers';
import de from '@/locales/de.json5';
import en from '@/locales/en.json5';
import es from '@/locales/es.json5';
import fr from '@/locales/fr.json5';
import ru from '@/locales/ru.json5';
import uk from '@/locales/uk.json5';
import zh from '@/locales/zh.json5';
import { logger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/utils/storageKeys';
const messages = {
  en,
  de,
  es,
  fr,
  ru,
  uk,
  zh,
};
// Explicitly type the combined messages structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppMessages = LocaleMessages<any>;
// Get initial locale from localStorage preference or navigator language
function getInitialLocale(): string {
  // Check for saved locale preference in localStorage
  if (typeof window !== 'undefined' && localStorage) {
    try {
      const savedPrefs = localStorage.getItem(STORAGE_KEYS.preferences);
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.localeOverride) {
          return prefs.localeOverride;
        }
      }
    } catch (error) {
      logger.warn('[i18n] Failed to read locale from localStorage:', error);
    }
  }
  // Fallback to browser language
  const navLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return (navLang || 'en').split(/[-_]/)[0] || 'en';
}
const languageCode = getInitialLocale();
const typedMessages = messages as AppMessages;
export const i18n: I18n<
  AppMessages,
  Record<string, never>,
  Record<string, never>,
  string,
  false
> = createI18n({
  legacy: false,
  globalInjection: true, // Enable global injection for $t
  locale: languageCode,
  fallbackLocale: 'en',
  messages: typedMessages,
  silentTranslationWarn: true,
  silentFallbackWarn: true,
  missingWarn: false,
  fallbackWarn: false,
});
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(i18n);
  markI18nReady();
  return { provide: { i18n } };
});
