import { Medication, MedicationLog, MedicationLogStatus } from '../types';

export interface ScheduledDoseItem {
  medication: Medication;
  scheduledDate: string; // 'YYYY-MM-DD'
  scheduledTime: string; // 'HH:mm'
  status: MedicationLogStatus | 'due';
  log?: MedicationLog;
  isPastDue: boolean;
  isSnoozed: boolean;
  snoozedUntil?: string;
}

export interface MedicationHistorySummary {
  totalRecorded: number;
  takenCount: number;
  skippedCount: number;
  snoozedCount: number;
  notLoggedCount: number;
  takenPercentage: number;
}

/**
 * Returns formatted local date string 'YYYY-MM-DD'
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns formatted 12-hour display string for a time like "08:30" -> "8:30 AM"
 */
export function formatTime12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const hour = parseInt(hStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${mStr} ${ampm}`;
}

/**
 * Computes today's scheduled doses for all active medications, matching against recorded logs.
 */
export function getScheduledDosesForDate(
  medications: Medication[],
  logs: MedicationLog[],
  targetDate: string = getLocalDateString()
): ScheduledDoseItem[] {
  const targetDateObj = new Date(`${targetDate}T00:00:00`);
  const dayOfWeek = targetDateObj.getDay(); // 0 is Sunday, 6 is Saturday
  const now = new Date();
  const isToday = targetDate === getLocalDateString(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const doses: ScheduledDoseItem[] = [];

  medications.forEach((med) => {
    if (!med.active) return;

    // Check date range
    if (med.startDate && med.startDate > targetDate) return;
    if (med.endDate && med.endDate < targetDate) return;

    // Check specific days frequency
    if (med.frequency === 'specific-days' && med.frequencyDetails?.daysOfWeek) {
      if (!med.frequencyDetails.daysOfWeek.includes(dayOfWeek)) {
        return;
      }
    }

    // Process reminder times
    const times = med.reminderTimes && med.reminderTimes.length > 0 ? med.reminderTimes : [];

    times.forEach((scheduledTime) => {
      // Find matching log if any
      const existingLog = logs.find(
        (l) =>
          l.medicationId === med.id &&
          l.scheduledDate === targetDate &&
          l.scheduledTime === scheduledTime
      );

      const [h, m] = scheduledTime.split(':').map((num) => parseInt(num, 10));
      const scheduledMinutes = (h || 0) * 60 + (m || 0);

      const isPastDue = isToday ? currentMinutes > scheduledMinutes + 15 : targetDate < getLocalDateString(now);

      let isSnoozed = false;
      let snoozedUntil: string | undefined;

      if (existingLog && existingLog.status === 'snoozed' && existingLog.snoozedUntil) {
        const snoozeDate = new Date(existingLog.snoozedUntil);
        if (snoozeDate.getTime() > now.getTime()) {
          isSnoozed = true;
          snoozedUntil = existingLog.snoozedUntil;
        }
      }

      let status: MedicationLogStatus | 'due' = 'due';
      if (existingLog) {
        status = isSnoozed ? 'snoozed' : existingLog.status;
      } else if (isPastDue) {
        status = 'not-logged';
      }

      doses.push({
        medication: med,
        scheduledDate: targetDate,
        scheduledTime,
        status,
        log: existingLog,
        isPastDue,
        isSnoozed,
        snoozedUntil,
      });
    });
  });

  // Sort chronologically by scheduled time
  return doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

/**
 * Calculates historical compliance stats for a list of logs
 */
export function calculateHistoryStats(logs: MedicationLog[]): MedicationHistorySummary {
  const total = logs.length;
  if (total === 0) {
    return {
      totalRecorded: 0,
      takenCount: 0,
      skippedCount: 0,
      snoozedCount: 0,
      notLoggedCount: 0,
      takenPercentage: 0,
    };
  }

  let taken = 0;
  let skipped = 0;
  let snoozed = 0;
  let notLogged = 0;

  logs.forEach((log) => {
    if (log.status === 'taken') taken++;
    else if (log.status === 'skipped') skipped++;
    else if (log.status === 'snoozed') snoozed++;
    else if (log.status === 'not-logged') notLogged++;
  });

  const decisiveTotal = taken + skipped + notLogged;
  const takenPercentage = decisiveTotal > 0 ? Math.round((taken / decisiveTotal) * 100) : 0;

  return {
    totalRecorded: total,
    takenCount: taken,
    skippedCount: skipped,
    snoozedCount: snoozed,
    notLoggedCount: notLogged,
    takenPercentage,
  };
}

/**
 * Requests browser/PWA notification permission cleanly.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  try {
    return await Notification.requestPermission();
  } catch (e) {
    console.error('Failed to request notification permission', e);
    return 'denied';
  }
}

/**
 * Triggers a polite, non-clinical browser notification for a scheduled medication dose.
 */
export function sendBrowserNotification(medName: string, dose?: string, note?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = 'Medication Reminder';
  const body = dose
    ? `It's time for your scheduled ${medName} (${dose}).`
    : `It's time for your scheduled ${medName}.`;

  try {
    // If Service Worker registration is active, use showNotification for better mobile PWA support
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `med-reminder-${medName}`,
        });
      });
      return;
    }

    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
    });
  } catch (e) {
    console.warn('Could not display browser notification', e);
  }
}
