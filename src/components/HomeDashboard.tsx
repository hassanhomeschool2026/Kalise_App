import React, { useMemo } from 'react';
import {
  MessageSquareHeart,
  Sparkles,
  BookOpen,
  Smile,
  ArrowRight,
  Heart,
  BellRing,
  Pill,
  Check,
  RotateCcw,
  SkipForward,
  Clock,
  Plus,
} from 'lucide-react';
import { MoodEntry, Affirmation, UserSettings, Medication, MedicationLog } from '../types';
import { TabType } from './Navigation';
import { PWAInstallButton } from './PWAInstallButton';
import { getScheduledDosesForDate, formatTime12Hour, getLocalDateString } from '../services/medicationService';

interface Props {
  settings: UserSettings;
  latestMood?: MoodEntry;
  dailyAffirmation: Affirmation;
  medications: Medication[];
  medicationLogs: MedicationLog[];
  onNavigate: (tab: TabType) => void;
  onToggleAffirmationFavorite: (id: string) => void;
  onOpenCheckInPrompt: () => void;
  onOpenCrisis: () => void;
  onOpenMedications: () => void;
  onRecordMedicationAction: (
    medication: Medication,
    scheduledDate: string,
    scheduledTime: string,
    action: 'taken' | 'skipped' | 'snooze',
    snoozeMinutes?: number
  ) => void;
}

