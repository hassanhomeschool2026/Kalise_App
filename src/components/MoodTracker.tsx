import React, { useState, useMemo } from 'react';
import {
  Smile,
  Check,
  Trash2,
  Calendar,
  Clock,
  TrendingUp,
  BatteryCharging,
  Moon,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  Info,
  X,
  Zap,
} from 'lucide-react';
import { MoodEntry, MoodLevel, EnergyLevel, SleepQuality, RestedLevel } from '../types';
import {
  generatePatternInsights,
  buildClinicianSummary,
  ClinicianSummaryData,
} from '../services/moodInsights';

interface Props {
  moods: MoodEntry[];
  onSaveMood: (entry: Omit<MoodEntry, 'id' | 'timestamp'>) => void;
  onDeleteMood: (id: string) => void;
}

const MOOD_OPTIONS: Array<{
  level: MoodLevel;
  score: number;
  label: string;
  description: string;
  colorClass: string;
  glowClass: string;
  bgOrb: string;
}> = [
  {
    level: 'very-low',
    score: 1,
    label: 'Very Low',
    description: 'Feeling heavy, depleted, or barely holding on.',
    colorClass: 'text-rose-400',
    glowClass: 'border-rose-500/50 shadow-rose-500/30',
    bgOrb: 'from-rose-500/30 via-slate-900 to-slate-950',
  },
  {
    level: 'low',
    score: 2,
    label: 'Low',
    description: 'Somewhat down, unmotivated, or weighed down.',
    colorClass: 'text-amber-400',
    glowClass: 'border-amber-500/50 shadow-amber-500/30',
    bgOrb: 'from-amber-500/25 via-slate-900 to-slate-950',
  },
  {
    level: 'okay',
    score: 3,
    label: 'Okay',
    description: 'Steady, neutral, getting through the motions.',
    colorClass: 'text-teal-300',
    glowClass: 'border-teal-500/50 shadow-teal-500/30',
    bgOrb: 'from-teal-500/25 via-slate-900 to-slate-950',
  },
  {
    level: 'good',
    score: 4,
    label: 'Good',
    description: 'Pleasantly balanced, capable, and present.',
    colorClass: 'text-sky-300',
    glowClass: 'border-sky-500/50 shadow-sky-500/30',
    bgOrb: 'from-sky-500/25 via-slate-900 to-slate-950',
  },
  {
    level: 'great',
    score: 5,
    label: 'Great',
    description: 'Energized, connected, and feeling fulfilled.',
    colorClass: 'text-indigo-300',
    glowClass: 'border-indigo-500/50 shadow-indigo-500/30',
    bgOrb: 'from-indigo-500/30 via-slate-900 to-slate-950',
  },
];

const ENERGY_OPTIONS: Array<{
  level: EnergyLevel;
  score: number;
  label: string;
  colorClass: string;
}> = [
  { level: 'very-low', score: 1, label: 'Very Low', colorClass: 'text-rose-400' },
  { level: 'low', score: 2, label: 'Low', colorClass: 'text-amber-400' },
  { level: 'typical', score: 3, label: 'Typical', colorClass: 'text-teal-300' },
  { level: 'high', score: 4, label: 'High', colorClass: 'text-sky-300' },
  { level: 'very-high', score: 5, label: 'Very High', colorClass: 'text-indigo-300' },
];

const SLEEP_QUALITY_OPTIONS: Array<{
  quality: SleepQuality;
  label: string;
}> = [
  { quality: 'very-poor', label: 'Very Poor' },
  { quality: 'poor', label: 'Poor' },
  { quality: 'okay', label: 'Okay' },
  { quality: 'good', label: 'Good' },
  { quality: 'very-good', label: 'Very Good' },
];

const RESTED_OPTIONS: Array<{
  level: RestedLevel;
  score: number;
  label: string;
}> = [
  { level: 'very-unrested', score: 1, label: 'Very Unrested' },
  { level: 'unrested', score: 2, label: 'Unrested' },
  { level: 'okay', score: 3, label: 'Okay' },
  { level: 'rested', score: 4, label: 'Rested' },
  { level: 'very-rested', score: 5, label: 'Very Rested' },
];

