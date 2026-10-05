import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import {
  MoodEntry,
  JournalEntry,
  Medication,
  MedicationLog,
  UserProfile,
  UserPreferences,
  ThemeMode,
} from '../types';

// Read configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

// Fallback dummy URL so module loads without throwing if env is missing
const effectiveUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const effectiveKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const KALISE_SCHEMA_SQL = `-- ============================================================================
-- KALISE V1 : COMPLETE EXECUTABLE DATABASE MIGRATION
-- Target: Existing Zencora Supabase Project
-- Architecture: Multi-App Row-Level Security with app_id = 'kalise'
-- Safety: Idempotent (IF NOT EXISTS), zero impact on existing non-Kalise tables
-- ============================================================================

-- Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Table: public.kalise_profiles
-- Purpose: User identity and display preferences within Kalise
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kalise_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'kalise' CHECK (app_id = 'kalise'),
  preferred_name TEXT NOT NULL DEFAULT 'Friend',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.kalise_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kalise_profiles_user_app ON public.kalise_profiles(id, app_id);

DROP POLICY IF EXISTS "Users can view their own kalise profile" ON public.kalise_profiles;
CREATE POLICY "Users can view their own kalise profile"
  ON public.kalise_profiles FOR SELECT
  USING (auth.uid() = id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can insert their own kalise profile" ON public.kalise_profiles;
CREATE POLICY "Users can insert their own kalise profile"
  ON public.kalise_profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can update their own kalise profile" ON public.kalise_profiles;
CREATE POLICY "Users can update their own kalise profile"
  ON public.kalise_profiles FOR UPDATE
  USING (auth.uid() = id AND app_id = 'kalise')
  WITH CHECK (auth.uid() = id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can delete their own kalise profile" ON public.kalise_profiles;
CREATE POLICY "Users can delete their own kalise profile"
  ON public.kalise_profiles FOR DELETE
  USING (auth.uid() = id AND app_id = 'kalise');

-- ----------------------------------------------------------------------------
-- 2. Table: public.kalise_preferences
-- Purpose: Application-specific preferences (theme, check-ins, onboarding)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kalise_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'kalise' CHECK (app_id = 'kalise'),
  theme TEXT NOT NULL DEFAULT 'dark',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  onboarding_goals TEXT[] DEFAULT '{}',
  notification_preference TEXT NOT NULL DEFAULT 'default',
  medication_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  chat_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  chat_reminder_time TEXT NOT NULL DEFAULT '20:30',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.kalise_preferences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kalise_preferences_user_app ON public.kalise_preferences(user_id, app_id);

DROP POLICY IF EXISTS "Users can view their own kalise preferences" ON public.kalise_preferences;
CREATE POLICY "Users can view their own kalise preferences"
  ON public.kalise_preferences FOR SELECT
  USING (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can insert their own kalise preferences" ON public.kalise_preferences;
CREATE POLICY "Users can insert their own kalise preferences"
  ON public.kalise_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can update their own kalise preferences" ON public.kalise_preferences;
CREATE POLICY "Users can update their own kalise preferences"
  ON public.kalise_preferences FOR UPDATE
  USING (auth.uid() = user_id AND app_id = 'kalise')
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can delete their own kalise preferences" ON public.kalise_preferences;
CREATE POLICY "Users can delete their own kalise preferences"
  ON public.kalise_preferences FOR DELETE
  USING (auth.uid() = user_id AND app_id = 'kalise');

-- ----------------------------------------------------------------------------
-- 3. Table: public.kalise_mood_entries
-- Purpose: Mood logs, energy, sleep duration, and perceived restfulness
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kalise_mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'kalise' CHECK (app_id = 'kalise'),
  level TEXT NOT NULL,
  score INT NOT NULL,
  label TEXT NOT NULL,
  emotions TEXT[] DEFAULT '{}',
  influences TEXT[] DEFAULT '{}',
  energy_level TEXT,
  energy_score INT,
  sleep_quality TEXT,
  sleep_hours NUMERIC,
  rested_level TEXT,
  rested_score INT,
  thought_behaviors TEXT[] DEFAULT '{}',
  note TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.kalise_mood_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kalise_mood_entries_lookup ON public.kalise_mood_entries(user_id, app_id, recorded_at DESC);

DROP POLICY IF EXISTS "Users can view their own kalise mood entries" ON public.kalise_mood_entries;
CREATE POLICY "Users can view their own kalise mood entries"
  ON public.kalise_mood_entries FOR SELECT
  USING (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can insert their own kalise mood entries" ON public.kalise_mood_entries;
CREATE POLICY "Users can insert their own kalise mood entries"
  ON public.kalise_mood_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can update their own kalise mood entries" ON public.kalise_mood_entries;
CREATE POLICY "Users can update their own kalise mood entries"
  ON public.kalise_mood_entries FOR UPDATE
  USING (auth.uid() = user_id AND app_id = 'kalise')
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can delete their own kalise mood entries" ON public.kalise_mood_entries;
CREATE POLICY "Users can delete their own kalise mood entries"
  ON public.kalise_mood_entries FOR DELETE
  USING (auth.uid() = user_id AND app_id = 'kalise');

-- ----------------------------------------------------------------------------
-- 4. Table: public.kalise_journal_entries
-- Purpose: Private reflections and mindful writing prompts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kalise_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'kalise' CHECK (app_id = 'kalise'),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  prompt_used TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.kalise_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kalise_journal_entries_lookup ON public.kalise_journal_entries(user_id, app_id, created_at DESC);

DROP POLICY IF EXISTS "Users can view their own kalise journal entries" ON public.kalise_journal_entries;
CREATE POLICY "Users can view their own kalise journal entries"
  ON public.kalise_journal_entries FOR SELECT
  USING (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can insert their own kalise journal entries" ON public.kalise_journal_entries;
CREATE POLICY "Users can insert their own kalise journal entries"
  ON public.kalise_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can update their own kalise journal entries" ON public.kalise_journal_entries;
CREATE POLICY "Users can update their own kalise journal entries"
  ON public.kalise_journal_entries FOR UPDATE
  USING (auth.uid() = user_id AND app_id = 'kalise')
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can delete their own kalise journal entries" ON public.kalise_journal_entries;
CREATE POLICY "Users can delete their own kalise journal entries"
  ON public.kalise_journal_entries FOR DELETE
  USING (auth.uid() = user_id AND app_id = 'kalise');

-- ----------------------------------------------------------------------------
-- 5. Table: public.kalise_medications
-- Purpose: Configured user medications, vitamins, and supplements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kalise_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'kalise' CHECK (app_id = 'kalise'),
  name TEXT NOT NULL,
  dose TEXT,
  notes TEXT,
  frequency TEXT NOT NULL DEFAULT 'once-daily',
  frequency_details JSONB,
  reminder_times TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.kalise_medications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kalise_medications_lookup ON public.kalise_medications(user_id, app_id);

DROP POLICY IF EXISTS "Users can view their own kalise medications" ON public.kalise_medications;
CREATE POLICY "Users can view their own kalise medications"
  ON public.kalise_medications FOR SELECT
  USING (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can insert their own kalise medications" ON public.kalise_medications;
CREATE POLICY "Users can insert their own kalise medications"
  ON public.kalise_medications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can update their own kalise medications" ON public.kalise_medications;
CREATE POLICY "Users can update their own kalise medications"
  ON public.kalise_medications FOR UPDATE
  USING (auth.uid() = user_id AND app_id = 'kalise')
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can delete their own kalise medications" ON public.kalise_medications;
CREATE POLICY "Users can delete their own kalise medications"
  ON public.kalise_medications FOR DELETE
  USING (auth.uid() = user_id AND app_id = 'kalise');

-- ----------------------------------------------------------------------------
-- 6. Table: public.kalise_medication_logs
-- Purpose: Scheduled adherence history (taken, skipped, snoozed, not logged)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kalise_medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'kalise' CHECK (app_id = 'kalise'),
  medication_id TEXT,
  medication_name TEXT NOT NULL,
  dose TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  snoozed_until TIMESTAMPTZ,
  reason TEXT
);

ALTER TABLE public.kalise_medication_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kalise_medication_logs_lookup ON public.kalise_medication_logs(user_id, app_id, scheduled_date DESC);

DROP POLICY IF EXISTS "Users can view their own kalise medication logs" ON public.kalise_medication_logs;
CREATE POLICY "Users can view their own kalise medication logs"
  ON public.kalise_medication_logs FOR SELECT
  USING (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can insert their own kalise medication logs" ON public.kalise_medication_logs;
CREATE POLICY "Users can insert their own kalise medication logs"
  ON public.kalise_medication_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can update their own kalise medication logs" ON public.kalise_medication_logs;
CREATE POLICY "Users can update their own kalise medication logs"
  ON public.kalise_medication_logs FOR UPDATE
  USING (auth.uid() = user_id AND app_id = 'kalise')
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can delete their own kalise medication logs" ON public.kalise_medication_logs;
CREATE POLICY "Users can delete their own kalise medication logs"
  ON public.kalise_medication_logs FOR DELETE
  USING (auth.uid() = user_id AND app_id = 'kalise');

-- ----------------------------------------------------------------------------
-- 7. Table: public.kalise_user_affirmation_state
-- Purpose: User-specific favorite affirmation flags
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kalise_user_affirmation_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'kalise' CHECK (app_id = 'kalise'),
  affirmation_id TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, affirmation_id, app_id)
);

ALTER TABLE public.kalise_user_affirmation_state ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kalise_affirmation_state_lookup ON public.kalise_user_affirmation_state(user_id, app_id);

DROP POLICY IF EXISTS "Users can view their own kalise affirmation state" ON public.kalise_user_affirmation_state;
CREATE POLICY "Users can view their own kalise affirmation state"
  ON public.kalise_user_affirmation_state FOR SELECT
  USING (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can insert their own kalise affirmation state" ON public.kalise_user_affirmation_state;
CREATE POLICY "Users can insert their own kalise affirmation state"
  ON public.kalise_user_affirmation_state FOR INSERT
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can update their own kalise affirmation state" ON public.kalise_user_affirmation_state;
CREATE POLICY "Users can update their own kalise affirmation state"
  ON public.kalise_user_affirmation_state FOR UPDATE
  USING (auth.uid() = user_id AND app_id = 'kalise')
  WITH CHECK (auth.uid() = user_id AND app_id = 'kalise');

DROP POLICY IF EXISTS "Users can delete their own kalise affirmation state" ON public.kalise_user_affirmation_state;
CREATE POLICY "Users can delete their own kalise affirmation state"
  ON public.kalise_user_affirmation_state FOR DELETE
  USING (auth.uid() = user_id AND app_id = 'kalise');

-- ----------------------------------------------------------------------------
-- 8. Instant Auto-Provisioning Trigger on auth.users (app_id = 'kalise')
-- Purpose: Immediately provisions kalise_profiles & kalise_preferences on signup
-- Security:
--   - Explicit search_path = '' prevents search_path hijacking on SECURITY DEFINER
--   - All table and type references are fully schema-qualified (public.kalise_*)
--   - Revokes EXECUTE from PUBLIC/anon/authenticated to prevent direct RPC execution
--   - Strictly conditional on app_id = 'kalise' (zero effect on BibleSense or other apps)
--   - Uses ON CONFLICT DO NOTHING to guarantee no overwrites and no signup failures
--   - Never accesses or alters credentials, passwords, or tokens
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_kalise_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Execute only when the user is explicitly registering for Kalise
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'app_id' = 'kalise' THEN
    INSERT INTO public.kalise_profiles (
      id,
      app_id,
      preferred_name,
      email,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      'kalise',
      COALESCE(NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'preferred_name'), ''), 'Friend'),
      NEW.email,
      pg_catalog.timezone('utc'::pg_catalog.text, pg_catalog.now()),
      pg_catalog.timezone('utc'::pg_catalog.text, pg_catalog.now())
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.kalise_preferences (
      user_id,
      app_id,
      theme,
      onboarding_completed,
      onboarding_goals,
      notification_preference,
      medication_reminder_enabled,
      chat_reminder_enabled,
      chat_reminder_time,
      updated_at
    )
    VALUES (
      NEW.id,
      'kalise',
      'dark',
      false,
      '{}'::pg_catalog.text[],
      'default',
      false,
      true,
      '20:30',
      pg_catalog.timezone('utc'::pg_catalog.text, pg_catalog.now())
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Restrict function execution: prevent clients from calling it directly via Supabase RPC
REVOKE ALL ON FUNCTION public.handle_new_kalise_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_kalise_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_kalise_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_kalise_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_kalise_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created_kalise ON auth.users;
CREATE TRIGGER on_auth_user_created_kalise
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_kalise_user();
`;