export const HomeDashboard: React.FC<Props> = ({
  settings,
  latestMood,
  dailyAffirmation,
  medications,
  medicationLogs,
  onNavigate,
  onToggleAffirmationFavorite,
  onOpenCheckInPrompt,
  onOpenCrisis,
  onOpenMedications,
  onRecordMedicationAction,
}) => {
  // Greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Today's scheduled doses
  const todayDoses = useMemo(() => {
    return getScheduledDosesForDate(medications, medicationLogs, getLocalDateString());
  }, [medications, medicationLogs]);

  const moodColors: Record<string, { bg: string; text: string; glow: string; border: string }> = {
    'very-low': { bg: 'bg-rose-500/15', text: 'text-rose-300', glow: 'shadow-rose-500/20', border: 'border-rose-500/30' },
    low: { bg: 'bg-amber-500/15', text: 'text-amber-300', glow: 'shadow-amber-500/20', border: 'border-amber-500/30' },
    okay: { bg: 'bg-teal-500/15', text: 'text-teal-300', glow: 'shadow-teal-500/20', border: 'border-teal-500/30' },
    good: { bg: 'bg-sky-500/15', text: 'text-sky-300', glow: 'shadow-sky-500/20', border: 'border-sky-500/30' },
    great: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', glow: 'shadow-indigo-500/20', border: 'border-indigo-500/30' },
  };

  return (
    <div className="space-y-6 pb-20 pt-2 animate-in fade-in duration-300">
      {/* PWA banner prompt if installable */}
      <PWAInstallButton variant="banner" />

      {/* Greeting and Presence header */}
      <div className="pt-2">
        <p className="text-xs uppercase tracking-widest text-teal-400/90 font-semibold">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1 font-serif">
          {greeting}, {settings.userName || 'Friend'}.
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Take a slow breath. This is your private space to pause and reflect.
        </p>
      </div>

      {/* 1. Mood Check-in Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-200">How are you feeling right now?</h2>
          </div>
          <button
            onClick={() => onNavigate('mood')}
            className="text-xs text-teal-300 hover:text-teal-200 flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>{latestMood ? 'Update' : 'Check in'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {latestMood ? (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${
                  moodColors[latestMood.level]?.bg || 'bg-teal-500/20'
                } ${moodColors[latestMood.level]?.text || 'text-teal-300'} border ${
                  moodColors[latestMood.level]?.border || 'border-teal-500/30'
                }`}
              >
                <Smile className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Latest recorded mood</p>
                <p className="text-base font-semibold text-slate-100 capitalize">
                  {latestMood.label}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                  {latestMood.emotions.length > 0 && (
                    <span>{latestMood.emotions.slice(0, 2).join(' • ')}</span>
                  )}
                  {latestMood.energyLevel && (
                    <span className="text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded capitalize">
                      {latestMood.energyLevel} energy
                    </span>
                  )}
                  {latestMood.sleepHours && (
                    <span className="text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded">
                      {latestMood.sleepHours}h sleep
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('mood')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              View Log
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <button
              onClick={() => onNavigate('mood')}
              className="w-full py-3 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-wide transition cursor-pointer flex items-center justify-between shadow-lg shadow-teal-500/15"
            >
              <span className="flex items-center gap-2">
                <Smile className="w-4 h-4" />
                <span>Check in</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Medications Card */}
      <div className="rounded-3xl bg-slate-800/80 border border-slate-700/80 p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-teal-500/15 text-teal-300">
              <Pill className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Medications &amp; Reminders
            </h2>
          </div>
          <button
            onClick={onOpenMedications}
            className="text-xs text-teal-300 hover:text-teal-200 font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>{medications.length > 0 ? 'View All' : 'Open'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {medications.length === 0 ? (
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">No reminders yet.</p>
            <button
              onClick={onOpenMedications}
              className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shrink-0 transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add medication</span>
            </button>
          </div>
        ) : todayDoses.length === 0 ? (
          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
            <span>No doses scheduled for today.</span>
            <button
              onClick={onOpenMedications}
              className="text-teal-300 hover:text-teal-200 font-medium"
            >
              Check schedule
            </button>
          </div>
        ) : (
          <div className="mt-3.5 space-y-2">
            {todayDoses.slice(0, 3).map((item) => {
              const doseKey = `${item.medication.id}-${item.scheduledDate}-${item.scheduledTime}`;
              return (
                <div
                  key={doseKey}
                  className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        item.status === 'taken'
                          ? 'bg-teal-500/20 text-teal-300'
                          : item.status === 'skipped'
                          ? 'bg-slate-800 text-slate-400'
                          : item.status === 'snoozed'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-sky-300'
                      }`}
                    >
                      {item.status === 'taken' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      {item.status === 'skipped' && <SkipForward className="w-3 h-3" />}
                      {item.status === 'snoozed' && <RotateCcw className="w-3 h-3" />}
                      {item.status !== 'taken' && item.status !== 'skipped' && item.status !== 'snoozed' && (
                        <Clock className="w-3 h-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-200 truncate">
                        {item.medication.name}
                        {item.medication.dose && (
                          <span className="text-slate-400 font-normal ml-1">({item.medication.dose})</span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.status === 'taken'
                          ? 'Taken'
                          : item.status === 'skipped'
                          ? 'Skipped'
                          : item.status === 'snoozed'
                          ? 'Snoozed'
                          : `Due at ${formatTime12Hour(item.scheduledTime)}`}
                      </p>
                    </div>
                  </div>

                  {item.status !== 'taken' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          onRecordMedicationAction(
                            item.medication,
                            item.scheduledDate,
                            item.scheduledTime,
                            'taken'
                          )
                        }
                        className="px-2.5 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                        title="Mark as Taken"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Taken</span>
                      </button>
                      <button
                        onClick={() =>
                          onRecordMedicationAction(
                            item.medication,
                            item.scheduledDate,
                            item.scheduledTime,
                            'snooze',
                            30
                          )
                        }
                        className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition cursor-pointer"
                        title="Snooze for 30 minutes"
                      >
                        Snooze
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold text-teal-400 pr-1">Recorded</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Kalise Companion Card */}
      <div
        onClick={() => onNavigate('kalise')}
        className="group relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 p-5 shadow-xl hover:border-indigo-500/50 transition cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-teal-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 relative">
              <span className="absolute inset-0 rounded-2xl border border-indigo-400/40 animate-ping opacity-25" />
              <MessageSquareHeart className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 font-serif">Kalise Companion</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Have something on your mind? Kalise is here to listen.
              </p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80 text-slate-300 group-hover:text-teal-300 transition">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-4 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
          <p className="italic text-slate-300/90 truncate mr-2">
            "You don't have to carry every heavy thought by yourself."
          </p>
          <span className="text-[11px] font-medium text-teal-300 shrink-0">Talk now &rarr;</span>
        </div>
      </div>

      {/* 3. Today's Affirmation Card */}
      <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500/15 text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Today's Affirmation</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleAffirmationFavorite(dailyAffirmation.id)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                dailyAffirmation.isFavorite
                  ? 'text-rose-400 bg-rose-500/15'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={dailyAffirmation.isFavorite ? 'Saved to favorites' : 'Save affirmation'}
            >
              <Heart className={`w-4 h-4 ${dailyAffirmation.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => onNavigate('affirmations')}
              className="text-xs text-teal-300 hover:text-teal-200 ml-1 font-medium cursor-pointer"
            >
              More
            </button>
          </div>
        </div>

        <blockquote className="mt-4 text-base font-serif italic text-slate-100 leading-relaxed">
          "{dailyAffirmation.text}"
        </blockquote>

        <div className="mt-3.5 pt-3 border-t border-slate-700/40">
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Mindful Reflection</p>
          <p className="text-xs text-teal-200/90 mt-1 leading-relaxed">
            {dailyAffirmation.reflectionPrompt}
          </p>
        </div>
      </div>

      {/* 4. Quick Journal Prompt */}
      <div className="rounded-3xl bg-slate-800/50 border border-slate-800 p-5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-300 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Private Journal</h3>
            <p className="text-xs text-slate-400">Put words to what you're holding today.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('journal')}
          className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-teal-300 text-xs font-medium border border-slate-600 transition cursor-pointer"
        >
          Write Entry
        </button>
      </div>

      {/* 5. Daily Check-in Status Widget */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <BellRing className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-medium text-slate-200">
              Daily Check-In: {settings.dailyCheckInEnabled ? `Active at ${settings.dailyCheckInTime}` : 'Disabled'}
            </p>
            <p className="text-[11px] text-slate-400">
              {settings.dailyCheckInEnabled
                ? 'Kalise sends a quiet prompt to decompress.'
                : 'Turn on scheduled check-in prompts in settings.'}
            </p>
          </div>
        </div>
        <button
          onClick={onOpenCheckInPrompt}
          className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 font-medium transition cursor-pointer shrink-0"
        >
          Check In Now
        </button>
      </div>

      {/* Gentle crisis safeguard footer note */}
      <div className="pt-2 text-center">
        <button
          onClick={onOpenCrisis}
          className="text-xs text-slate-500 hover:text-slate-400 transition underline underline-offset-4 cursor-pointer"
        >
          Need urgent human support? Access the 988 Suicide &amp; Crisis Lifeline anytime.
        </button>
      </div>
    </div>
  );
};