const EMOTION_TAGS = [
  'Overwhelmed',
  'Anxious',
  'Exhausted',
  'Lonely',
  'Sad',
  'Restless',
  'Irritated',
  'Numb',
  'Grounded',
  'Reflective',
  'Content',
  'Grateful',
  'Relieved',
  'Peaceful',
  'Hopeful',
  'Energized',
];

const INFLUENCE_TAGS = [
  'Work & Career',
  'Sleep Quality',
  'Relationships',
  'Solitude & Quiet',
  'Family',
  'Physical Health',
  'Finances',
  'Daily Routine',
  'Digital Media',
  'Weather',
];

const OBSERVATION_CHIPS = [
  'Racing thoughts',
  'Trouble focusing',
  'Overthinking',
  'Restless',
  'Calm',
  'Motivated',
  'Withdrawn',
  'Social',
  'Irritable',
  'Impulsive',
  'Productive',
  'Overwhelmed',
  'Felt in control',
];

export const MoodTracker: React.FC<Props> = ({ moods, onSaveMood, onDeleteMood }) => {
  // Check-in state
  const [selectedLevel, setSelectedLevel] = useState<MoodLevel>('okay');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedInfluences, setSelectedInfluences] = useState<string[]>([]);
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | undefined>(undefined);
  const [selectedSleepQuality, setSelectedSleepQuality] = useState<SleepQuality | undefined>(undefined);
  const [sleepHours, setSleepHours] = useState<string>('');
  const [selectedRestedLevel, setSelectedRestedLevel] = useState<RestedLevel | undefined>(undefined);
  const [selectedObservations, setSelectedObservations] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  // View state
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d'>('7d');
  const [showEnergyOverlay, setShowEnergyOverlay] = useState(true);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Clinician Summary Modal
  const [showClinicianModal, setShowClinicianModal] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const currentOption = MOOD_OPTIONS.find((m) => m.level === selectedLevel) || MOOD_OPTIONS[2];

  const toggleEmotion = (tag: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleInfluence = (tag: string) => {
    setSelectedInfluences((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleObservation = (chip: string) => {
    setSelectedObservations((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const energyOpt = ENERGY_OPTIONS.find((o) => o.level === selectedEnergy);
    const restedOpt = RESTED_OPTIONS.find((o) => o.level === selectedRestedLevel);
    const parsedSleepHours = sleepHours.trim() ? parseFloat(sleepHours) : undefined;

    onSaveMood({
      level: currentOption.level,
      score: currentOption.score,
      label: currentOption.label,
      emotions: selectedEmotions,
      influences: selectedInfluences,
      energyLevel: selectedEnergy,
      energyScore: energyOpt?.score,
      sleepQuality: selectedSleepQuality,
      sleepHours: Number.isNaN(parsedSleepHours) ? undefined : parsedSleepHours,
      restedLevel: selectedRestedLevel,
      restedScore: restedOpt?.score,
      thoughtBehaviors: selectedObservations.length > 0 ? selectedObservations : undefined,
      note: note.trim() || undefined,
    });

    setJustSaved(true);
    setNote('');
    setSelectedEmotions([]);
    setSelectedInfluences([]);
    setSelectedEnergy(undefined);
    setSelectedSleepQuality(undefined);
    setSelectedRestedLevel(undefined);
    setSleepHours('');
    setSelectedObservations([]);

    setTimeout(() => {
      setJustSaved(false);
      setActiveTab('history');
    }, 1100);
  };

  // Filtered moods based on selected timeframe
  const filteredMoods = useMemo(() => {
    const now = Date.now();
    const daysLimit = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90;
    const cutoff = now - daysLimit * 24 * 60 * 60 * 1000;

    return moods.filter((m) => new Date(m.timestamp).getTime() >= cutoff);
  }, [moods, timeFilter]);

  // Chronologically sorted for trend visualization
  const chronologicalEntries = useMemo(() => {
    return [...filteredMoods].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [filteredMoods]);

  // Derived pattern insights
  const patternInsights = useMemo(() => {
    return generatePatternInsights(filteredMoods);
  }, [filteredMoods]);

  // Clinician summary
  const clinicianData: ClinicianSummaryData = useMemo(() => {
    const label = timeFilter === '7d' ? 'Last 7 Days' : timeFilter === '30d' ? 'Last 30 Days' : 'Last 90 Days';
    return buildClinicianSummary(filteredMoods, label);
  }, [filteredMoods, timeFilter]);

  const handleCopyClinicianSummary = async () => {
    const text = [
      `KALISE MOOD & WELLNESS SUMMARY (${clinicianData.timeframeLabel})`,
      `Date Range: ${clinicianData.startDate || 'N/A'} to ${clinicianData.endDate || 'N/A'}`,
      `Total Recorded Check-Ins: ${clinicianData.totalEntries}`,
      `Average Mood Score: ${clinicianData.averageMood} / 5.0`,
      clinicianData.averageEnergy !== null ? `Average Energy Score: ${clinicianData.averageEnergy} / 5.0` : '',
      clinicianData.averageSleepHours !== null ? `Average Sleep: ${clinicianData.averageSleepHours} hours/night` : '',
      '',
      'MOOD DISTRIBUTION:',
      `Great (5): ${clinicianData.moodDistribution['great'] || 0}`,
      `Good (4): ${clinicianData.moodDistribution['good'] || 0}`,
      `Okay (3): ${clinicianData.moodDistribution['okay'] || 0}`,
      `Low (2): ${clinicianData.moodDistribution['low'] || 0}`,
      `Very Low (1): ${clinicianData.moodDistribution['very-low'] || 0}`,
      '',
      clinicianData.topEmotions.length > 0
        ? `TOP EMOTIONS: ${clinicianData.topEmotions.map((e) => `${e.name} (${e.percentage}%)`).join(', ')}`
        : '',
      clinicianData.topInfluences.length > 0
        ? `TOP INFLUENCES: ${clinicianData.topInfluences.map((i) => `${i.name} (${i.percentage}%)`).join(', ')}`
        : '',
      clinicianData.topObservations.length > 0
        ? `OBSERVATIONS: ${clinicianData.topObservations.map((o) => `${o.name} (${o.percentage}%)`).join(', ')}`
        : '',
      '',
      clinicianData.keyPatterns.length > 0
        ? `NOTABLE DATA PATTERNS:\n${clinicianData.keyPatterns.map((p) => `- ${p}`).join('\n')}`
        : '',
      '',
      'Note: This report is a personal self-reported summary from the Kalise app for discussion with a qualified healthcare provider. It is non-diagnostic.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-6 pb-24 pt-2 animate-in fade-in duration-300">
      {/* Top Header & Tab Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-serif">Emotional Check-In</h1>
          <p className="text-xs text-slate-400 mt-0.5">Honor where you are without judgment.</p>
        </div>

        <div className="flex p-1 rounded-2xl bg-slate-800/80 border border-slate-700">
          <button
            onClick={() => setActiveTab('log')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer ${
              activeTab === 'log'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Check In
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History ({moods.length})
          </button>
        </div>
      </div>

      {activeTab === 'log' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Animated Central Mood Orb */}
          <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-6 overflow-hidden text-center shadow-xl">
            {/* Ambient dynamic radial glow */}
            <div
              className={`absolute inset-0 bg-gradient-to-b ${currentOption.bgOrb} opacity-60 transition-all duration-700 pointer-events-none`}
            />

            <div className="relative z-10">
              <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                Current Feeling
              </span>

              {/* Pulsing Aura */}
              <div className="my-5 flex items-center justify-center">
                <div
                  className={`w-28 h-28 rounded-full border-2 transition-all duration-500 flex items-center justify-center shadow-2xl ${currentOption.glowClass} animate-serene-breathe bg-slate-900/80`}
                >
                  <Smile className={`w-12 h-12 ${currentOption.colorClass} transition-colors duration-500`} />
                </div>
              </div>

              <h2
                className={`text-xl font-bold capitalize ${currentOption.colorClass} transition-colors duration-300 font-serif`}
              >
                {currentOption.label}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                {currentOption.description}
              </p>

              {/* 5-Step Mood Scale Selector */}
              <div className="mt-6 flex items-center justify-between gap-1 max-w-xs mx-auto p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                {MOOD_OPTIONS.map((opt) => {
                  const isSelected = opt.level === selectedLevel;
                  return (
                    <button
                      key={opt.level}
                      type="button"
                      onClick={() => setSelectedLevel(opt.level)}
                      className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? `bg-slate-700 ${opt.colorClass} shadow-md scale-105 border border-slate-600`
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="text-sm">{opt.score}</div>
                      <div className="text-[10px] truncate">{opt.label.split(' ')[0]}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 1. Emotion Tag Picker */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                What emotions are present? <span className="text-slate-500 font-normal">(Optional)</span>
              </span>
              {selectedEmotions.length > 0 && (
                <span className="text-[11px] text-teal-400 font-medium">
                  {selectedEmotions.length} selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {EMOTION_TAGS.map((tag) => {
                const isPicked = selectedEmotions.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleEmotion(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      isPicked
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-medium'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Influence Tag Picker */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                What may have influenced your mood? <span className="text-slate-500 font-normal">(Optional)</span>
              </span>
              {selectedInfluences.length > 0 && (
                <span className="text-[11px] text-teal-400 font-medium">
                  {selectedInfluences.length} selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {INFLUENCE_TAGS.map((tag) => {
                const isPicked = selectedInfluences.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInfluence(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      isPicked
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Energy Tracking (Optional) */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-semibold text-slate-200">How is your energy today?</span>
              </div>
              <span className="text-[11px] text-slate-500 font-normal">Optional</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Energy is physical vitality and focus, distinct from emotional mood.
            </p>

            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {ENERGY_OPTIONS.map((opt) => {
                const isSelected = selectedEnergy === opt.level;
                return (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => setSelectedEnergy(isSelected ? undefined : opt.level)}
                    className={`py-2 px-1 rounded-xl text-xs font-medium text-center transition cursor-pointer ${
                      isSelected
                        ? `bg-slate-800 ${opt.colorClass} border border-teal-500/50 shadow-md font-bold`
                        : 'bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">{opt.score}</div>
                    <div className="text-[10px] truncate mt-0.5">{opt.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Sleep Tracking (Optional) */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-slate-200">How was your sleep?</span>
              </div>
              <span className="text-[11px] text-slate-500 font-normal">Optional</span>
            </div>

            {/* Quality scale */}
            <div className="grid grid-cols-5 gap-1.5">
              {SLEEP_QUALITY_OPTIONS.map((opt) => {
                const isSelected = selectedSleepQuality === opt.quality;
                return (
                  <button
                    key={opt.quality}
                    type="button"
                    onClick={() => setSelectedSleepQuality(isSelected ? undefined : opt.quality)}
                    className={`py-2 px-1 rounded-xl text-xs font-medium text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-md font-bold'
                        : 'bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px] truncate">{opt.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Hours slept input */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-300">Hours slept (duration):</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="e.g. 7.5"
                  className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-right text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60"
                />
                <span className="text-slate-400 text-xs">hrs</span>
              </div>
            </div>

            {/* How rested do you feel? (Distinguishing restfulness from sleep duration) */}
            <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">How rested do you feel?</span>
                <span className="text-[10px] text-slate-500">Perceived restfulness</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                {RESTED_OPTIONS.map((opt) => {
                  const isSelected = selectedRestedLevel === opt.level;
                  return (
                    <button
                      key={opt.level}
                      type="button"
                      onClick={() => setSelectedRestedLevel(isSelected ? undefined : opt.level)}
                      className={`py-2 px-1 rounded-xl text-xs font-medium text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-md font-bold'
                          : 'bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.score}</div>
                      <div className="text-[10px] truncate mt-0.5">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. Thoughts & Behavior Observations (Optional) */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">Anything else you've noticed?</span>
              </div>
              <span className="text-[11px] text-slate-500 font-normal">Optional</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Personal observations to help notice patterns over time. Non-diagnostic.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {OBSERVATION_CHIPS.map((chip) => {
                const isPicked = selectedObservations.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleObservation(chip)}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      isPicked
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Short Reflection Note */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
            <label className="block text-xs font-semibold text-slate-200">
              Short reflection or context <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Felt a wave of relief after finishing that call..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/70 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60 resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={justSaved}
            className={`w-full py-3.5 rounded-2xl font-bold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer shadow-lg ${
              justSaved
                ? 'bg-teal-400 text-slate-950 flex items-center justify-center gap-2'
                : 'bg-gradient-to-r from-teal-500 to-indigo-500 hover:opacity-95 text-slate-950'
            }`}
          >
            {justSaved ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                Saved with Care
              </>
            ) : (
              'Save Mood Entry'
            )}
          </button>
        </form>
      ) : (
        /* History & Patterns View */
        <div className="space-y-5">
          {/* Timeframe selector & Clinician export button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
              {(['7d', '30d', '90d'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1 rounded-xl font-medium transition cursor-pointer ${
                    timeFilter === filter
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowClinicianModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-xs text-teal-300 font-medium transition cursor-pointer"
              title="View formatted summary for doctor or therapist"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Provider Summary</span>
            </button>
          </div>

          {/* Clean Mood Trend Visualization */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  <span>Emotional Rhythm</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {chronologicalEntries.length} check-ins in selected period
                </p>
              </div>

              {/* Overlay toggle */}
              <button
                type="button"
                onClick={() => setShowEnergyOverlay(!showEnergyOverlay)}
                className={`text-[11px] px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 border ${
                  showEnergyOverlay
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Energy overlay</span>
              </button>
            </div>

            {chronologicalEntries.length < 2 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Log at least two check-ins to view your emotional rhythm over time.
              </div>
            ) : (
              <div className="relative pt-3 pb-1">
                {/* SVG Curve chart */}
                <div className="w-full h-40">
                  <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="energyStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>

                    {/* Subtle horizontal grid lines */}
                    {[1, 2, 3, 4, 5].map((level) => {
                      const y = 110 - ((level - 1) / 4) * 90;
                      return (
                        <g key={level}>
                          <line
                            x1="10"
                            y1={y}
                            x2="310"
                            y2={y}
                            stroke="#334155"
                            strokeWidth="0.6"
                            strokeDasharray="3 3"
                          />
                          <text
                            x="4"
                            y={y + 3}
                            fill="#64748b"
                            fontSize="8"
                            textAnchor="end"
                          >
                            {level}
                          </text>
                        </g>
                      );
                    })}

                    {/* Calculate SVG coordinate points */}
                    {(() => {
                      const count = chronologicalEntries.length;
                      const xStep = 300 / Math.max(1, count - 1);

                      const moodPoints = chronologicalEntries.map((e, idx) => {
                        const x = 10 + idx * xStep;
                        const y = 110 - ((e.score - 1) / 4) * 90;
                        return { x, y, entry: e };
                      });

                      const pathD = moodPoints.reduce((acc, p, idx) => {
                        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                      }, '');

                      const fillD = `${pathD} L ${moodPoints[moodPoints.length - 1].x} 110 L ${moodPoints[0].x} 110 Z`;

                      // Energy points if overlay enabled
                      const energyPoints = showEnergyOverlay
                        ? chronologicalEntries
                            .map((e, idx) => {
                              if (!e.energyScore) return null;
                              const x = 10 + idx * xStep;
                              const y = 110 - ((e.energyScore - 1) / 4) * 90;
                              return { x, y, energy: e.energyScore };
                            })
                            .filter(Boolean)
                        : [];

                      const energyPathD = energyPoints.reduce((acc, p, idx) => {
                        return idx === 0 ? `M ${p!.x} ${p!.y}` : `${acc} L ${p!.x} ${p!.y}`;
                      }, '');

                      return (
                        <>
                          {/* Mood Area fill */}
                          <path d={fillD} fill="url(#moodFill)" />

                          {/* Mood Stroke line */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#2dd4bf"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Energy line overlay */}
                          {showEnergyOverlay && energyPathD && (
                            <path
                              d={energyPathD}
                              fill="none"
                              stroke="url(#energyStroke)"
                              strokeWidth="1.8"
                              strokeDasharray="4 3"
                              strokeLinecap="round"
                            />
                          )}

                          {/* Mood Data Dots */}
                          {moodPoints.map((p, idx) => (
                            <circle
                              key={p.entry.id}
                              cx={p.x}
                              cy={p.y}
                              r={hoveredPointIndex === idx ? 5.5 : 3.5}
                              fill="#0f172a"
                              stroke="#2dd4bf"
                              strokeWidth="2"
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredPointIndex(idx)}
                              onClick={() => setHoveredPointIndex(idx)}
                            />
                          ))}

                          {/* Energy Dots */}
                          {showEnergyOverlay &&
                            energyPoints.map((p, idx) => (
                              <circle
                                key={'en-' + idx}
                                cx={p!.x}
                                cy={p!.y}
                                r="2.5"
                                fill="#818cf8"
                              />
                            ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* Point tooltip if selected */}
                {hoveredPointIndex !== null && chronologicalEntries[hoveredPointIndex] && (
                  <div className="mt-2 p-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs flex items-center justify-between animate-in fade-in duration-150">
                    <div>
                      <p className="font-semibold text-slate-100">
                        {new Date(chronologicalEntries[hoveredPointIndex].timestamp).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        : <span className="text-teal-300 capitalize">{chronologicalEntries[hoveredPointIndex].label} ({chronologicalEntries[hoveredPointIndex].score}/5)</span>
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {chronologicalEntries[hoveredPointIndex].energyLevel && (
                          <span>Energy: {chronologicalEntries[hoveredPointIndex].energyLevel}</span>
                        )}
                        {chronologicalEntries[hoveredPointIndex].sleepHours && (
                          <span>Sleep: {chronologicalEntries[hoveredPointIndex].sleepHours}h</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setHoveredPointIndex(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Legend */}
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-teal-400 rounded-full" />
                    <span>Mood</span>
                  </div>
                  {showEnergyOverlay && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-indigo-400 border-dashed border-t rounded-full" />
                      <span>Energy</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Your Patterns (Non-Diagnostic Insights) */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-slate-200">Your Patterns</h3>
              </div>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Self-Awareness
              </span>
            </div>

            {patternInsights.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 text-center">
                <p className="text-xs text-slate-300 font-medium">
                  Keep checking in. As you build your history, Kalise will help you notice patterns.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Insights connect your mood, sleep, energy, and life context over time.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {patternInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1 text-xs"
                  >
                    <p className="font-semibold text-teal-300">{insight.title}</p>
                    <p className="text-slate-200 leading-relaxed">{insight.description}</p>
                    {insight.supportingDetail && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
                        {insight.supportingDetail}
                      </p>
                    )}
                  </div>
                ))}

                <p className="text-[10px] text-slate-500 italic pt-1 text-center">
                  Patterns are personal observations for self-reflection and discussion with your healthcare provider.
                </p>
              </div>
            )}
          </div>

          {/* Individual Entries List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Recorded Entries ({filteredMoods.length})
            </h3>

            {filteredMoods.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800">
                <p className="text-sm text-slate-300 font-medium">No check-ins found in this timeframe.</p>
                <button
                  onClick={() => setActiveTab('log')}
                  className="mt-3 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-semibold text-xs transition cursor-pointer"
                >
                  Record Check-In
                </button>
              </div>
            ) : (
              filteredMoods.map((entry) => {
                const opt = MOOD_OPTIONS.find((m) => m.level === entry.level) || MOOD_OPTIONS[2];
                const dateObj = new Date(entry.timestamp);
                const dateFormatted = dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const timeFormatted = dateObj.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 transition hover:border-slate-700 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm ${opt.colorClass} bg-slate-800 border border-slate-700`}
                        >
                          {entry.score}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100 capitalize">
                            {entry.label} Mood
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-teal-400" /> {dateFormatted}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" /> {timeFormatted}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteMood(entry.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Extended Metrics: Energy & Sleep */}
                    {(entry.energyLevel || entry.sleepQuality || entry.sleepHours !== undefined) && (
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                        {entry.energyLevel && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                            <BatteryCharging className="w-3 h-3 text-teal-400" />
                            <span>Energy: <strong className="capitalize text-teal-300">{entry.energyLevel}</strong></span>
                          </span>
                        )}
                        {(entry.sleepQuality || entry.sleepHours !== undefined) && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                            <Moon className="w-3 h-3 text-sky-400" />
                            <span>
                              Sleep:{' '}
                              <strong className="capitalize text-sky-300">
                                {entry.sleepQuality || ''} {entry.sleepHours ? `(${entry.sleepHours}h)` : ''}
                              </strong>
                            </span>
                          </span>
                        )}
                        {entry.restedLevel && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                            <Sparkles className="w-3 h-3 text-teal-400" />
                            <span>
                              Rested:{' '}
                              <strong className="capitalize text-teal-300">
                                {entry.restedLevel.replace('-', ' ')}
                              </strong>
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Emotions */}
                    {entry.emotions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.emotions.map((em) => (
                          <span
                            key={em}
                            className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 text-[10px] font-medium border border-teal-500/20"
                          >
                            {em}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Influences */}
                    {entry.influences.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.influences.map((inf) => (
                          <span
                            key={inf}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-medium border border-indigo-500/20"
                          >
                            {inf}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Thoughts & Behaviors */}
                    {entry.thoughtBehaviors && entry.thoughtBehaviors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.thoughtBehaviors.map((obs) => (
                          <span
                            key={obs}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] border border-slate-700"
                          >
                            {obs}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Reflection note */}
                    {entry.note && (
                      <p className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 leading-relaxed italic">
                        "{entry.note}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Clinician-Friendly Summary Modal */}
      {showClinicianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl no-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                <h2 className="text-base font-bold text-slate-100">Healthcare Provider Summary</h2>
              </div>
              <button
                onClick={() => setShowClinicianModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-200 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <p>
                This summary provides self-reported data from your personal Kalise check-ins to assist you during appointments with your therapist, psychiatrist, or physician. Non-diagnostic.
              </p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Timeframe</p>
                <p className="text-xs font-bold text-slate-100 mt-0.5">{clinicianData.timeframeLabel}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Check-Ins</p>
                <p className="text-xs font-bold text-slate-100 mt-0.5">{clinicianData.totalEntries}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Avg Mood</p>
                <p className="text-xs font-bold text-teal-300 mt-0.5">{clinicianData.averageMood} / 5</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Avg Sleep</p>
                <p className="text-xs font-bold text-sky-300 mt-0.5">
                  {clinicianData.averageSleepHours ? `${clinicianData.averageSleepHours} hrs` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Mood breakdown */}
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2 text-xs">
              <p className="font-semibold text-slate-200">Mood Frequency:</p>
              <div className="grid grid-cols-5 gap-1.5 text-center text-[11px]">
                <div className="p-2 rounded-xl bg-slate-800 text-rose-300">
                  <span className="block font-bold">{clinicianData.moodDistribution['very-low']}</span>
                  <span className="text-[10px] text-slate-400">Very Low</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800 text-amber-300">
                  <span className="block font-bold">{clinicianData.moodDistribution['low']}</span>
                  <span className="text-[10px] text-slate-400">Low</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800 text-teal-300">
                  <span className="block font-bold">{clinicianData.moodDistribution['okay']}</span>
                  <span className="text-[10px] text-slate-400">Okay</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800 text-sky-300">
                  <span className="block font-bold">{clinicianData.moodDistribution['good']}</span>
                  <span className="text-[10px] text-slate-400">Good</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800 text-indigo-300">
                  <span className="block font-bold">{clinicianData.moodDistribution['great']}</span>
                  <span className="text-[10px] text-slate-400">Great</span>
                </div>
              </div>
            </div>

            {/* Top items */}
            {clinicianData.topEmotions.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-slate-300">Prominent Emotions Reported:</p>
                <div className="flex flex-wrap gap-1.5">
                  {clinicianData.topEmotions.map((e) => (
                    <span
                      key={e.name}
                      className="px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20"
                    >
                      {e.name}: {e.count} times ({e.percentage}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {clinicianData.topInfluences.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-slate-300">Primary Life Context Influences:</p>
                <div className="flex flex-wrap gap-1.5">
                  {clinicianData.topInfluences.map((i) => (
                    <span
                      key={i.name}
                      className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                    >
                      {i.name}: {i.count} times ({i.percentage}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {clinicianData.keyPatterns.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1 text-xs">
                <p className="font-semibold text-teal-300">Key Noticed Relationships:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                  {clinicianData.keyPatterns.map((pat, idx) => (
                    <li key={idx}>{pat}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={handleCopyClinicianSummary}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Copied Summary Text
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Summary Text
                  </>
                )}
              </button>

              <button
                onClick={() => setShowClinicianModal(false)}
                className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
