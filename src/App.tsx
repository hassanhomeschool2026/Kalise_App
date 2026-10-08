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
  const [settings, setSettings] = useState<UserSettings>(() => storageService.getSettings(null));
  const [moods, setMoods] = useState<MoodEntry[]>(() => storageService.getMoods(null));
  const [journals, setJournals] = useState<JournalEntry[]>(() => storageService.getJournalEntries(null));
  const [affirmations, setAffirmations] = useState<Affirmation[]>(() => storageService.getAffirmations(null));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => storageService.getChatHistory(null));
  const [medications, setMedications] = useState<Medication[]>(() => storageService.getMedications(null));
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>(() => storageService.getMedicationLogs(null));

  const [isMedicationsOpen, setIsMedicationsOpen] = useState(false);
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState(false);
  const [crisisReason, setCrisisReason] = useState<string | undefined>(undefined);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Synchronize user settings and authoritative remote data when authenticated
  const loadUserDataForUser = async (user: User) => {
    try {
      storageService.setUserId(user.id);
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
      storageService.saveSettings(updatedSettings, user.id);
      setTheme(userTheme);

      // Check onboarding requirement
      if (prefs && prefs.onboardingCompleted === false) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }

      // REMOTE DATA IS AUTHORITATIVE (Requirement 4)
      const remoteMoods = await remoteDbService.getMoods(user.id);
      setMoods(remoteMoods);
      storageService.saveMoods(remoteMoods, user.id);

      const remoteJournals = await remoteDbService.getJournals(user.id);
      setJournals(remoteJournals);
      storageService.saveJournalEntries(remoteJournals, user.id);

      const remoteMeds = await remoteDbService.getMedications(user.id);
      setMedications(remoteMeds);
      storageService.saveMedications(remoteMeds, user.id);

      const remoteLogs = await remoteDbService.getMedicationLogs(user.id);
      setMedicationLogs(remoteLogs);
      storageService.saveMedicationLogs(remoteLogs, user.id);

      const remoteFavorites = await remoteDbService.getAffirmationFavorites(user.id);
      if (remoteFavorites.length > 0) {
        const affirmationsList = storageService.getAffirmations(user.id);
        const updatedAffirmations = affirmationsList.map((a) => ({
          ...a,
          isFavorite: remoteFavorites.includes(a.id),
        }));
        setAffirmations(updatedAffirmations);
      }

      const chatHist = storageService.getChatHistory(user.id);
      setChatMessages(chatHist);
    } catch (e) {
      console.warn('Could not complete remote data sync:', e);
    }
  };

  // Session restoration on startup
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (isPasswordRecoveryUrl()) {
        setShowAuthScreen(true);
        setIsAuthChecking(false);
        return;
      }

      if (!isSupabaseConfigured) {
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
          storageService.setUserId(null);
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

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);

      if (event === 'SIGNED_IN' && newSession?.user) {
        setShowAuthScreen(false);
        await loadUserDataForUser(newSession.user);
      } else if (event === 'SIGNED_OUT') {
        storageService.setUserId(null);
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

  const latestMood = useMemo(() => (moods.length > 0 ? moods[0] : undefined), [moods]);

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

  const handleUpdateSettings = async (newSettings: UserSettings) => {
    const userId = session?.user?.id || null;
    setSettings(newSettings);
    storageService.saveSettings(newSettings, userId);

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

  const handleSignOut = async () => {
    await authService.signOut();
    storageService.setUserId(null);
    setSession(null);
    setMoods(storageService.getMoods(null));
    setJournals(storageService.getJournalEntries(null));
    setMedications(storageService.getMedications(null));
    setMedicationLogs(storageService.getMedicationLogs(null));
    setChatMessages(storageService.getChatHistory(null));
    setAffirmations(storageService.getAffirmations(null));
    setSettings(storageService.getSettings(null));
    setShowAuthScreen(true);
  };

  const handleRequestPasswordChange = () => {
    if (session?.user?.email) {
      authService.resetPasswordForEmail(session.user.email);
      alert(`Password reset instructions have been sent to ${session.user.email}.`);
    } else {
      setShowAuthScreen(true);
    }
  };

  const handleOnboardingComplete = async (goals: string[]) => {
    setShowOnboarding(false);
    const userId = session?.user?.id || null;
    const updatedSettings = {
      ...settings,
      onboardingCompleted: true,
      onboardingGoals: goals,
    };
    setSettings(updatedSettings);
    storageService.saveSettings(updatedSettings, userId);

    if (session?.user) {
      await remoteDbService.savePreferences(session.user.id, {
        onboardingCompleted: true,
        onboardingGoals: goals,
      });
    }
  };

  // Mood handlers with ID reconciliation
  const handleSaveMood = async (entry: Omit<MoodEntry, 'id' | 'timestamp'>) => {
    const userId = session?.user?.id;
    const saved = storageService.saveMood(entry, userId);
    setMoods(storageService.getMoods(userId));

    if (session?.user) {
      const serverId = await remoteDbService.insertMood(session.user.id, saved);
      if (serverId && serverId !== saved.id) {
        const updated = storageService.getMoods(userId).map((m) =>
          m.id === saved.id ? { ...m, id: serverId } : m
        );
        storageService.saveMoods(updated, userId);
        setMoods(updated);
      }
    }
  };

  const handleDeleteMood = async (id: string) => {
    const userId = session?.user?.id;
    storageService.deleteMood(id, userId);
    setMoods(storageService.getMoods(userId));

    if (session?.user) {
      await remoteDbService.deleteMood(id, session.user.id);
    }
  };

  // Journal handlers with ID reconciliation
  const handleSaveJournalEntry = async (
    entry: { title: string; content: string; promptUsed?: string; tags?: string[] },
    id?: string
  ) => {
    const userId = session?.user?.id;
    const saved = storageService.saveJournalEntry(entry, id, userId);
    setJournals(storageService.getJournalEntries(userId));

    if (session?.user) {
      const serverId = await remoteDbService.saveJournal(session.user.id, saved);
      if (serverId && serverId !== saved.id) {
        const updated = storageService.getJournalEntries(userId).map((j) =>
          j.id === saved.id ? { ...j, id: serverId } : j
        );
        storageService.saveJournalEntries(updated, userId);
        setJournals(updated);
      }
    }
  };

  const handleDeleteJournalEntry = async (id: string) => {
    const userId = session?.user?.id;
    storageService.deleteJournalEntry(id, userId);
    setJournals(storageService.getJournalEntries(userId));

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
    const userId = session?.user?.id;
    const updated = storageService.toggleAffirmationFavorite(id, userId);
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

  // Medication handlers with ID reconciliation
  const handleSaveMedication = async (
    med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const userId = session?.user?.id;
    const saved = storageService.saveMedication(med, userId);
    setMedications(storageService.getMedications(userId));

    if (session?.user) {
      const serverId = await remoteDbService.saveMedication(session.user.id, saved);
      if (serverId && serverId !== saved.id) {
        const updated = storageService.getMedications(userId).map((m) =>
          m.id === saved.id ? { ...m, id: serverId } : m
        );
        storageService.saveMedications(updated, userId);
        setMedications(updated);
      }
    }
  };

  const handleDeleteMedication = async (id: string) => {
    const userId = session?.user?.id;
    storageService.deleteMedication(id, userId);
    setMedications(storageService.getMedications(userId));

    if (session?.user) {
      await remoteDbService.deleteMedication(id, session.user.id);
    }
  };

  const handleToggleMedicationActive = async (id: string) => {
    const userId = session?.user?.id;
    const updated = storageService.toggleMedicationActive(id, userId);
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
    const userId = session?.user?.id;
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

    const saved = storageService.saveMedicationLog(
      {
        medicationId: medication.id,
        medicationName: medication.name,
        dose: medication.dose,
        scheduledDate,
        scheduledTime,
        status,
        recordedAt: now.toISOString(),
        snoozedUntil,
      },
      userId
    );

    setMedicationLogs(storageService.getMedicationLogs(userId));

    if (session?.user) {
      const serverId = await remoteDbService.saveMedicationLog(session.user.id, saved);
      if (serverId && serverId !== saved.id) {
        const updated = storageService.getMedicationLogs(userId).map((l) =>
          l.id === saved.id ? { ...l, id: serverId } : l
        );
        storageService.saveMedicationLogs(updated, userId);
        setMedicationLogs(updated);
      }
    }
  };

  const handleDeleteMedicationLog = async (id: string) => {
    const userId = session?.user?.id;
    storageService.deleteMedicationLog(id, userId);
    setMedicationLogs(storageService.getMedicationLogs(userId));

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

  // Chat handlers with user scoping
  const handleSendMessage = async (text: string) => {
    const userId = session?.user?.id;
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    storageService.saveChatMessage(userMsg, userId);

    if (!settings.isPremium) {
      const newSettings = {
        ...settings,
        freeMessagesUsed: (settings.freeMessagesUsed || 0) + 1,
      };
      handleUpdateSettings(newSettings);
    }

    setIsChatLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/kalise/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
          currentMood: latestMood?.label,
          energyLevel: latestMood?.energyLevel,
          sleepQuality: latestMood?.sleepQuality,
          moods: storageService.getMoods(userId),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
      storageService.saveChatMessage(assistantMsg, userId);

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
      storageService.saveChatMessage(fallbackMsg, userId);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    const userId = session?.user?.id;
    if (window.confirm('Do you want to clear your current conversation with Kalise?')) {
      storageService.clearChat(userId);
      setChatMessages(storageService.getChatHistory(userId));
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

  if (showOnboarding) {
    return (
      <OnboardingFlow
        userName={settings.userName}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-200">
      <OfflineIndicator />

      <Header
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenCrisis={() => handleOpenCrisisModal()}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        onOpenMedications={() => setIsMedicationsOpen(true)}
        settings={settings}
      />

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

      <Navigation activeTab={activeTab} onChangeTab={setActiveTab} />

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
