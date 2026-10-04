import React, { useState, useMemo } from 'react';
import {
  Pill,
  Plus,
  Check,
  Clock,
  RotateCcw,
  SkipForward,
  AlertCircle,
  HelpCircle,
  Bell,
  BellOff,
  Edit2,
  Trash2,
  Calendar,
  ChevronRight,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Medication,
  MedicationLog,
  MedicationFrequency,
  MedicationLogStatus,
  UserSettings,
} from '../types';
import {
  ScheduledDoseItem,
  getScheduledDosesForDate,
  calculateHistoryStats,
  formatTime12Hour,
  getLocalDateString,
  requestNotificationPermission,
} from '../services/medicationService';

interface Props {
  medications: Medication[];
  logs: MedicationLog[];
  settings: UserSettings;
  onSaveMedication: (
    med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => void;
  onDeleteMedication: (id: string) => void;
  onToggleMedicationActive: (id: string) => void;
  onRecordMedicationAction: (
    medication: Medication,
    scheduledDate: string,
    scheduledTime: string,
    action: 'taken' | 'skipped' | 'snooze',
    snoozeMinutes?: number
  ) => void;
  onDeleteMedicationLog: (id: string) => void;
  onUpdateSettings: (settings: UserSettings) => void;
  onClose?: () => void;
}

const FREQUENCY_OPTIONS: Array<{
  value: MedicationFrequency;
  label: string;
  defaultTimes: string[];
}> = [
  { value: 'once-daily', label: 'Once daily', defaultTimes: ['08:30'] },
  { value: 'twice-daily', label: 'Twice daily', defaultTimes: ['08:00', '20:00'] },
  { value: 'three-times-daily', label: 'Three times daily', defaultTimes: ['08:00', '14:00', '20:00'] },
  { value: 'every-x-hours', label: 'Every X hours', defaultTimes: ['08:00', '14:00', '20:00'] },
  { value: 'specific-days', label: 'Specific days of week', defaultTimes: ['09:00'] },
  { value: 'as-needed', label: 'As needed', defaultTimes: [] },
];

const DAYS_OF_WEEK = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
];

