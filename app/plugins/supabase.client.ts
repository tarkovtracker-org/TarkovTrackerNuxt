import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { reactive } from 'vue';
import { logger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/utils/storageKeys';
import { hydrateUserFromSession } from '@/utils/userHydration';

type OAuthProvider = 'twitch' | 'discord' | 'google' | 'github';

type SupabaseUser = {
  id: string | null;
  loggedIn: boolean;
  email: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  photoURL: string | null; // Alias for avatarUrl (backward compatibility)
  lastLoginAt: string | null;
  createdAt: string | null;
  provider: string | null; // 'discord', 'twitch', etc.
  providers: string[] | null; // All linked OAuth providers
};
export default defineNuxtPlugin(() => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  // Build a safe stub so components can still render in environments without Supabase env vars
  const buildStub = () => {
    const stubUser = reactive<SupabaseUser>({
      id: null,
      loggedIn: false,
      email: null,
      displayName: null,
      username: null,
      avatarUrl: null,
      photoURL: null,
      lastLoginAt: null,
      createdAt: null,
      provider: null,
      providers: null,
    });
    // Extremely small surface area stub — only the bits we call in-app
    const noopPromise = async () => ({}) as unknown as Promise<unknown>;
    const stubClient = {
      from: () => ({ upsert: noopPromise }),
      functions: { invoke: noopPromise },
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({ url: undefined }),
        signOut: async () => ({}),
      },
    } as unknown as SupabaseClient;
    return {
      client: stubClient,
      user: stubUser,
      signInWithOAuth: async (
        _provider: OAuthProvider,
        _options?: { skipBrowserRedirect?: boolean; redirectTo?: string }
      ) => {
        throw new Error('Supabase env not configured (VITE_SUPABASE_URL/ANON_KEY)');
      },
      signOut: async () => {},
    };
  };
  if (!supabaseUrl || !supabaseKey) {
    logger.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    // Fail fast in production to avoid silent bad deploys
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase configuration missing');
    }
    const stub = buildStub();
    return { provide: { supabase: stub } };
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const user = reactive<SupabaseUser>({
    id: null,
    loggedIn: false,
    email: null,
    displayName: null,
    username: null,
    avatarUrl: null,
    photoURL: null,
    lastLoginAt: null,
    createdAt: null,
    provider: null,
    providers: null,
  });
  supabase.auth.getSession().then(({ data: { session } }) => {
    hydrateUserFromSession(user, session?.user || null);
    // Clean up OAuth hash after session is established
    if (session && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      logger.debug('[Supabase] Cleaned OAuth hash from URL after session established');
    }
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    hydrateUserFromSession(user, session?.user || null);
    // Clean up OAuth hash on auth state change
    if (session && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      logger.debug('[Supabase] Cleaned OAuth hash from URL on auth state change');
    }
  });
  const signInWithOAuth = async (
    provider: OAuthProvider,
    options?: { skipBrowserRedirect?: boolean; redirectTo?: string }
  ) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: options?.skipBrowserRedirect,
        redirectTo: options?.redirectTo || window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  };
  const signOut = async () => {
    // Clear game progress from localStorage to prevent cross-user contamination
    // This prevents User A's data from being migrated to User B's account
    if (typeof window !== 'undefined') {
      logger.debug('[Supabase] Clearing game progress localStorage on logout');
      localStorage.removeItem(STORAGE_KEYS.progress);
      // Keep UI preferences (user store) but you may want to clear user-specific data
      // localStorage.removeItem("user"); // Uncomment if user data should also be cleared
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  return {
    provide: {
      supabase: {
        client: supabase,
        user,
        signInWithOAuth,
        signOut,
      },
    },
  };
});
