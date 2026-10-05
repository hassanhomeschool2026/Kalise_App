export type MoodLevel = 'very-low' | 'low' | 'okay' | 'good' | 'great';

export type EnergyLevel = 'very-low' | 'low' | 'typical' | 'high' | 'very-high';

export type SleepQuality = 'very-poor' | 'poor' | 'okay' | 'good' | 'very-good';

export type RestedLevel = 'very-unrested' | 'unrested' | 'okay' | 'rested' | 'very-rested';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface MoodEntry {
  id: string;
  userId?: string;
  level: MoodLevel;
  score: number; // 1 to 5
  label: string;
  emotions: string[];
  influences: string[];
  // Extended self-awareness parameters
  energyLevel?: EnergyLevel;
  energyScore?: number; // 1 to 5
  sleepQuality?: SleepQuality;
  sleepHours?: number; // Duration of sleep in hours
  restedLevel?: RestedLevel; // How rested user feels (separate from hours)
  restedScore?: number; // 1 to 5
  thoughtBehaviors?: string[];
  note?: string;
  timestamp: string; // ISO date string
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  promptUsed?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Affirmation {
  id: string;
  text: string;
  category: 'resilience' | 'boundaries' | 'self-worth' | 'healing' | 'calm' | 'motivation' | 'compassion';
  reflectionPrompt: string;
  isFavorite?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isCrisis?: boolean;
}

export type MedicationFrequency =
  | 'once-daily'
  | 'twice-daily'
  | 'three-times-daily'
  | 'every-x-hours'
  | 'specific-days'
  | 'as-needed';

export interface Medication {
  id: string;
  userId?: string;
  name: string;
  dose?: string;
  notes?: string;
  frequency: MedicationFrequency;
  frequencyDetails?: {
    hoursInterval?: number;
    daysOfWeek?: number[]; // 0 for Sunday ... 6 for Saturday
  };
  reminderTimes: string[]; // e.g. ['08:00', '20:00']
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string; // 'YYYY-MM-DD'
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MedicationLogStatus = 'taken' | 'skipped' | 'snoozed' | 'not-logged';

export interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  dose?: string;
  scheduledDate: string; // 'YYYY-MM-DD'
  scheduledTime: string; // 'HH:mm'
  status: MedicationLogStatus;
  recordedAt?: string; // ISO string
  snoozedUntil?: string; // ISO string
  reason?: string;
}

export interface UserSettings {
  userId?: string;
  userName: string;
  email?: string;
  dailyCheckInEnabled: boolean;
  dailyCheckInTime: string; // e.g. "20:00"
  lastCheckInDate?: string;
  isPremium: boolean;
  theme: ThemeMode;
  freeMessagesUsed: number;
  medicationRemindersEnabled?: boolean;
  notificationPermission?: 'default' | 'granted' | 'denied';
  onboardingCompleted?: boolean;
  onboardingGoals?: string[];
}

export interface UserProfile {
  id: string; // auth.users id
  preferredName: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  theme: ThemeMode;
  onboardingCompleted: boolean;
  onboardingGoals: string[];
  notificationPreference: 'default' | 'granted' | 'denied';
  medicationReminderEnabled: boolean;
  chatReminderEnabled: boolean;
  chatReminderTime: string;
  updatedAt: string;
}
