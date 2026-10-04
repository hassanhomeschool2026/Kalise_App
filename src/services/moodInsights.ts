import { MoodEntry, MoodLevel, EnergyLevel, SleepQuality } from '../types';

export interface PatternInsight {
  id: string;
  type: 'emotion' | 'sleep' | 'energy' | 'influence' | 'observation' | 'general';
  title: string;
  description: string;
  supportingDetail?: string;
}

export interface ClinicianSummaryData {
  timeframeLabel: string;
  totalEntries: number;
  startDate: string;
  endDate: string;
  averageMood: number;
  moodDistribution: Record<MoodLevel, number>;
  averageEnergy: number | null;
  energyDistribution: Record<EnergyLevel, number>;
  averageSleepHours: number | null;
  sleepQualityDistribution: Record<SleepQuality, number>;
  topEmotions: Array<{ name: string; count: number; percentage: number }>;
  topInfluences: Array<{ name: string; count: number; percentage: number }>;
  topObservations: Array<{ name: string; count: number; percentage: number }>;
  keyPatterns: string[];
}

/**
 * Derives neutral, non-diagnostic observational insights strictly from the user's logged data.
 * Adheres to safety instructions: never diagnoses, never labels mania, bipolar, or depression.
 */
export function generatePatternInsights(entries: MoodEntry[]): PatternInsight[] {
  if (entries.length < 3) {
    return [];
  }

  const insights: PatternInsight[] = [];
  const total = entries.length;

  // 1. Emotion Frequency Patterns
  const emotionCounts: Record<string, number> = {};
  entries.forEach((e) => {
    e.emotions.forEach((em) => {
      emotionCounts[em] = (emotionCounts[em] || 0) + 1;
    });
  });

  const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
  if (sortedEmotions.length > 0) {
    const [topEmotion, topCount] = sortedEmotions[0];
    if (topCount >= 2) {
      insights.push({
        id: 'insight-emotion-top',
        type: 'emotion',
        title: `${topEmotion} Frequency`,
        description: `${topEmotion} has appeared in ${topCount} of your last ${total} entries.`,
        supportingDetail: 'Noticing which feelings return most often can help you identify recurring emotional themes.',
      });
    }
  }

  // 2. Sleep and Mood Relationship
  const entriesWithSleep = entries.filter((e) => e.sleepQuality);
  if (entriesWithSleep.length >= 3) {
    const poorSleepEntries = entriesWithSleep.filter(
      (e) => e.sleepQuality === 'poor' || e.sleepQuality === 'very-poor'
    );
    const goodSleepEntries = entriesWithSleep.filter(
      (e) => e.sleepQuality === 'good' || e.sleepQuality === 'very-good'
    );

    if (poorSleepEntries.length >= 2 && goodSleepEntries.length >= 1) {
      const avgPoorMood =
        poorSleepEntries.reduce((acc, curr) => acc + curr.score, 0) / poorSleepEntries.length;
      const avgGoodMood =
        goodSleepEntries.reduce((acc, curr) => acc + curr.score, 0) / goodSleepEntries.length;

      if (avgGoodMood > avgPoorMood + 0.4) {
        insights.push({
          id: 'insight-sleep-mood',
          type: 'sleep',
          title: 'Sleep and Mood Relationship',
          description: "You have logged lower moods more often on days when you reported poor sleep.",
          supportingDetail: `Average mood was ${avgPoorMood.toFixed(1)}/5 after poor sleep compared to ${avgGoodMood.toFixed(1)}/5 after restful sleep.`,
        });
      }
    }
  }

  // 3. Energy and Restlessness Observation
  const highEnergyRestless = entries.filter(
    (e) =>
      (e.energyLevel === 'high' || e.energyLevel === 'very-high') &&
      ((e.thoughtBehaviors && e.thoughtBehaviors.includes('Restless')) ||
        e.emotions.includes('Restless') ||
        (e.thoughtBehaviors && e.thoughtBehaviors.includes('Racing thoughts')))
  );

  if (highEnergyRestless.length >= 2) {
    insights.push({
      id: 'insight-energy-restless',
      type: 'energy',
      title: 'Energy and Cognitive Rhythm',
      description: "High energy and restlessness have appeared together several times recently.",
      supportingDetail: "Your entries show several days of higher-than-usual energy alongside racing thoughts or physical restlessness. This may be something worth discussing with your healthcare provider.",
    });
  }

  // 4. Low Sleep alongside High Energy
  const lowSleepHighEnergy = entries.filter(
    (e) =>
      (e.energyLevel === 'high' || e.energyLevel === 'very-high') &&
      ((e.sleepHours !== undefined && e.sleepHours <= 5) ||
        e.sleepQuality === 'poor' ||
        e.sleepQuality === 'very-poor')
  );

  if (lowSleepHighEnergy.length >= 2) {
    insights.push({
      id: 'insight-sleep-high-energy',
      type: 'general',
      title: 'Sleep and Energy Patterns',
      description: "You have logged less sleep alongside higher energy several times recently.",
      supportingDetail: "Observing periods where reduced sleep coincides with sustained high energy can be helpful background information to share with your clinician.",
    });
  }

  // 5. Frequent Influences
  const influenceCounts: Record<string, number> = {};
  entries.forEach((e) => {
    e.influences.forEach((inf) => {
      influenceCounts[inf] = (influenceCounts[inf] || 0) + 1;
    });
  });

  const sortedInfluences = Object.entries(influenceCounts).sort((a, b) => b[1] - a[1]);
  if (sortedInfluences.length > 0) {
    const [topInfluence, infCount] = sortedInfluences[0];
    if (infCount >= 2) {
      insights.push({
        id: 'insight-influence-top',
        type: 'influence',
        title: `${topInfluence} Context`,
        description: `${topInfluence} has been one of your most frequently selected influences (${infCount} check-ins).`,
        supportingDetail: 'Contextual awareness helps separate external stressors from internal emotional baseline.',
      });
    }
  }

  // 6. Good Mood + Low Energy or Low Mood + High Energy Nuance
  const goodMoodLowEnergy = entries.filter(
    (e) => (e.score === 4 || e.score === 5) && (e.energyLevel === 'low' || e.energyLevel === 'very-low')
  );
  if (goodMoodLowEnergy.length >= 2) {
    insights.push({
      id: 'insight-mood-energy-decoupling',
      type: 'energy',
      title: 'Contentment in Stillness',
      description: "You have logged several check-ins with good mood alongside low physical energy.",
      supportingDetail: "This reflects peaceful moments of emotional contentment that do not require high physical output.",
    });
  }

  return insights;
}

