import {
  MoodEntry,
  JournalEntry,
  Affirmation,
  ChatMessage,
  UserSettings,
  Medication,
  MedicationLog,
} from '../types';
import { INITIAL_AFFIRMATIONS } from './affirmationsData';

const STORAGE_KEYS = {
  MOODS: 'kalise_mood_entries_v1',
  JOURNAL: 'kalise_journal_entries_v1',
  AFFIRMATIONS: 'kalise_affirmations_v1',
  CHAT: 'kalise_chat_history_v1',
  SETTINGS: 'kalise_user_settings_v1',
  MEDICATIONS: 'kalise_medications_v1',
  MEDICATION_LOGS: 'kalise_medication_logs_v1',
};

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Friend',
  dailyCheckInEnabled: true,
  dailyCheckInTime: '20:30',
  isPremium: false,
  theme: 'dark',
  freeMessagesUsed: 0,
  medicationRemindersEnabled: false,
  notificationPermission: 'default',
};

const SEED_MEDICATIONS: Medication[] = [
  {
    id: 'med-seed-1',
    name: 'Daily Multivitamin',
    dose: '1 tablet',
    notes: 'Take with morning water.',
    frequency: 'once-daily',
    reminderTimes: ['08:30'],
    startDate: new Date().toISOString().split('T')[0],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_MOODS: MoodEntry[] = [
  {
    id: 'seed-mood-1',
    level: 'good',
    score: 4,
    label: 'Good',
    emotions: ['Relieved', 'Content', 'Hopeful'],
    influences: ['Solitude & Quiet', 'Daily Routine'],
    energyLevel: 'typical',
    energyScore: 3,
    sleepQuality: 'good',
    sleepHours: 7.5,
    thoughtBehaviors: ['Calm', 'Productive', 'Felt in control'],
    note: 'Went for a quiet evening walk. The cool air helped clear the mental chatter.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: 'seed-mood-2',
    level: 'okay',
    score: 3,
    label: 'Okay',
    emotions: ['Tired', 'Grounded', 'Reflective'],
    influences: ['Work & Career', 'Sleep Quality'],
    energyLevel: 'low',
    energyScore: 2,
    sleepQuality: 'poor',
    sleepHours: 5.5,
    thoughtBehaviors: ['Overthinking', 'Trouble focusing'],
    note: 'Long week at work. Slowing down this evening to reset and hydrate.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: 'seed-mood-3',
    level: 'low',
    score: 2,
    label: 'Low',
    emotions: ['Exhausted', 'Overwhelmed'],
    influences: ['Work & Career', 'Sleep Quality'],
    energyLevel: 'low',
    energyScore: 2,
    sleepQuality: 'poor',
    sleepHours: 5.0,
    thoughtBehaviors: ['Racing thoughts', 'Restless'],
    note: 'Slept poorly and felt the weight of multiple pending deadlines today.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
  },
  {
    id: 'seed-mood-4',
    level: 'good',
    score: 4,
    label: 'Good',
    emotions: ['Grounded', 'Peaceful', 'Content'],
    influences: ['Relationships', 'Solitude & Quiet'],
    energyLevel: 'typical',
    energyScore: 3,
    sleepQuality: 'good',
    sleepHours: 8.0,
    thoughtBehaviors: ['Calm', 'Felt in control'],
    note: 'Had a comforting chat with an old friend and spent the evening reading.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 76).toISOString(),
  },
  {
    id: 'seed-mood-5',
    level: 'okay',
    score: 3,
    label: 'Okay',
    emotions: ['Reflective', 'Restless'],
    influences: ['Daily Routine'],
    energyLevel: 'high',
    energyScore: 4,
    sleepQuality: 'okay',
    sleepHours: 6.5,
    thoughtBehaviors: ['Motivated', 'Restless'],
    note: 'Felt lots of physical energy but needed to direct it into something constructive.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 102).toISOString(),
  },
];

const SEED_JOURNAL: JournalEntry[] = [
  {
    id: 'seed-journal-1',
    title: 'Giving myself permission to slow down',
    content: `Today felt intense until about 4 PM. I noticed myself tightening my shoulders every time an email pinged.\n\nI stopped at my desk, uncurled my fists, and realized nothing in that inbox was an actual life-or-death emergency. It's okay to respond thoughtfully tomorrow instead of urgently right now.\n\nTonight's plan: turn off notifications, drink warm peppermint tea, and let my mind wander without having an agenda.`,
    promptUsed: "What do you need more of right now?",
    tags: ['Boundaries', 'Peace of Mind'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

export const storageService = {
  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  },

  getMoods(): MoodEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MOODS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.MOODS, JSON.stringify(SEED_MOODS));
        return SEED_MOODS;
      }
      return JSON.parse(data);
    } catch {
      return SEED_MOODS;
    }
  },

  saveMood(entry: Omit<MoodEntry, 'id' | 'timestamp'>): MoodEntry {
    const moods = this.getMoods();
    const newEntry: MoodEntry = {
      ...entry,
      id: 'mood-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...moods];
    try {
      localStorage.setItem(STORAGE_KEYS.MOODS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save mood entry', e);
    }
    return newEntry;
  },

  deleteMood(id: string): void {
    const moods = this.getMoods().filter((m) => m.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.MOODS, JSON.stringify(moods));
    } catch (e) {
      console.error('Failed to delete mood', e);
    }
  },

  getJournalEntries(): JournalEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.JOURNAL);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(SEED_JOURNAL));
        return SEED_JOURNAL;
      }
      return JSON.parse(data);
    } catch {
      return SEED_JOURNAL;
    }
  },

  saveJournalEntry(entry: { title: string; content: string; promptUsed?: string; tags?: string[] }, existingId?: string): JournalEntry {
    const list = this.getJournalEntries();
    const now = new Date().toISOString();

    if (existingId) {
      const updated = list.map((item) =>
        item.id === existingId
          ? {
              ...item,
              ...entry,
              updatedAt: now,
            }
          : item
      );
      try {
        localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update journal entry', e);
      }
      return updated.find((i) => i.id === existingId)!;
    } else {
      const newEntry: JournalEntry = {
        id: 'journal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        title: entry.title.trim() || 'Untitled Reflection',
        content: entry.content,
        promptUsed: entry.promptUsed,
        tags: entry.tags || [],
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newEntry, ...list];
      try {
        localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save journal entry', e);
      }
      return newEntry;
    }
  },

  deleteJournalEntry(id: string): void {
    const updated = this.getJournalEntries().filter((item) => item.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete journal entry', e);
    }
  },

  getAffirmations(): Affirmation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AFFIRMATIONS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.AFFIRMATIONS, JSON.stringify(INITIAL_AFFIRMATIONS));
        return INITIAL_AFFIRMATIONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_AFFIRMATIONS;
    }
  },

  toggleAffirmationFavorite(id: string): Affirmation[] {
    const list = this.getAffirmations();
    const updated = list.map((a) => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
    try {
      localStorage.setItem(STORAGE_KEYS.AFFIRMATIONS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update favorite', e);
    }
    return updated;
  },

  getChatHistory(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT);
      if (!data) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome-1',
          role: 'assistant',
          content: "Welcome. I'm Kalise, your companion for emotional reflection and decompression. Whatever is on your mind, big or small, this is a nonjudgmental space to slow down and talk through it. How are you feeling today?",
          timestamp: new Date().toISOString(),
        };
        return [welcomeMessage];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveChatMessage(message: ChatMessage): void {
    const history = this.getChatHistory();
    const updated = [...history, message];
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save chat message', e);
    }
  },

  clearChat(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CHAT);
    } catch (e) {
      console.error('Failed to clear chat', e);
    }
  },

  // Medication CRUD
  getMedications(): Medication[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEDICATIONS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(SEED_MEDICATIONS));
        return SEED_MEDICATIONS;
      }
      return JSON.parse(data);
    } catch {
      return SEED_MEDICATIONS;
    }
  },

  saveMedication(
    med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Medication {
    const list = this.getMedications();
    const now = new Date().toISOString();

    if (med.id) {
      const updatedList = list.map((item) =>
        item.id === med.id
          ? {
              ...item,
              ...med,
              updatedAt: now,
            }
          : item
      );
      try {
        localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedList));
      } catch (e) {
        console.error('Failed to update medication', e);
      }
      return updatedList.find((i) => i.id === med.id)!;
    }

    const newMed: Medication = {
      ...med,
      id: 'med-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: now,
      updatedAt: now,
    };
    const updatedList = [newMed, ...list];
    try {
      localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to save medication', e);
    }
    return newMed;
  },

  deleteMedication(id: string): void {
    const list = this.getMedications();
    const updated = list.filter((m) => m.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete medication', e);
    }
  },

  toggleMedicationActive(id: string): Medication[] {
    const list = this.getMedications();
    const updated = list.map((m) => (m.id === id ? { ...m, active: !m.active, updatedAt: new Date().toISOString() } : m));
    try {
      localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to toggle medication active state', e);
    }
    return updated;
  },

  // Medication Logs
  getMedicationLogs(): MedicationLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEDICATION_LOGS);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveMedicationLog(log: Omit<MedicationLog, 'id'> & { id?: string }): MedicationLog {
    const list = this.getMedicationLogs();
    if (log.id) {
      const updatedList = list.map((item) => (item.id === log.id ? { ...item, ...log } : item));
      try {
        localStorage.setItem(STORAGE_KEYS.MEDICATION_LOGS, JSON.stringify(updatedList));
      } catch (e) {
        console.error('Failed to update medication log', e);
      }
      return updatedList.find((i) => i.id === log.id)!;
    }

    // Check if an existing log exists for this medication, scheduledDate, and scheduledTime
    const existingIndex = list.findIndex(
      (item) =>
        item.medicationId === log.medicationId &&
        item.scheduledDate === log.scheduledDate &&
        item.scheduledTime === log.scheduledTime
    );

    if (existingIndex >= 0) {
      const updatedItem: MedicationLog = {
        ...list[existingIndex],
        ...log,
      };
      const updatedList = [...list];
      updatedList[existingIndex] = updatedItem;
      try {
        localStorage.setItem(STORAGE_KEYS.MEDICATION_LOGS, JSON.stringify(updatedList));
      } catch (e) {
        console.error('Failed to update existing medication log', e);
      }
      return updatedItem;
    }

    const newLog: MedicationLog = {
      ...log,
      id: 'medlog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    };
    const updatedList = [newLog, ...list];
    try {
      localStorage.setItem(STORAGE_KEYS.MEDICATION_LOGS, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to save medication log', e);
    }
    return newLog;
  },

  deleteMedicationLog(id: string): void {
    const list = this.getMedicationLogs();
    const updated = list.filter((l) => l.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.MEDICATION_LOGS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete medication log', e);
    }
  },

  exportAllData(): string {
    const data = {
      settings: this.getSettings(),
      moods: this.getMoods(),
      journal: this.getJournalEntries(),
      affirmations: this.getAffirmations(),
      medications: this.getMedications(),
      medicationLogs: this.getMedicationLogs(),
      chatHistory: this.getChatHistory(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  resetAllData(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
