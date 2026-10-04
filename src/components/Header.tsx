import React from 'react';
import { Heart, Settings as SettingsIcon, Sparkles, Pill } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { UserSettings } from '../types';

interface Props {
  onOpenSettings: () => void;
  onOpenCrisis: () => void;
  onOpenPremium: () => void;
  onOpenMedications?: () => void;
  settings: UserSettings;
}

export const Header: React.FC<Props> = ({
  onOpenSettings,
  onOpenCrisis,
  onOpenPremium,
  onOpenMedications,
  settings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 transition-all">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500/20 to-indigo-500/30 border border-teal-500/30 flex items-center justify-center shadow-xs">
            <svg viewBox="0 0 100 100" className="w-5 h-5 text-teal-300 fill-current">
              <circle cx="50" cy="50" r="12" className="opacity-80" />
              <path d="M 50,15 C 60,30 65,40 50,50 C 35,40 40,30 50,15 Z" className="opacity-70 fill-teal-400" />
              <path d="M 85,50 C 70,60 60,65 50,50 C 60,35 70,40 85,50 Z" className="opacity-70 fill-indigo-400" />
              <path d="M 50,85 C 40,70 35,60 50,50 C 65,60 60,70 50,85 Z" className="opacity-70 fill-teal-400" />
              <path d="M 15,50 C 30,40 40,35 50,50 C 40,65 30,60 15,50 Z" className="opacity-70 fill-indigo-400" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-100 tracking-tight text-base font-serif">Kalise</span>
              {settings.isPremium && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[9px] font-bold text-indigo-300 uppercase tracking-wider">
                  Plus
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton variant="minimal" />

          {/* Quick Medications button */}
          {onOpenMedications && (
            <button
              onClick={onOpenMedications}
              className="p-1.5 rounded-xl text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition cursor-pointer"
              title="Medications & Reminders"
            >
              <Pill className="w-4 h-4" />
            </button>
          )}

          {/* Quick Crisis Lifeline Button */}
          <button
            onClick={onOpenCrisis}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition cursor-pointer"
            title="Crisis Resources & 988 Lifeline"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-400/20" />
            <span className="text-[11px] font-medium hidden xs:inline">Support</span>
          </button>

          {/* Premium trigger if not premium */}
          {!settings.isPremium && (
            <button
              onClick={onOpenPremium}
              className="p-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
              title="Unlock Kalise Plus"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Preferences & Check-in"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