/**
 * Checks if the current browser URL is a Supabase password recovery link.
 */
export function isPasswordRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    hash.includes('error_description')
  );
}

// -------------------------------------------------------------
// Auth Service
// -------------------------------------------------------------
export const authService = {
  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Error fetching session:', error.message);
        return null;
      }
      return data.session;
    } catch (e) {
      console.warn('Supabase getSession exception:', e);
      return null;
    }
  },

  async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  },

  async signUp(email: string, password: string, preferredName: string) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
    }
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          app_id: 'kalise',
          app_name: 'Kalise',
          preferred_name: preferredName.trim() || 'Friend',
        },
      },
    });

    if (error) {
      console.error('Supabase signUp error:', error);
      throw error;
    }

    // If session is immediately returned (e.g. email confirmation disabled in Supabase)
    if (data.session && data.user) {
      try {
        await remoteDbService.ensureUserProfileAndPreferences(
          data.user.id,
          preferredName.trim() || 'Friend',
          email.trim()
        );
      } catch (err) {
        console.warn('Could not auto-create profile records during signup:', err);
      }
    }

    return data;
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      console.error('Supabase signIn error:', error);
      throw error;
    }

    // Ensure profile and preferences exist on verified sign-in
    if (data.user) {
      try {
        const preferredName =
          data.user.user_metadata?.preferred_name ||
          data.user.email?.split('@')[0] ||
          'Friend';
        await remoteDbService.ensureUserProfileAndPreferences(
          data.user.id,
          preferredName,
          data.user.email
        );
      } catch (e) {
        console.warn('Could not ensure profile on sign in:', e);
      }
    }

    return data;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error during signOut:', e);
    }
  },

  async resetPasswordForEmail(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
    }
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });
    if (error) {
      console.error('Supabase resetPasswordForEmail error:', error);
      throw error;
    }
    return data;
  },

  async updatePassword(newPassword: string) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
    }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      console.error('Supabase updatePassword error:', error);
      throw error;
    }
    return data;
  },
};

