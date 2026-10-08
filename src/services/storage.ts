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
  MOODS: 'kalise_mood_entries',
  JOURNAL: 'kalise_journal_entries',
  AFFIRMATIONS: 'kalise_affirmations',
  CHAT: 'kalise_chat_history',
  SETTINGS: 'kalise_user_settings',
  MEDICATIONS: 'kalise_medications',
  MEDICATION_LOGS: 'kalise_medication_logs',
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
  currentUserId: null as string | null,

  setUserId(userId: string | null) {
    this.currentUserId = userId;
  },

  getKey(baseKey: string, userId?: string | null): string {
    const uid = userId !== undefined ? userId : this.currentUserId;
    return uid ? `${baseKey}_v1_${uid}` : `${baseKey}_v1_guest`;
  },

  getSettings(userId?: string | null): UserSettings {
    try {
      const key = this.getKey(STORAGE_KEYS.SETTINGS, userId);
      const data = localStorage.getItem(key);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings, userId?: string | null): void {
    try {
      const key = this.getKey(STORAGE_KEYS.SETTINGS, userId);
      localStorage.setItem(key, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  },

  getMoods(userId?: string | null): MoodEntry[] {
    const isAuth = userId !== undefined ? Boolean(userId) : Boolean(this.currentUserId);
    try {
      const key = this.getKey(STORAGE_KEYS.MOODS, userId);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!isAuth) {
          localStorage.setItem(key, JSON.stringify(SEED_MOODS));
          return SEED_MOODS;
        }
        return [];
      }
      return JSON.parse(data);
    } catch {
      return isAuth ? [] : SEED_MOODS;
    }
  },

  saveMoods(moods: MoodEntry[], userId?: string | null): void {
    try {
      const key = this.getKey(STORAGE_KEYS.MOODS, userId);
      localStorage.setItem(key, JSON.stringify(moods));
    } catch (e) {
      console.error('Failed to save moods', e);
    }
  },

  saveMood(entry: Omit<MoodEntry, 'id' | 'timestamp'>, userId?: string | null): MoodEntry {
    const moods = this.getMoods(userId);
    const newEntry: MoodEntry = {
      ...entry,
      id: 'mood-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...moods];
    this.saveMoods(updated, userId);
    return newEntry;
  },

  deleteMood(id: string, userId?: string | null): void {
    const moods = this.getMoods(userId).filter((m) => m.id !== id);
    this.saveMoods(moods, userId);
  },

  getJournalEntries(userId?: string | null): JournalEntry[] {
    const isAuth = userId !== undefined ? Boolean(userId) : Boolean(this.currentUserId);
    try {
      const key = this.getKey(STORAGE_KEYS.JOURNAL, userId);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!isAuth) {
          localStorage.setItem(key, JSON.stringify(SEED_JOURNAL));
          return SEED_JOURNAL;
        }
        return [];
      }
      return JSON.parse(data);
    } catch {
      return isAuth ? [] : SEED_JOURNAL;
    }
  },

  saveJournalEntries(entries: JournalEntry[], userId?: string | null): void {
    try {
      const key = this.getKey(STORAGE_KEYS.JOURNAL, userId);
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save journal entries', e);
    }
  },

  saveJournalEntry(
    entry: { title: string; content: string; promptUsed?: string; tags?: string[] },
    existingId?: string,
    userId?: string | null
  ): JournalEntry {
    const list = this.getJournalEntries(userId);
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
      this.saveJournalEntries(updated, userId);
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
      this.saveJournalEntries(updated, userId);
      return newEntry;
    }
  },

  deleteJournalEntry(id: string, userId?: string | null): void {
    const updated = this.getJournalEntries(userId).filter((item) => item.id !== id);
    this.saveJournalEntries(updated, userId);
  },

  getAffirmations(userId?: string | null): Affirmation[] {
    try {
      const key = this.getKey(STORAGE_KEYS.AFFIRMATIONS, userId);
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.setItem(key, JSON.stringify(INITIAL_AFFIRMATIONS));
        return INITIAL_AFFIRMATIONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_AFFIRMATIONS;
    }
  },

  toggleAffirmationFavorite(id: string, userId?: string | null): Affirmation[] {
    const list = this.getAffirmations(userId);
    const updated = list.map((a) => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
    try {
      const key = this.getKey(STORAGE_KEYS.AFFIRMATIONS, userId);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update favorite', e);
    }
    return updated;
  },

  getChatHistory(userId?: string | null): ChatMessage[] {
    try {
      const key = this.getKey(STORAGE_KEYS.CHAT, userId);
      const data = localStorage.getItem(key);
      if (!data) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome-1',
          role: 'assistant',
          content: "Welcome. I'm Kalise, your companion for emotional reflection and decompression. Whatever is on your mind, big or small, this is a nonjudgmental space to slow down and talk through it. How are you feeling today?",
          timestamp: new Date().toISOString(),
        };
        const initialChat = [welcomeMessage];
        localStorage.setItem(key, JSON.stringify(initialChat));
        return initialChat;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveChatHistory(history: ChatMessage[], userId?: string | null): void {
    try {
      const key = this.getKey(STORAGE_KEYS.CHAT, userId);
      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  },

  saveChatMessage(message: ChatMessage, userId?: string | null): void {
    const history = this.getChatHistory(userId);
    const updated = [...history, message];
    this.saveChatHistory(updated, userId);
  },

  clearChat(userId?: string | null): void {
    try {
      const key = this.getKey(STORAGE_KEYS.CHAT, userId);
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to clear chat', e);
    }
  },

  getMedications(userId?: string | null): Medication[] {
    const isAuth = userId !== undefined ? Boolean(userId) : Boolean(this.currentUserId);
    try {
      const key = this.getKey(STORAGE_KEYS.MEDICATIONS, userId);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!isAuth) {
          localStorage.setItem(key, JSON.stringify(SEED_MEDICATIONS));
          return SEED_MEDICATIONS;
        }
        return [];
      }
      return JSON.parse(data);
    } catch {
      return isAuth ? [] : SEED_MEDICATIONS;
    }
  },

  saveMedications(meds: Medication[], userId?: string | null): void {
    try {
      const key = this.getKey(STORAGE_KEYS.MEDICATIONS, userId);
      localStorage.setItem(key, JSON.stringify(meds));
    } catch (e) {
      console.error('Failed to save medications', e);
    }
  },

  saveMedication(
    med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    userId?: string | null
  ): Medication {
    const list = this.getMedications(userId);
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
      this.saveMedications(updatedList, userId);
      return updatedList.find((i) => i.id === med.id)!;
    }

    const newMed: Medication = {
      ...med,
      id: 'med-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: now,
      updatedAt: now,
    };
    const updatedList = [newMed, ...list];
    this.saveMedications(updatedList, userId);
    return newMed;
  },

  deleteMedication(id: string, userId?: string | null): void {
    const list = this.getMedications(userId);
    const updated = list.filter((m) => m.id !== id);
    this.saveMedications(updated, userId);
  },

  toggleMedicationActive(id: string, userId?: string | null): Medication[] {
    const list = this.getMedications(userId);
    const updated = list.map((m) => (m.id === id ? { ...m, active: !m.active, updatedAt: new Date().toISOString() } : m));
    this.saveMedications(updated, userId);
    return updated;
  },

  getMedicationLogs(userId?: string | null): MedicationLog[] {
    try {
      const key = this.getKey(STORAGE_KEYS.MEDICATION_LOGS, userId);
      const data = localStorage.getItem(key);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveMedicationLogs(logs: MedicationLog[], userId?: string | null): void {
    try {
      const key = this.getKey(STORAGE_KEYS.MEDICATION_LOGS, userId);
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save medication logs', e);
    }
  },

  saveMedicationLog(log: Omit<MedicationLog, 'id'> & { id?: string }, userId?: string | null): MedicationLog {
    const list = this.getMedicationLogs(userId);
    if (log.id) {
      const updatedList = list.map((item) => (item.id === log.id ? { ...item, ...log } : item));
      this.saveMedicationLogs(updatedList, userId);
      return updatedList.find((i) => i.id === log.id)!;
    }

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
      this.saveMedicationLogs(updatedList, userId);
      return updatedItem;
    }

    const newLog: MedicationLog = {
      ...log,
      id: 'medlog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    };
    const updatedList = [newLog, ...list];
    this.saveMedicationLogs(updatedList, userId);
    return newLog;
  },

  deleteMedicationLog(id: string, userId?: string | null): void {
    const list = this.getMedicationLogs(userId);
    const updated = list.filter((l) => l.id !== id);
    this.saveMedicationLogs(updated, userId);
  },

  exportAllData(userId?: string | null): string {
    const data = {
      settings: this.getSettings(userId),
      moods: this.getMoods(userId),
      journal: this.getJournalEntries(userId),
      affirmations: this.getAffirmations(userId),
      medications: this.getMedications(userId),
      medicationLogs: this.getMedicationLogs(userId),
      chatHistory: this.getChatHistory(userId),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  resetAllData(userId?: string | null): void {
    Object.values(STORAGE_KEYS).forEach((k) => {
      const key = this.getKey(k, userId);
      localStorage.removeItem(key);
    });
  },
};
