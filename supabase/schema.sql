-- ============================================================================
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

