import React, { useState } from 'react';
import { Bell, Clock, Sparkles, Shield, Download, Trash2, X, Check, AlertCircle, Pill, ArrowRight } from 'lucide-react';
import { UserSettings } from '../types';
import { storageService } from '../services/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onOpenPremium: () => void;
  onOpenMedications?: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenPremium,
  onOpenMedications,
}) => {
  const [name, setName] = useState(settings.userName || 'Friend');
  const [dailyEnabled, setDailyEnabled] = useState(settings.dailyCheckInEnabled);
  const [dailyTime, setDailyTime] = useState(settings.dailyCheckInTime || '20:30');
  const [savedNotice, setSavedNotice] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: UserSettings = {
      ...settings,
      userName: name.trim() || 'Friend',
      dailyCheckInEnabled: dailyEnabled,
      dailyCheckInTime: dailyTime,
    };
    onUpdateSettings(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('Notifications are not supported by this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotifStatus('Notification access granted! You will receive gentle check-in reminders.');
      new Notification('Kalise', {
        body: 'Hey, how are you feeling today? Take a quiet moment for yourself.',
        icon: '/pwa-192x192.png',
      });
    } else {
      setNotifStatus('Notification permission was declined. You can enable it in browser settings.');
    }
  };

  const handleExportData = () => {
    const jsonStr = storageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalise-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all local Kalise data? This will clear your mood entries, journal logs, and chat history.')) {
      storageService.resetAllData();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-100 no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Preferences &amp; Space Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedNotice && (
          <div className="mt-3 p-2.5 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Preferences saved successfully.</span>
          </div>
        )}

        <div className="mt-4 space-y-5">
          {/* User Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              What should Kalise call you?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex, Sam"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500/60"
            />
          </div>

          {/* Daily Check-In Settings */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-100">Daily Check-In</p>
                  <p className="text-[11px] text-slate-400">Receive a gentle prompt to pause &amp; reflect</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailyEnabled}
                  onChange={(e) => setDailyEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>

            {dailyEnabled && (
              <div className="pt-2 border-t border-slate-700/50 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-teal-400" /> Preferred check-in time:
                  </span>
                  <input
                    type="time"
                    value={dailyTime}
                    onChange={(e) => setDailyTime(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleRequestNotificationPermission}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-700/80 hover:bg-slate-600/80 text-teal-300 text-xs font-medium border border-teal-500/20 transition cursor-pointer"
                  >
                    Enable Browser Notifications
                  </button>
                  {notifStatus && (
                    <p className="mt-1.5 text-[11px] text-teal-300/90 leading-tight">{notifStatus}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Premium Membership Status */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-800/60 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  Plan: {settings.isPremium ? 'Kalise Plus (Active)' : 'Kalise Free'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {settings.isPremium ? 'Unlimited companion dialogue active' : 'Basic mood, journal & affirmations'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenPremium();
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition cursor-pointer"
            >
              {settings.isPremium ? 'Manage' : 'Upgrade'}
            </button>
          </div>

          {/* Medications & Reminders Section */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Pill className="w-4 h-4 text-teal-400" />
                <span>Medications &amp; Reminders</span>
              </div>
              {onOpenMedications && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenMedications();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-medium border border-teal-500/20 transition cursor-pointer flex items-center gap-1"
                >
                  <span>Open List</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Organize personal schedules for your medications, vitamins, or supplements with optional quiet reminders.
            </p>
          </div>

          {/* Privacy & Disclaimer Card */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Adult Wellness &amp; Boundaries</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kalise is an emotional-support companion designed for adults (18+). It is not a licensed therapist, doctor, or medical provider and does not diagnose conditions or prescribe medications.
            </p>
          </div>

          {/* Data Management */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-400">Your Data &amp; Storage</p>
            <div className="flex gap-2">
              <button
                onClick={handleExportData}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Data
              </button>
              <button
                onClick={handleResetData}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs border border-rose-500/20 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-wide transition cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
