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
import {
  getScheduledDosesForDate,
  sendBrowserNotification,
  getLocalDateString,
} from './services/medicationService';

export default function App() {
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
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  // Mood handlers
  const handleSaveMood = (entry: Omit<MoodEntry, 'id' | 'timestamp'>) => {
    const saved = storageService.saveMood(entry);
    setMoods(storageService.getMoods());
  };

  const handleDeleteMood = (id: string) => {
    storageService.deleteMood(id);
    setMoods(storageService.getMoods());
  };

  // Journal handlers
  const handleSaveJournalEntry = (
    entry: { title: string; content: string; promptUsed?: string; tags?: string[] },
    id?: string
  ) => {
    storageService.saveJournalEntry(entry, id);
    setJournals(storageService.getJournalEntries());
  };

  const handleDeleteJournalEntry = (id: string) => {
    storageService.deleteJournalEntry(id);
    setJournals(storageService.getJournalEntries());
  };

  const handleShareJournalWithKalise = (text: string) => {
    setActiveTab('kalise');
    handleSendMessage(text);
  };

  // Affirmation favorites
  const handleToggleAffirmationFavorite = (id: string) => {
    const updated = storageService.toggleAffirmationFavorite(id);
    setAffirmations(updated);
  };

  // Medication handlers
  const handleSaveMedication = (
    med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    storageService.saveMedication(med);
    setMedications(storageService.getMedications());
  };

  const handleDeleteMedication = (id: string) => {
    storageService.deleteMedication(id);
    setMedications(storageService.getMedications());
  };

  const handleToggleMedicationActive = (id: string) => {
    const updated = storageService.toggleMedicationActive(id);
    setMedications(updated);
  };

  const handleRecordMedicationAction = (
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

    storageService.saveMedicationLog({
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
  };

  const handleDeleteMedicationLog = (id: string) => {
    storageService.deleteMedicationLog(id);
    setMedicationLogs(storageService.getMedicationLogs());
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
        setCrisisReason("I noticed that you might be going through immense pain right now. Your safety and well-being come first.");
        setIsCrisisModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to communicate with Kalise server:', err);
      const fallbackMsg: ChatMessage = {
        id: 'msg-' + Date.now() + 1,
        role: 'assistant',
        content: "I'm right here with you. It seems our connection dipped for a moment, but please know whatever you're carrying, you don't have to carry it alone. How are you holding up right now?",
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
