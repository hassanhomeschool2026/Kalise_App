import { MoodEntry, MoodLevel, EnergyLevel, SleepQuality, RestedLevel } from '../types';

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
  averageRestedScore: number | null;
  restedDistribution: Record<RestedLevel, number>;
  topEmotions: Array<{ name: string; count: number; percentage: number }>;
  topInfluences: Array<{ name: string; count: number; percentage: number }>;
  topObservations: Array<{ name: string; count: number; percentage: number }>;
  keyPatterns: string[];
}

/**
 * Derives neutral, non-diagnostic observational insights strictly from the user's logged data.
 * Adheres to safety instructions: never diagnoses, never labels mania, bipolar, or depression.
 * Avoids premature conclusions and explicitly distinguishes sleep duration from perceived restfulness.
 */
export function generatePatternInsights(entries: MoodEntry[]): PatternInsight[] {
  if (entries.length < 3) {
    return [
      {
        id: 'insight-building-data',
        type: 'general',
        title: 'Building Your History',
        description: "You're still building your history. Keep checking in and Kalise can help you notice patterns over time.",
        supportingDetail: 'Insights become more reliable and helpful after logging several check-ins across different days.',
      },
    ];
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

  // 2. Distinction: Sleep Duration vs Perceived Restfulness
  const entriesWithSleepAndRest = entries.filter(
    (e) => e.sleepHours !== undefined && (e.restedLevel || e.restedScore)
  );

  if (entriesWithSleepAndRest.length >= 3) {
    // Days with longer sleep (>= 7 hrs) but low perceived restfulness
    const longSleepLowRest = entriesWithSleepAndRest.filter(
      (e) =>
        (e.sleepHours || 0) >= 7 &&
        (e.restedLevel === 'unrested' ||
          e.restedLevel === 'very-unrested' ||
          (e.restedScore && e.restedScore <= 2))
    );

    if (longSleepLowRest.length >= 2) {
      insights.push({
        id: 'insight-duration-vs-rest',
        type: 'sleep',
        title: 'Sleep Duration & Perceived Restfulness',
        description: "Your recent entries show lower restfulness on some days despite longer sleep hours.",
        supportingDetail: "Hours slept and how physically or mentally rested you feel do not always align. Stress, sleep quality, and daily routines can influence your morning recovery.",
      });
    }
  }

  // 3. Sleep Restfulness and Mood Observation
  const entriesWithRest = entries.filter((e) => e.restedScore !== undefined || e.restedLevel);
  if (entriesWithRest.length >= 3) {
    const lowRestEntries = entriesWithRest.filter(
      (e) =>
        e.restedLevel === 'very-unrested' ||
        e.restedLevel === 'unrested' ||
        (e.restedScore && e.restedScore <= 2)
    );
    const highRestEntries = entriesWithRest.filter(
      (e) =>
        e.restedLevel === 'rested' ||
        e.restedLevel === 'very-rested' ||
        (e.restedScore && e.restedScore >= 4)
    );

    if (lowRestEntries.length >= 2 && highRestEntries.length >= 1) {
      const avgLowRestMood =
        lowRestEntries.reduce((acc, curr) => acc + curr.score, 0) / lowRestEntries.length;
      const avgHighRestMood =
        highRestEntries.reduce((acc, curr) => acc + curr.score, 0) / highRestEntries.length;

      if (avgHighRestMood > avgLowRestMood + 0.4) {
        insights.push({
          id: 'insight-rest-mood-relation',
          type: 'sleep',
          title: 'Restfulness and Daily Mood',
          description: "Your recent entries show lower restfulness on some days when your mood was lower.",
          supportingDetail: `Average mood was ${avgLowRestMood.toFixed(1)}/5 on days feeling unrested compared to ${avgHighRestMood.toFixed(1)}/5 when waking up rested.`,
        });
      }
    }
  }

  // 4. Energy and Restlessness Observation (Neutral, strictly non-diagnostic)
  const highEnergyRestless = entries.filter(
    (e) =>
      (e.energyLevel === 'high' || e.energyLevel === 'very-high') &&
      ((e.thoughtBehaviors && e.thoughtBehaviors.includes('Restless')) ||
        e.emotions.includes('Restless') ||
        (e.thoughtBehaviors && e.thoughtBehaviors.includes('Racing thoughts')))
  );

  if (highEnergyRestless.length >= 3) {
    insights.push({
      id: 'insight-energy-restless',
      type: 'energy',
      title: 'Energy and Cognitive Rhythm',
      description: "You've logged higher energy and restlessness together several times recently.",
      supportingDetail: "Observing this combination without judgment can help you notice what helps you channel physical or mental energy constructively.",
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

  // 6. Good Mood + Low Energy
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
      averageRestedScore: null,
      restedDistribution: { 'very-unrested': 0, unrested: 0, okay: 0, rested: 0, 'very-rested': 0 },
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

  // Rested score & distribution
  const restedEntries = entries.filter((e) => e.restedScore !== undefined || e.restedLevel);
  const averageRestedScore =
    restedEntries.length > 0
      ? Number(
          (
            restedEntries.reduce((acc, e) => acc + (e.restedScore || 3), 0) / restedEntries.length
          ).toFixed(1)
        )
      : null;

  const restedDistribution: Record<RestedLevel, number> = {
    'very-unrested': 0,
    unrested: 0,
    okay: 0,
    rested: 0,
    'very-rested': 0,
  };
  entries.forEach((e) => {
    if (e.restedLevel) {
      restedDistribution[e.restedLevel] = (restedDistribution[e.restedLevel] || 0) + 1;
    }
  });

  // Top emotions
  const emotionMap: Record<string, number> = {};
  entries.forEach((e) => {
    e.emotions.forEach((em) => {
      emotionMap[em] = (emotionMap[em] || 0) + 1;
    });
  });
  const topEmotions = Object.entries(emotionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  // Top influences
  const influenceMap: Record<string, number> = {};
  entries.forEach((e) => {
    e.influences.forEach((inf) => {
      influenceMap[inf] = (influenceMap[inf] || 0) + 1;
    });
  });
  const topInfluences = Object.entries(influenceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  // Top thoughts / observations
  const obsMap: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.thoughtBehaviors) {
      e.thoughtBehaviors.forEach((ob) => {
        obsMap[ob] = (obsMap[ob] || 0) + 1;
      });
    }
  });
  const topObservations = Object.entries(obsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  // Observational key patterns
  const keyPatterns: string[] = [];
  if (topEmotions.length > 0) {
    keyPatterns.push(
      `Most reported emotional states: ${topEmotions.map((e) => `${e.name} (${e.percentage}%)`).join(', ')}`
    );
  }
  if (averageSleepHours !== null && averageRestedScore !== null) {
    keyPatterns.push(
      `Average recorded sleep duration: ${averageSleepHours} hours; perceived restfulness: ${averageRestedScore}/5`
    );
  } else if (averageSleepHours !== null) {
    keyPatterns.push(`Average recorded sleep duration: ${averageSleepHours} hours`);
  }
  if (topInfluences.length > 0) {
    keyPatterns.push(`Primary context factors: ${topInfluences.map((i) => i.name).join(', ')}`);
  }

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
    averageRestedScore,
    restedDistribution,
    topEmotions,
    topInfluences,
    topObservations,
    keyPatterns,
  };
}