/**
 * Compiles a structured, clinician-friendly summary suitable for sharing with a doctor or therapist.
 */
export function buildClinicianSummary(
  entries: MoodEntry[],
  timeframeLabel: string
): ClinicianSummaryData {
  const total = entries.length;
  if (total === 0) {
    return {
      timeframeLabel,
      totalEntries: 0,
      startDate: '',
      endDate: '',
      averageMood: 0,
      moodDistribution: { 'very-low': 0, low: 0, okay: 0, good: 0, great: 0 },
      averageEnergy: null,
      energyDistribution: { 'very-low': 0, low: 0, typical: 0, high: 0, 'very-high': 0 },
      averageSleepHours: null,
      sleepQualityDistribution: { 'very-poor': 0, poor: 0, okay: 0, good: 0, 'very-good': 0 },
      topEmotions: [],
      topInfluences: [],
      topObservations: [],
      keyPatterns: [],
    };
  }

  const sortedByDate = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const startDate = new Date(sortedByDate[0].timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endDate = new Date(sortedByDate[sortedByDate.length - 1].timestamp).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  const averageMood = Number((entries.reduce((acc, e) => acc + e.score, 0) / total).toFixed(2));

  const moodDistribution: Record<MoodLevel, number> = {
    'very-low': 0,
    low: 0,
    okay: 0,
    good: 0,
    great: 0,
  };
  entries.forEach((e) => {
    moodDistribution[e.level] = (moodDistribution[e.level] || 0) + 1;
  });

  // Energy distribution & average
  const energyEntries = entries.filter((e) => e.energyScore !== undefined);
  const averageEnergy =
    energyEntries.length > 0
      ? Number(
          (energyEntries.reduce((acc, e) => acc + (e.energyScore || 0), 0) / energyEntries.length).toFixed(2)
        )
      : null;

  const energyDistribution: Record<EnergyLevel, number> = {
    'very-low': 0,
    low: 0,
    typical: 0,
    high: 0,
    'very-high': 0,
  };
  entries.forEach((e) => {
    if (e.energyLevel) {
      energyDistribution[e.energyLevel] = (energyDistribution[e.energyLevel] || 0) + 1;
    }
  });

  // Sleep hours & quality
  const sleepEntries = entries.filter((e) => e.sleepHours !== undefined && e.sleepHours > 0);
  const averageSleepHours =
    sleepEntries.length > 0
      ? Number(
          (sleepEntries.reduce((acc, e) => acc + (e.sleepHours || 0), 0) / sleepEntries.length).toFixed(1)
        )
      : null;

  const sleepQualityDistribution: Record<SleepQuality, number> = {
    'very-poor': 0,
    poor: 0,
    okay: 0,
    good: 0,
    'very-good': 0,
  };
  entries.forEach((e) => {
    if (e.sleepQuality) {
      sleepQualityDistribution[e.sleepQuality] = (sleepQualityDistribution[e.sleepQuality] || 0) + 1;
    }
  });

  // Counts for emotions, influences, observations
  const countItems = (extractor: (e: MoodEntry) => string[] | undefined) => {
    const map: Record<string, number> = {};
    entries.forEach((e) => {
      const items = extractor(e) || [];
      items.forEach((item) => {
        map[item] = (map[item] || 0) + 1;
      });
    });
    return Object.entries(map)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const topEmotions = countItems((e) => e.emotions).slice(0, 6);
  const topInfluences = countItems((e) => e.influences).slice(0, 6);
  const topObservations = countItems((e) => e.thoughtBehaviors).slice(0, 6);

  const keyPatterns = generatePatternInsights(entries).map((i) => i.description);

  return {
    timeframeLabel,
    totalEntries: total,
    startDate,
    endDate,
    averageMood,
    moodDistribution,
    averageEnergy,
    energyDistribution,
    averageSleepHours,
    sleepQualityDistribution,
    topEmotions,
    topInfluences,
    topObservations,
    keyPatterns,
  };
}