// -------------------------------------------------------------
// Remote Database Service (Row Level Security protected)
// -------------------------------------------------------------
export const remoteDbService = {
  async ensureUserProfileAndPreferences(userId: string, preferredName: string, email?: string) {
    if (!isSupabaseConfigured) return;
    const now = new Date().toISOString();

    try {
      // 1. Profile: check if existing row exists; if not, create it
      const { data: existingProfile } = await supabase
        .from('kalise_profiles')
        .select('id')
        .eq('id', userId)
        .eq('app_id', 'kalise')
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabase.from('kalise_profiles').upsert(
          {
            id: userId,
            app_id: 'kalise',
            preferred_name: preferredName.trim() || 'Friend',
            email,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'id' }
        );
        if (profileError) {
          console.warn('Could not ensure kalise_profiles:', profileError);
        }
      }

      // 2. Preferences: check if existing row exists; if not, create it
      const { data: existingPrefs } = await supabase
        .from('kalise_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .eq('app_id', 'kalise')
        .maybeSingle();

      if (!existingPrefs) {
        const { error: prefsError } = await supabase.from('kalise_preferences').upsert(
          {
            user_id: userId,
            app_id: 'kalise',
            theme: 'dark',
            onboarding_completed: false,
            onboarding_goals: [],
            notification_preference: 'default',
            medication_reminder_enabled: false,
            chat_reminder_enabled: true,
            chat_reminder_time: '20:30',
            updated_at: now,
          },
          { onConflict: 'user_id' }
        );
        if (prefsError) {
          console.warn('Could not ensure kalise_preferences:', prefsError);
        }
      }
    } catch (e) {
      console.warn('ensureUserProfileAndPreferences error:', e);
    }
  },

  // Alias for backward compatibility
  async initUserProfileAndPreferences(userId: string, preferredName: string, email?: string) {
    return this.ensureUserProfileAndPreferences(userId, preferredName, email);
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('kalise_profiles')
        .select('*')
        .eq('id', userId)
        .eq('app_id', 'kalise')
        .maybeSingle();

      if (error || !data) return null;
      return {
        id: data.id,
        preferredName: data.preferred_name || 'Friend',
        email: data.email,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  },

  async updateProfile(userId: string, preferredName: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase
        .from('kalise_profiles')
        .update({
          preferred_name: preferredName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('app_id', 'kalise');
    } catch (e) {
      console.warn('updateProfile error:', e);
    }
  },

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('kalise_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('app_id', 'kalise')
        .maybeSingle();

      if (error || !data) return null;
      return {
        userId: data.user_id,
        theme: (data.theme as ThemeMode) || 'dark',
        onboardingCompleted: Boolean(data.onboarding_completed),
        onboardingGoals: data.onboarding_goals || [],
        notificationPreference: data.notification_preference || 'default',
        medicationReminderEnabled: Boolean(data.medication_reminder_enabled),
        chatReminderEnabled: Boolean(data.chat_reminder_enabled),
        chatReminderTime: data.chat_reminder_time || '20:30',
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  },

  async savePreferences(userId: string, prefs: Partial<UserPreferences>): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const payload: Record<string, unknown> = {
        user_id: userId,
        app_id: 'kalise',
        updated_at: new Date().toISOString(),
      };
      if (prefs.theme !== undefined) payload.theme = prefs.theme;
      if (prefs.onboardingCompleted !== undefined) payload.onboarding_completed = prefs.onboardingCompleted;
      if (prefs.onboardingGoals !== undefined) payload.onboarding_goals = prefs.onboardingGoals;
      if (prefs.notificationPreference !== undefined) payload.notification_preference = prefs.notificationPreference;
      if (prefs.medicationReminderEnabled !== undefined) payload.medication_reminder_enabled = prefs.medicationReminderEnabled;
      if (prefs.chatReminderEnabled !== undefined) payload.chat_reminder_enabled = prefs.chatReminderEnabled;
      if (prefs.chatReminderTime !== undefined) payload.chat_reminder_time = prefs.chatReminderTime;

      await supabase.from('kalise_preferences').upsert(payload, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('savePreferences error:', e);
    }
  },

  // Mood entries
  async getMoods(userId: string): Promise<MoodEntry[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('kalise_mood_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('app_id', 'kalise')
        .order('recorded_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        level: row.level,
        score: row.score,
        label: row.label,
        emotions: row.emotions || [],
        influences: row.influences || [],
        energyLevel: row.energy_level,
        energyScore: row.energy_score,
        sleepQuality: row.sleep_quality,
        sleepHours: row.sleep_hours ? Number(row.sleep_hours) : undefined,
        restedLevel: row.rested_level,
        restedScore: row.rested_score ? Number(row.rested_score) : undefined,
        thoughtBehaviors: row.thought_behaviors || [],
        note: row.note,
        timestamp: row.recorded_at,
      }));
    } catch {
      return [];
    }
  },

  async insertMood(userId: string, entry: Omit<MoodEntry, 'id'> & { id?: string }): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('kalise_mood_entries').insert({
        user_id: userId,
        app_id: 'kalise',
        level: entry.level,
        score: entry.score,
        label: entry.label,
        emotions: entry.emotions,
        influences: entry.influences,
        energy_level: entry.energyLevel,
        energy_score: entry.energyScore,
        sleep_quality: entry.sleepQuality,
        sleep_hours: entry.sleepHours,
        rested_level: entry.restedLevel,
        rested_score: entry.restedScore,
        thought_behaviors: entry.thoughtBehaviors,
        note: entry.note,
        recorded_at: entry.timestamp || new Date().toISOString(),
      });
    } catch (e) {
      console.warn('insertMood error:', e);
    }
  },

  async deleteMood(id: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('kalise_mood_entries').delete().match({ id, user_id: userId, app_id: 'kalise' });
    } catch (e) {
      console.warn('deleteMood error:', e);
    }
  },

  // Journal entries
  async getJournals(userId: string): Promise<JournalEntry[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('kalise_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('app_id', 'kalise')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        promptUsed: row.prompt_used,
        tags: row.tags || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async saveJournal(userId: string, entry: Omit<JournalEntry, 'id'> & { id?: string }): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const now = new Date().toISOString();
      if (entry.id && !entry.id.startsWith('journal-')) {
        await supabase
          .from('kalise_journal_entries')
          .update({
            title: entry.title,
            content: entry.content,
            prompt_used: entry.promptUsed,
            tags: entry.tags,
            updated_at: now,
          })
          .match({ id: entry.id, user_id: userId, app_id: 'kalise' });
      } else {
        await supabase.from('kalise_journal_entries').insert({
          user_id: userId,
          app_id: 'kalise',
          title: entry.title,
          content: entry.content,
          prompt_used: entry.promptUsed,
          tags: entry.tags,
          created_at: entry.createdAt || now,
          updated_at: now,
        });
      }
    } catch (e) {
      console.warn('saveJournal error:', e);
    }
  },

  async deleteJournal(id: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('kalise_journal_entries').delete().match({ id, user_id: userId, app_id: 'kalise' });
    } catch (e) {
      console.warn('deleteJournal error:', e);
    }
  },

  // Medications
  async getMedications(userId: string): Promise<Medication[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('kalise_medications')
        .select('*')
        .eq('user_id', userId)
        .eq('app_id', 'kalise')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        dose: row.dose,
        notes: row.notes,
        frequency: row.frequency,
        frequencyDetails: row.frequency_details,
        reminderTimes: row.reminder_times || [],
        startDate: row.start_date,
        endDate: row.end_date,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async saveMedication(userId: string, med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const now = new Date().toISOString();
      if (med.id && !med.id.startsWith('med-')) {
        await supabase
          .from('kalise_medications')
          .update({
            name: med.name,
            dose: med.dose,
            notes: med.notes,
            frequency: med.frequency,
            frequency_details: med.frequencyDetails,
            reminder_times: med.reminderTimes,
            start_date: med.startDate || null,
            end_date: med.endDate || null,
            active: med.active,
            updated_at: now,
          })
          .match({ id: med.id, user_id: userId, app_id: 'kalise' });
      } else {
        await supabase.from('kalise_medications').insert({
          user_id: userId,
          app_id: 'kalise',
          name: med.name,
          dose: med.dose,
          notes: med.notes,
          frequency: med.frequency,
          frequency_details: med.frequencyDetails,
          reminder_times: med.reminderTimes,
          start_date: med.startDate || null,
          end_date: med.endDate || null,
          active: med.active,
          created_at: now,
          updated_at: now,
        });
      }
    } catch (e) {
      console.warn('saveMedication error:', e);
    }
  },

  async deleteMedication(id: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('kalise_medications').delete().match({ id, user_id: userId, app_id: 'kalise' });
    } catch (e) {
      console.warn('deleteMedication error:', e);
    }
  },

  // Medication Logs
  async getMedicationLogs(userId: string): Promise<MedicationLog[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('kalise_medication_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('app_id', 'kalise')
        .order('scheduled_date', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id,
        medicationId: row.medication_id || '',
        medicationName: row.medication_name,
        dose: row.dose,
        scheduledDate: row.scheduled_date,
        scheduledTime: row.scheduled_time,
        status: row.status,
        recordedAt: row.recorded_at,
        snoozedUntil: row.snoozed_until,
        reason: row.reason,
      }));
    } catch {
      return [];
    }
  },

  async saveMedicationLog(userId: string, log: Omit<MedicationLog, 'id'> & { id?: string }): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('kalise_medication_logs').insert({
        user_id: userId,
        app_id: 'kalise',
        medication_id: log.medicationId,
        medication_name: log.medicationName,
        dose: log.dose,
        scheduled_date: log.scheduledDate,
        scheduled_time: log.scheduledTime,
        status: log.status,
        recorded_at: log.recordedAt || new Date().toISOString(),
        snoozed_until: log.snoozedUntil,
        reason: log.reason,
      });
    } catch (e) {
      console.warn('saveMedicationLog error:', e);
    }
  },

  async deleteMedicationLog(id: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('kalise_medication_logs').delete().match({ id, user_id: userId, app_id: 'kalise' });
    } catch (e) {
      console.warn('deleteMedicationLog error:', e);
    }
  },

  // Affirmations favorites
  async getAffirmationFavorites(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('kalise_user_affirmation_state')
        .select('affirmation_id')
        .eq('user_id', userId)
        .eq('app_id', 'kalise')
        .eq('is_favorite', true);

      if (error || !data) return [];
      return data.map((r) => r.affirmation_id);
    } catch {
      return [];
    }
  },

  async setAffirmationFavorite(userId: string, affirmationId: string, isFavorite: boolean): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('kalise_user_affirmation_state').upsert(
        {
          user_id: userId,
          app_id: 'kalise',
          affirmation_id: affirmationId,
          is_favorite: isFavorite,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,affirmation_id,app_id' }
      );
    } catch (e) {
      console.warn('setAffirmationFavorite error:', e);
    }
  },
};