export const MedicationsView: React.FC<Props> = ({
  medications,
  logs,
  settings,
  onSaveMedication,
  onDeleteMedication,
  onToggleMedicationActive,
  onRecordMedicationAction,
  onDeleteMedicationLog,
  onUpdateSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'all' | 'history'>('schedule');

  // Confirmation banner state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('once-daily');
  const [reminderTimes, setReminderTimes] = useState<string[]>(['08:30']);
  const [specificDays, setSpecificDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);

  // Snooze popover state for a dose
  const [snoozeDoseKey, setSnoozeDoseKey] = useState<string | null>(null);

  // History filters
  const [historyMedFilter, setHistoryMedFilter] = useState<string>('all');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<'7d' | '30d' | '90d'>('7d');

  // Today's schedule calculation
  const todayDateStr = getLocalDateString();
  const todayDoses = useMemo(() => {
    return getScheduledDosesForDate(medications, logs, todayDateStr);
  }, [medications, logs, todayDateStr]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const days = historyTimeFilter === '7d' ? 7 : historyTimeFilter === '30d' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return logs.filter((log) => {
      const logTime = new Date(`${log.scheduledDate}T${log.scheduledTime}:00`).getTime();
      const inTimeRange = logTime >= cutoff;
      const matchesMed = historyMedFilter === 'all' || log.medicationId === historyMedFilter;
      return inTimeRange && matchesMed;
    });
  }, [logs, historyTimeFilter, historyMedFilter]);

  const historyStats = useMemo(() => {
    return calculateHistoryStats(filteredHistory);
  }, [filteredHistory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleOpenAddModal = () => {
    setEditingMedication(null);
    setName('');
    setDose('');
    setNotes('');
    setFrequency('once-daily');
    setReminderTimes(['08:30']);
    setSpecificDays([1, 2, 3, 4, 5]);
    setStartDate(getLocalDateString());
    setEndDate('');
    setHasEndDate(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (med: Medication) => {
    setEditingMedication(med);
    setName(med.name);
    setDose(med.dose || '');
    setNotes(med.notes || '');
    setFrequency(med.frequency);
    setReminderTimes(med.reminderTimes.length > 0 ? [...med.reminderTimes] : ['08:30']);
    setSpecificDays(med.frequencyDetails?.daysOfWeek || [1, 2, 3, 4, 5]);
    setStartDate(med.startDate || getLocalDateString());
    setEndDate(med.endDate || '');
    setHasEndDate(Boolean(med.endDate));
    setIsModalOpen(true);
  };

  const handleSaveMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveMedication({
      id: editingMedication?.id,
      name: name.trim(),
      dose: dose.trim() || undefined,
      notes: notes.trim() || undefined,
      frequency,
      frequencyDetails:
        frequency === 'specific-days'
          ? { daysOfWeek: specificDays }
          : undefined,
      reminderTimes: frequency === 'as-needed' ? reminderTimes : reminderTimes.sort(),
      startDate: startDate || undefined,
      endDate: hasEndDate && endDate ? endDate : undefined,
      active: editingMedication ? editingMedication.active : true,
    });

    setIsModalOpen(false);
    showToast(editingMedication ? 'Medication updated.' : 'Medication added.');
  };

  const handleAddTimeInput = () => {
    setReminderTimes((prev) => [...prev, '12:00']);
  };

  const handleRemoveTimeInput = (index: number) => {
    if (reminderTimes.length <= 1) return;
    setReminderTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index: number, val: string) => {
    setReminderTimes((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const toggleDayOfWeek = (d: number) => {
    setSpecificDays((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d].sort()
    );
  };

  const handleFrequencyChange = (newFreq: MedicationFrequency) => {
    setFrequency(newFreq);
    const opt = FREQUENCY_OPTIONS.find((f) => f.value === newFreq);
    if (opt && opt.defaultTimes.length > 0) {
      setReminderTimes(opt.defaultTimes);
    }
  };

  const handleActionTaken = (item: ScheduledDoseItem) => {
    onRecordMedicationAction(item.medication, item.scheduledDate, item.scheduledTime, 'taken');
    showToast('Medication recorded as taken.');
  };

  const handleActionSkip = (item: ScheduledDoseItem) => {
    onRecordMedicationAction(item.medication, item.scheduledDate, item.scheduledTime, 'skipped');
    showToast('Recorded as skipped.');
  };

  const handleActionSnooze = (item: ScheduledDoseItem, minutes: number) => {
    onRecordMedicationAction(
      item.medication,
      item.scheduledDate,
      item.scheduledTime,
      'snooze',
      minutes
    );
    setSnoozeDoseKey(null);
    showToast(`Reminder snoozed for ${minutes} minutes.`);
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    onUpdateSettings({
      ...settings,
      medicationRemindersEnabled: permission === 'granted',
      notificationPermission: permission,
    });

    if (permission === 'granted') {
      showToast('Notifications enabled for reminders.');
    } else if (permission === 'denied') {
      showToast('Notifications were declined in browser.');
    }
  };

  return (
    <div className="space-y-6 pb-24 pt-2 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-teal-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-serif">
              Medications &amp; Reminders
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Personal organization to help you remember without pressure.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Top Tab Switcher */}
      <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-1.5 rounded-xl font-medium transition cursor-pointer text-center ${
            activeTab === 'schedule'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Today's Schedule ({todayDoses.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1.5 rounded-xl font-medium transition cursor-pointer text-center ${
            activeTab === 'all'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          My Medications ({medications.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 rounded-xl font-medium transition cursor-pointer text-center ${
            activeTab === 'history'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          History
        </button>
      </div>

      {/* Notification Banner */}
      {settings.notificationPermission !== 'granted' && (
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-start gap-3 text-xs shadow-md">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-slate-200">Quiet Browser Reminders</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enable notifications to receive gentle reminders when a medication is scheduled. You
              can pause or disable this anytime.
            </p>
            <div className="pt-1.5 flex items-center gap-3">
              <button
                onClick={handleEnableNotifications}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Enable Reminders
              </button>
              <span className="text-[10px] text-slate-500">
                PWA / Browser capability
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Today's Schedule */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Today ({new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})
              </h2>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1 text-xs text-teal-300 hover:text-teal-200 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Medication</span>
            </button>
          </div>

          {todayDoses.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <Pill className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">No scheduled medications today</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Add your medications or supplements to receive quiet reminders and keep an organized
                personal log.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-teal-500 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Medication
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayDoses.map((item) => {
                const doseKey = `${item.medication.id}-${item.scheduledDate}-${item.scheduledTime}`;
                const isSnoozeOpen = snoozeDoseKey === doseKey;

                return (
                  <div
                    key={doseKey}
                    className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            item.status === 'taken'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : item.status === 'skipped'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : item.status === 'snoozed'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.status === 'not-logged'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          <Pill className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-100">{item.medication.name}</h3>
                            {item.medication.dose && (
                              <span className="text-[11px] text-teal-400 font-medium px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">
                                {item.medication.dose}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-medium text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {formatTime12Hour(item.scheduledTime)}
                            </span>
                            {item.medication.notes && (
                              <span className="text-slate-500 truncate max-w-[180px]">
                                {item.medication.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge with accessible Icon + Text */}
                      <div>
                        {item.status === 'taken' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-500/20 text-teal-300 font-bold text-[11px] border border-teal-500/30">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Taken
                          </span>
                        )}
                        {item.status === 'skipped' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 font-medium text-[11px] border border-slate-700">
                            <SkipForward className="w-3 h-3" />
                            Skipped
                          </span>
                        )}
                        {item.status === 'snoozed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-medium text-[11px] border border-amber-500/30">
                            <RotateCcw className="w-3 h-3" />
                            Snoozed
                          </span>
                        )}
                        {item.status === 'not-logged' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-[11px] border border-slate-700">
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                            Not logged
                          </span>
                        )}
                        {item.status === 'due' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-300 text-[11px] border border-sky-500/20">
                            <Bell className="w-3 h-3 text-sky-400" />
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-800/80">
                      {item.status !== 'taken' ? (
                        <>
                          {/* Taken Action Button */}
                          <button
                            onClick={() => handleActionTaken(item)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Mark Taken</span>
                          </button>

                          {/* Snooze Button */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setSnoozeDoseKey(isSnoozeOpen ? null : doseKey)
                              }
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer border border-slate-700"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Snooze</span>
                            </button>

                            {/* Snooze Options Popover */}
                            {isSnoozeOpen && (
                              <div className="absolute right-0 bottom-full mb-1 z-30 w-36 rounded-2xl bg-slate-800 border border-slate-700 shadow-xl p-1.5 space-y-1 animate-in fade-in">
                                <button
                                  onClick={() => handleActionSnooze(item, 10)}
                                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                                >
                                  10 minutes
                                </button>
                                <button
                                  onClick={() => handleActionSnooze(item, 30)}
                                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                                >
                                  30 minutes
                                </button>
                                <button
                                  onClick={() => handleActionSnooze(item, 60)}
                                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                                >
                                  1 hour
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Skip Button */}
                          <button
                            onClick={() => handleActionSkip(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer border border-slate-700/60"
                          >
                            Skip
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between w-full text-xs text-slate-400">
                          <span>
                            Logged at{' '}
                            {item.log?.recordedAt
                              ? new Date(item.log.recordedAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'recorded'}
                          </span>
                          <button
                            onClick={() => handleActionSkip(item)}
                            className="text-[11px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                          >
                            Change to Skipped
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: My Medications */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Configured Medications ({medications.length})
            </h2>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Medication</span>
            </button>
          </div>

          {medications.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <p className="text-sm font-semibold text-slate-300">No medications in your list</p>
              <p className="text-xs text-slate-500">
                You can add medications, supplements, or vitamins to organize your schedule.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Add Your First Medication
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map((med) => {
                const freqLabel =
                  FREQUENCY_OPTIONS.find((f) => f.value === med.frequency)?.label || med.frequency;

                return (
                  <div
                    key={med.id}
                    className={`p-4 rounded-3xl bg-slate-900/90 border space-y-3 transition shadow-sm ${
                      med.active ? 'border-slate-800' : 'border-slate-800/50 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-100">{med.name}</h3>
                          {med.dose && (
                            <span className="text-xs text-teal-400 font-medium px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">
                              {med.dose}
                            </span>
                          )}
                          {!med.active && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                              Paused
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          Frequency: <strong className="text-slate-300">{freqLabel}</strong>
                        </p>

                        {med.reminderTimes && med.reminderTimes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[11px] text-slate-500">Reminders:</span>
                            {med.reminderTimes.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700"
                              >
                                {formatTime12Hour(t)}
                              </span>
                            ))}
                          </div>
                        )}

                        {med.notes && (
                          <p className="text-xs text-slate-400 italic bg-slate-800/40 p-2 rounded-xl mt-2 border border-slate-800">
                            "{med.notes}"
                          </p>
                        )}
                      </div>

                      {/* Action Menu */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleMedicationActive(med.id)}
                          className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
                            med.active
                              ? 'bg-slate-800 text-teal-400 border-teal-500/30 hover:bg-slate-700'
                              : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:text-slate-300'
                          }`}
                          title={med.active ? 'Pause reminders' : 'Resume reminders'}
                        >
                          {med.active ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(med)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                          title="Edit medication"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${med.name}? Historical logs will remain preserved.`)) {
                              onDeleteMedication(med.id);
                              showToast('Medication deleted.');
                            }
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-rose-400 border border-slate-700 transition cursor-pointer"
                          title="Delete medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Time filter buttons */}
            <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
              {(['7d', '30d', '90d'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setHistoryTimeFilter(filter)}
                  className={`px-3 py-1 rounded-xl font-medium transition cursor-pointer ${
                    historyTimeFilter === filter
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>

            {/* Medication selector */}
            <select
              value={historyMedFilter}
              onChange={(e) => setHistoryMedFilter(e.target.value)}
              className="px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 cursor-pointer"
            >
              <option value="all">All Medications</option>
              {medications.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Adherence / Summary Stats */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Log Summary
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {historyStats.totalRecorded} records
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
                <span className="block text-teal-300 font-bold text-sm">
                  {historyStats.takenCount}
                </span>
                <span className="text-[10px] text-slate-400">Taken</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
                <span className="block text-slate-300 font-bold text-sm">
                  {historyStats.skippedCount}
                </span>
                <span className="text-[10px] text-slate-400">Skipped</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
                <span className="block text-amber-300 font-bold text-sm">
                  {historyStats.snoozedCount}
                </span>
                <span className="text-[10px] text-slate-400">Snoozed</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
                <span className="block text-slate-400 font-bold text-sm">
                  {historyStats.notLoggedCount}
                </span>
                <span className="text-[10px] text-slate-400">Not logged</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic text-center">
              This log is purely for personal reference and self-awareness. It does not constitute medical assessment.
            </p>
          </div>

          {/* Historical Log Entries */}
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800">
              <p className="text-sm font-semibold text-slate-300">No logs for this period</p>
              <p className="text-xs text-slate-500 mt-1">
                Records appear here as you log medications as taken, skipped, or snoozed.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        log.status === 'taken'
                          ? 'bg-teal-500/20 text-teal-300'
                          : log.status === 'skipped'
                          ? 'bg-slate-800 text-slate-400'
                          : log.status === 'snoozed'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {log.status === 'taken' && <Check className="w-4 h-4 stroke-[3]" />}
                      {log.status === 'skipped' && <SkipForward className="w-3.5 h-3.5" />}
                      {log.status === 'snoozed' && <RotateCcw className="w-3.5 h-3.5" />}
                      {log.status === 'not-logged' && <HelpCircle className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-200">{log.medicationName}</strong>
                        {log.dose && <span className="text-[11px] text-slate-400">({log.dose})</span>}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{log.scheduledDate}</span>
                        <span>•</span>
                        <span>Scheduled: {formatTime12Hour(log.scheduledTime)}</span>
                        {log.recordedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Recorded:{' '}
                              {new Date(log.recordedAt).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                        log.status === 'taken'
                          ? 'bg-teal-500/20 text-teal-300'
                          : log.status === 'skipped'
                          ? 'bg-slate-800 text-slate-300'
                          : log.status === 'snoozed'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {log.status === 'not-logged' ? 'Not logged' : log.status}
                    </span>

                    <button
                      onClick={() => onDeleteMedicationLog(log.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                      title="Delete log entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Medication Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl no-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-400" />
                <h2 className="text-base font-bold text-slate-100 font-serif">
                  {editingMedication ? 'Edit Medication' : 'Add a Medication'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMedication} className="space-y-4 text-xs">
              {/* Name */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-200">
                  Medication / Supplement Name <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vyvanse, Blood pressure medication, Vitamin D"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500/60"
                />
              </div>

              {/* Dose */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-200">
                  Dose / Strength <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="e.g. 30 mg, 1 tablet, 500 mcg"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500/60"
                />
                <p className="text-[10px] text-slate-500">
                  Stored purely as user information. Kalise never recommends or modifies dosages.
                </p>
              </div>

              {/* Frequency */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-200">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => handleFrequencyChange(e.target.value as MedicationFrequency)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500/60 cursor-pointer"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specific Days Picker */}
              {frequency === 'specific-days' && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700">
                  <label className="block font-semibold text-slate-300">Days of week:</label>
                  <div className="flex gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = specificDays.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => toggleDayOfWeek(d.day)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-teal-500 text-slate-950'
                              : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reminder Times */}
              {frequency !== 'as-needed' && (
                <div className="space-y-2 p-3 rounded-2xl bg-slate-800/60 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200">Reminder Times</label>
                    <button
                      type="button"
                      onClick={handleAddTimeInput}
                      className="text-[11px] text-teal-300 hover:text-teal-200 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Plus className="w-3 h-3" /> Add Time
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {reminderTimes.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={t}
                          onChange={(e) => handleTimeChange(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-teal-500/60"
                        />
                        {reminderTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTimeInput(idx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-200">
                  Your Instructions / Notes <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Take with food or glass of water."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500/60 resize-none"
                />
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-300">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-300">End Date</label>
                    <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasEndDate}
                        onChange={(e) => setHasEndDate(e.target.checked)}
                        className="rounded accent-teal-500"
                      />
                      <span>Set end</span>
                    </label>
                  </div>
                  {hasEndDate ? (
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-teal-500/60"
                    />
                  ) : (
                    <p className="text-[11px] text-slate-500 py-1.5">Ongoing</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                >
                  {editingMedication ? 'Update Medication' : 'Save Medication'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
