import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from './services/storage';
import {
  MoodEntry,
  JournalEntry,
  Affirmation,
  ChatMessage,
  UserSettings,
  Medication,
  MedicationLog,
} from './types';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { MoodTracker } from './components/MoodTracker';
import { JournalView } from './components/JournalView';
import { AffirmationsView } from './components/AffirmationsView';
import { KaliseChat } from './components/KaliseChat';
import { MedicationsView } from './components/MedicationsView';
import { CrisisModal } from './components/CrisisModal';
import { SettingsModal } from './components/SettingsModal';
import { PremiumModal } from './components/PremiumModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthView } from './components/AuthView';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import {
  authService,
  remoteDbService,
  isSupabaseConfigured,
  isPasswordRecoveryUrl,
  supabase,
} from './services/supabase';
import {
  getScheduledDosesForDate,
  sendBrowserNotification,
  getLocalDateString,
} from './services/medicationService';
import { Session, User } from '@supabase/supabase-js';
import { Sparkles } from 'lucide-react';

function KaliseMainApp() {
  const { theme, setTheme } = useTheme();

  // Authentication State
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // App Navigation & Modals
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [settings, setSettings] = useState<UserSettings>(() => storageService.getSettings());
  const [moods, setMoods] = useState<MoodEntry[]>(() => storageService.getMoods());
  const [journals, setJournals] = useState<JournalEntry[]>(() => storageService.getJournalEntries());
  const [affirmations, setAffirmations] = useState<Affirmation[]>(() => storageService.getAffirmations());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => storageService.getChatHistory());
  const [medications, setMedications] = useState<Medication[]>(() => storageService.getMedications());
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>(() => storageService.getMedicationLogs());

  const [isMedicationsOpen, setIsMedicationsOpen] = useState(false);
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState(false);
  const [crisisReason, setCrisisReason] = useState<string | undefined>(undefined);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Synchronize user settings when authenticated
  const loadUserDataForUser = async (user: User) => {
    try {
      const initialName =
        user.user_metadata?.preferred_name ||
        user.email?.split('@')[0] ||
        'Friend';

      // Always guarantee kalise_profiles and kalise_preferences exist for this authenticated user
      await remoteDbService.ensureUserProfileAndPreferences(
        user.id,
        initialName,
        user.email
      );

      const profile = await remoteDbService.getProfile(user.id);
      const prefs = await remoteDbService.getPreferences(user.id);

      const preferredName = profile?.preferredName || initialName;
      const userTheme = prefs?.theme || settings.theme || 'dark';

      const updatedSettings: UserSettings = {
        ...settings,
        userId: user.id,
        userName: preferredName,
        email: user.email,
        theme: userTheme,
        onboardingCompleted: prefs ? prefs.onboardingCompleted : true,
      };

      setSettings(updatedSettings);
      storageService.saveSettings(updatedSettings);
      setTheme(userTheme);

      // Check onboarding requirement
      if (prefs && prefs.onboardingCompleted === false) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }

      // Check if remote data exists and sync with local cache
      const remoteMoods = await remoteDbService.getMoods(user.id);
      if (remoteMoods.length > 0) {
        setMoods(remoteMoods);
      }

      const remoteJournals = await remoteDbService.getJournals(user.id);
      if (remoteJournals.length > 0) {
        setJournals(remoteJournals);
      }

      const remoteMeds = await remoteDbService.getMedications(user.id);
      if (remoteMeds.length > 0) {
        setMedications(remoteMeds);
      }

      const remoteLogs = await remoteDbService.getMedicationLogs(user.id);
      if (remoteLogs.length > 0) {
        setMedicationLogs(remoteLogs);
      }
    } catch (e) {
      console.warn('Could not complete remote data sync:', e);
    }
  };

  // Session restoration on startup
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      // If recovery URL, trigger auth view directly
      if (isPasswordRecoveryUrl()) {
        setShowAuthScreen(true);
        setIsAuthChecking(false);
        return;
      }

      if (!isSupabaseConfigured) {
        // Supabase credentials not yet configured
        // Check if user previously used prototype or show auth
        setIsAuthChecking(false);
        return;
      }

      try {
        const currentSession = await authService.getSession();
        if (!isMounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          await loadUserDataForUser(currentSession.user);
        } else {
          setSession(null);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    }

    initSession();

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);

      if (event === 'SIGNED_IN' && newSession?.user) {
        setShowAuthScreen(false);
        await loadUserDataForUser(newSession.user);
      } else if (event === 'SIGNED_OUT') {
        setShowAuthScreen(true);
        setShowOnboarding(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        setShowAuthScreen(true);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Latest mood
  const latestMood = useMemo(() => (moods.length > 0 ? moods[0] : undefined), [moods]);

  // Today's featured affirmation based on day of year
  const dailyAffirmation = useMemo(() => {
    if (affirmations.length === 0) {
      return {
        id: 'default',
        text: 'I do not have to exhaust myself to prove that I am worthy of rest.',
        category: 'boundaries' as const,
        reflectionPrompt: 'Where in your routine are you pushing past your natural limits today?',
      };
    }
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
    );
    return affirmations[dayOfYear % affirmations.length];
  }, [affirmations]);

  // Update settings handler
  const handleUpdateSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);

    if (session?.user) {
      await remoteDbService.updateProfile(session.user.id, newSettings.userName);
      await remoteDbService.savePreferences(session.user.id, {
        theme: newSettings.theme,
        chatReminderEnabled: newSettings.dailyCheckInEnabled,
        chatReminderTime: newSettings.dailyCheckInTime,
        medicationReminderEnabled: newSettings.medicationRemindersEnabled,
      });
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    await authService.signOut();
    setSession(null);
    setShowAuthScreen(true);
  };

  // Password change / reset request from settings
  const handleRequestPasswordChange = () => {
    if (session?.user?.email) {
      authService.resetPasswordForEmail(session.user.email);
      alert(`Password reset instructions have been sent to ${session.user.email}.`);
    } else {
      setShowAuthScreen(true);
    }
  };

  // Onboarding completion
  const handleOnboardingComplete = async (goals: string[]) => {
    setShowOnboarding(false);
    const updatedSettings = {
      ...settings,
      onboardingCompleted: true,
      onboardingGoals: goals,
    };
    setSettings(updatedSettings);
    storageService.saveSettings(updatedSettings);

    if (session?.user) {
      await remoteDbService.savePreferences(session.user.id, {
        onboardingCompleted: true,
        onboardingGoals: goals,
      });
    }
  };

  // Mood handlers
  const handleSaveMood = async (entry: Omit<MoodEntry, 'id' | 'timestamp'>) => {
    const saved = storageService.saveMood(entry);
    setMoods(storageService.getMoods());

    if (session?.user) {
      await remoteDbService.insertMood(session.user.id, saved);
    }
  };

  const handleDeleteMood = async (id: string) => {
    storageService.deleteMood(id);
    setMoods(storageService.getMoods());

    if (session?.user) {
      await remoteDbService.deleteMood(id, session.user.id);
    }
  };

  // Journal handlers
  const handleSaveJournalEntry = async (
    entry: { title: string; content: string; promptUsed?: string; tags?: string[] },
    id?: string
  ) => {
    const saved = storageService.saveJournalEntry(entry, id);
    setJournals(storageService.getJournalEntries());

    if (session?.user) {
      await remoteDbService.saveJournal(session.user.id, saved);
    }
  };

  const handleDeleteJournalEntry = async (id: string) => {
    storageService.deleteJournalEntry(id);
    setJournals(storageService.getJournalEntries());

    if (session?.user) {
      await remoteDbService.deleteJournal(id, session.user.id);
    }
  };

  const handleShareJournalWithKalise = (text: string) => {
    setActiveTab('kalise');
    handleSendMessage(text);
  };

  // Affirmation favorites
  const handleToggleAffirmationFavorite = async (id: string) => {
    const updated = storageService.toggleAffirmationFavorite(id);
    setAffirmations(updated);

    if (session?.user) {
      const item = updated.find((a) => a.id === id);
      if (item) {
        await remoteDbService.setAffirmationFavorite(
          session.user.id,
          id,
          Boolean(item.isFavorite)
        );
      }
    }
  };

  // Medication handlers
  const handleSaveMedication = async (
    med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const saved = storageService.saveMedication(med);
    setMedications(storageService.getMedications());

    if (session?.user) {
      await remoteDbService.saveMedication(session.user.id, saved);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    storageService.deleteMedication(id);
    setMedications(storageService.getMedications());

    if (session?.user) {
      await remoteDbService.deleteMedication(id, session.user.id);
    }
  };

  const handleToggleMedicationActive = async (id: string) => {
    const updated = storageService.toggleMedicationActive(id);
    setMedications(updated);

    if (session?.user) {
      const item = updated.find((m) => m.id === id);
      if (item) {
        await remoteDbService.saveMedication(session.user.id, item);
      }
    }
  };

  const handleRecordMedicationAction = async (
    medication: Medication,
    scheduledDate: string,
    scheduledTime: string,
    action: 'taken' | 'skipped' | 'snooze',
    snoozeMinutes?: number
  ) => {
    const now = new Date();
    let status: 'taken' | 'skipped' | 'snoozed' = 'taken';
    let snoozedUntil: string | undefined;

    if (action === 'skipped') {
      status = 'skipped';
    } else if (action === 'snooze') {
      status = 'snoozed';
      const mins = snoozeMinutes || 30;
      snoozedUntil = new Date(now.getTime() + mins * 60000).toISOString();
    }

    const saved = storageService.saveMedicationLog({
      medicationId: medication.id,
      medicationName: medication.name,
      dose: medication.dose,
      scheduledDate,
      scheduledTime,
      status,
      recordedAt: now.toISOString(),
      snoozedUntil,
    });

    setMedicationLogs(storageService.getMedicationLogs());

    if (session?.user) {
      await remoteDbService.saveMedicationLog(session.user.id, saved);
    }
  };

  const handleDeleteMedicationLog = async (id: string) => {
    storageService.deleteMedicationLog(id);
    setMedicationLogs(storageService.getMedicationLogs());

    if (session?.user) {
      await remoteDbService.deleteMedicationLog(id, session.user.id);
    }
  };

  // Active in-app timer for medication reminder notifications
  useEffect(() => {
    if (!settings.medicationRemindersEnabled || settings.notificationPermission !== 'granted') {
      return;
    }

    const notifiedKeys = new Set<string>();

    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;
      const todayStr = getLocalDateString(now);

      const todayDoses = getScheduledDosesForDate(medications, medicationLogs, todayStr);
      todayDoses.forEach((dose) => {
        if (dose.status === 'due' && dose.scheduledTime === currentTimeStr) {
          const key = `${dose.medication.id}-${todayStr}-${dose.scheduledTime}`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            sendBrowserNotification(dose.medication.name, dose.medication.dose, dose.medication.notes);
          }
        }
      });
    }, 30000);

    return () => clearInterval(checkInterval);
  }, [medications, medicationLogs, settings.medicationRemindersEnabled, settings.notificationPermission]);

  // Chat handlers
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    storageService.saveChatMessage(userMsg);

    // Update free message count if free tier
    if (!settings.isPremium) {
      const newSettings = {
        ...settings,
        freeMessagesUsed: (settings.freeMessagesUsed || 0) + 1,
      };
      handleUpdateSettings(newSettings);
    }

    setIsChatLoading(true);

    try {
      // NOTE: Medication information is strictly omitted from the AI payload
      const response = await fetch('/api/kalise/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
          userNote: latestMood?.note,
          currentMood: latestMood?.label,
          energyLevel: latestMood?.energyLevel,
          sleepQuality: latestMood?.sleepQuality,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat response was not ok');
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: 'msg-' + Date.now() + 1,
        role: 'assistant',
        content: data.reply || "I'm here with you. Take a quiet breath.",
        timestamp: new Date().toISOString(),
        isCrisis: data.isCrisis,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
      storageService.saveChatMessage(assistantMsg);

      if (data.isCrisis) {
        setCrisisReason(
          'I noticed that you might be going through immense pain right now. Your safety and well-being come first.'
        );
        setIsCrisisModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to communicate with Kalise server:', err);
      const fallbackMsg: ChatMessage = {
        id: 'msg-' + Date.now() + 1,
        role: 'assistant',
        content:
          "I'm right here with you. It seems our connection dipped for a moment, but please know whatever you're carrying, you don't have to carry it alone. How are you holding up right now?",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
      storageService.saveChatMessage(fallbackMsg);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Do you want to clear your current conversation with Kalise?')) {
      storageService.clearChat();
      setChatMessages(storageService.getChatHistory());
    }
  };

  const handleOpenCrisisModal = (reason?: string) => {
    setCrisisReason(reason);
    setIsCrisisModalOpen(true);
  };

  const handleCheckInNow = () => {
    setActiveTab('kalise');
    handleSendMessage("Hey Kalise, I'm checking in. How do we start today's reflection?");
  };

  // 1. Session Restoration Loading Screen (no flashing)
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center animate-serene-breathe text-teal-300">
          <Sparkles className="w-7 h-7" />
        </div>
        <p className="mt-4 text-xs font-serif text-slate-300 animate-gentle-pulse">
          Preparing your private space...
        </p>
      </div>
    );
  }

  // 2. Authentication Screen (when not logged in or explicitly prompted)
  if ((!session && isSupabaseConfigured) || showAuthScreen) {
    return (
      <AuthView
        onAuthSuccess={async () => {
          setShowAuthScreen(false);
          const current = await authService.getUser();
          if (current) {
            await loadUserDataForUser(current);
          }
        }}
        onContinueOfflinePreview={() => {
          setShowAuthScreen(false);
        }}
      />
    );
  }

  // 3. Onboarding Flow (new accounts)
  if (showOnboarding) {
    return (
      <OnboardingFlow
        userName={settings.userName}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // 4. Main Kalise Application
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-200">
      {/* Offline Alert */}
      <OfflineIndicator />

      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenCrisis={() => handleOpenCrisisModal()}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        onOpenMedications={() => setIsMedicationsOpen(true)}
        settings={settings}
      />

      {/* Main Container constrained for mobile-first feel */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-2">
        {activeTab === 'home' && (
          <HomeDashboard
            settings={settings}
            latestMood={latestMood}
            dailyAffirmation={dailyAffirmation}
            medications={medications}
            medicationLogs={medicationLogs}
            onNavigate={(tab) => setActiveTab(tab)}
            onToggleAffirmationFavorite={handleToggleAffirmationFavorite}
            onOpenCheckInPrompt={handleCheckInNow}
            onOpenCrisis={() => handleOpenCrisisModal()}
            onOpenMedications={() => setIsMedicationsOpen(true)}
            onRecordMedicationAction={handleRecordMedicationAction}
          />
        )}

        {activeTab === 'mood' && (
          <MoodTracker
            moods={moods}
            onSaveMood={handleSaveMood}
            onDeleteMood={handleDeleteMood}
          />
        )}

        {activeTab === 'journal' && (
          <JournalView
            entries={journals}
            onSaveEntry={handleSaveJournalEntry}
            onDeleteEntry={handleDeleteJournalEntry}
            onShareWithKalise={handleShareJournalWithKalise}
          />
        )}

        {activeTab === 'affirmations' && (
          <AffirmationsView
            affirmations={affirmations}
            onToggleFavorite={handleToggleAffirmationFavorite}
          />
        )}

        {activeTab === 'kalise' && (
          <KaliseChat
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onOpenCrisis={handleOpenCrisisModal}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
            settings={settings}
            latestMood={latestMood}
            isLoading={isChatLoading}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Medications Modal / View */}
      {isMedicationsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto">
            <MedicationsView
              medications={medications}
              logs={medicationLogs}
              settings={settings}
              onSaveMedication={handleSaveMedication}
              onDeleteMedication={handleDeleteMedication}
              onToggleMedicationActive={handleToggleMedicationActive}
              onRecordMedicationAction={handleRecordMedicationAction}
              onDeleteMedicationLog={handleDeleteMedicationLog}
              onUpdateSettings={handleUpdateSettings}
              onClose={() => setIsMedicationsOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <CrisisModal
        isOpen={isCrisisModalOpen}
        onClose={() => setIsCrisisModalOpen(false)}
        reason={crisisReason}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        onOpenMedications={() => setIsMedicationsOpen(true)}
        onSignOut={handleSignOut}
        onResetPassword={handleRequestPasswordChange}
      />

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <KaliseMainApp />
    </ThemeProvider>
  );
}
