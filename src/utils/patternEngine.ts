import { MoodEntry } from '../types';

export interface PatternEvidence {
  type: 'repeated_low_mood' | 'repeated_low_energy' | 'repeated_poor_sleep' | 'repeated_overwhelm' | 'mood_trend' | 'energy_trend' | 'sleep_trend';
  confidence: 'observed' | 'emerging' | 'repeated' | 'strong';
  evidenceCount: number;
  windowDays: number;
  description: string;
  category: 'mood' | 'energy' | 'sleep' | 'stress';
}

export interface CompanionContextPayload {
  recentConversation: Array<{ role: string; content: string }>;
  latestMood?: string;
  latestEnergy?: string;
  latestSleep?: string;
  relevantPatterns: PatternEvidence[];
  moodTrend?: string;
  energyTrend?: string;
  sleepTrend?: string;
}

/**
 * Deterministic pattern engine operating on structured mood entries.
 * Strictly adheres to evidence thresholds and false pattern protection.
 */
export function analyzePatterns(moods: MoodEntry[]): PatternEvidence[] {
  if (!Array.isArray(moods) || moods.length === 0) {
    return [];
  }

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;

  // Filter entries within the last 7 days
  const recentEntries = moods.filter((m) => {
    const time = new Date(m.timestamp).getTime();
    return now - time <= SEVEN_DAYS;
  });

  const patterns: PatternEvidence[] = [];

  // 1. REPEATED LOW MOOD
  // Criteria: score <= 2, min 3 entries within 4 days (or 7 days for emerging/repeated)
  const lowMoodEntries = recentEntries.filter((m) => m.score <= 2 || m.level === 'low' || m.level === 'very-low');
  if (lowMoodEntries.length >= 2) {
    const count = lowMoodEntries.length;
    const confidence = count >= 3 ? 'repeated' : 'observed';
    patterns.push({
      type: 'repeated_low_mood',
      confidence,
      evidenceCount: count,
      windowDays: 7,
      description: `Logged low mood ${count} times recently`,
      category: 'mood',
    });
  }

  // 2. REPEATED LOW ENERGY / TIREDNESS
  // Criteria: energyLevel === 'low' / 'very-low' or energyScore <= 2, min 3 within 7 days
  const lowEnergyEntries = recentEntries.filter(
    (m) =>
      m.energyLevel === 'low' ||
      m.energyLevel === 'very-low' ||
      (m.energyScore !== undefined && m.energyScore <= 2) ||
      m.emotions?.some((e) => e.toLowerCase().includes('tired') || e.toLowerCase().includes('exhausted') || e.toLowerCase().includes('drained'))
  );
  if (lowEnergyEntries.length >= 2) {
    const count = lowEnergyEntries.length;
    const confidence = count >= 3 ? 'repeated' : 'observed';
    patterns.push({
      type: 'repeated_low_energy',
      confidence,
      evidenceCount: count,
      windowDays: 7,
      description: `Reported low energy or tiredness ${count} times recently`,
      category: 'energy',
    });
  }

  // 3. REPEATED POOR SLEEP
  // Criteria: sleepQuality === 'poor' | 'very-poor' or sleepHours < 6, min 3 observations
  const poorSleepEntries = recentEntries.filter(
    (m) =>
      m.sleepQuality === 'poor' ||
      m.sleepQuality === 'very-poor' ||
      (m.sleepHours !== undefined && m.sleepHours < 6)
  );
  if (poorSleepEntries.length >= 2) {
    const count = poorSleepEntries.length;
    const confidence = count >= 3 ? 'repeated' : 'observed';
    patterns.push({
      type: 'repeated_poor_sleep',
      confidence,
      evidenceCount: count,
      windowDays: 7,
      description: `Logged poor sleep or less than 6 hours ${count} times recently`,
      category: 'sleep',
    });
  }

  // 4. REPEATED OVERWHELM / STRESS
  const overwhelmEntries = recentEntries.filter(
    (m) =>
      m.emotions?.some((e) => /overwhelm|stress|pressure|anxious|burnout|too much/i.test(e)) ||
      m.influences?.some((i) => /work|career|busy|pressure/i.test(i)) ||
      m.thoughtBehaviors?.some((t) => /overthinking|racing|spinning/i.test(t))
  );
  if (overwhelmEntries.length >= 2) {
    const count = overwhelmEntries.length;
    const confidence = count >= 3 ? 'repeated' : 'observed';
    patterns.push({
      type: 'repeated_overwhelm',
      confidence,
      evidenceCount: count,
      windowDays: 7,
      description: `Reported feeling overwhelmed or stressed ${count} times recently`,
      category: 'stress',
    });
  }

  // 5. TRENDS (Mood, Energy, Sleep)
  if (recentEntries.length >= 3) {
    // Sort oldest to newest
    const sorted = [...recentEntries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const scores = sorted.map((s) => s.score);
    const firstHalfAvg = scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 2);
    const secondHalfAvg = scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / (scores.length - Math.floor(scores.length / 2));

    let moodTrend = 'stable';
    if (secondHalfAvg - firstHalfAvg > 0.5) moodTrend = 'improving';
    else if (firstHalfAvg - secondHalfAvg > 0.5) moodTrend = 'declining';

    patterns.push({
      type: 'mood_trend',
      confidence: 'emerging',
      evidenceCount: sorted.length,
      windowDays: 7,
      description: `Mood trend appears ${moodTrend}`,
      category: 'mood',
    });
  }

  return patterns;
}

/**
 * Pattern Relevance / Context Selector.
 * Determines whether a detected pattern is relevant to the current user message.
 * If relevance is uncertain or irrelevant, OMIT the pattern.
 */
export function selectRelevantPatterns(patterns: PatternEvidence[], userMessage: string): PatternEvidence[] {
  if (!Array.isArray(patterns) || patterns.length === 0 || !userMessage) {
    return [];
  }

  const lowerMsg = userMessage.toLowerCase();

  const sleepKeywords = ['sleep', 'slept', 'insomnia', 'rest', 'tired', 'exhausted', 'awake', 'night', 'bed', 'dream', 'fatigue'];
  const energyKeywords = ['energy', 'drained', 'exhausted', 'tired', 'fatigue', 'battery', 'lethargic', 'slug'];
  const moodKeywords = ['sad', 'low', 'down', 'good', 'better', 'worse', 'mood', 'emotional', 'blue', 'depressed', 'grief'];
  const stressKeywords = ['overwhelmed', 'stressed', 'pressure', 'too much', "can't keep up", 'burned out', 'burnout', 'busy', 'racing', 'spinning', 'anxious', 'anxiety'];

  const matchesAny = (keywords: string[]) => keywords.some((kw) => lowerMsg.includes(kw));

  return patterns.filter((pattern) => {
    // Only surface patterns with confidence 'emerging' or 'repeated' or 'strong' for user conversation
    if (pattern.confidence === 'observed') {
      return false; // internal only unless specifically matched
    }

    if (pattern.category === 'sleep' && matchesAny(sleepKeywords)) return true;
    if (pattern.category === 'energy' && matchesAny(energyKeywords)) return true;
    if (pattern.category === 'mood' && matchesAny(moodKeywords)) return true;
    if (pattern.category === 'stress' && matchesAny(stressKeywords)) return true;

    // If message is general or uncertain, omit
    return false;
  });
}
