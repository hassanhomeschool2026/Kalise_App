import React from 'react';
import { Sparkles, Check, HeartHandshake, Shield, Clock, X, MessageCircle } from 'lucide-react';
import { UserSettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const PremiumModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const handleToggleSubscription = () => {
    const updated: UserSettings = {
      ...settings,
      isPremium: !settings.isPremium,
    };
    onUpdateSettings(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl p-6 text-slate-100 relative overflow-hidden">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-teal-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Adult Emotional Wellness</span>
              <h2 className="text-lg font-bold text-slate-100">Kalise Plus</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close premium modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-300 font-medium">
            A safe, nonjudgmental presence whenever you need to talk.
          </p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Core features like mood tracking, journaling, and daily affirmations are always free. Kalise Plus unlocks deep, unlimited AI conversations.
          </p>
        </div>

        {/* Feature comparison / benefits */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Unlimited AI Companion Conversations</p>
              <p className="text-[11px] text-slate-400">Talk through complex emotions, interpersonal conflicts, and late-night racing thoughts without limits.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="w-7 h-7 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Emotional Pattern Awareness</p>
              <p className="text-[11px] text-slate-400">Kalise remembers your check-in context so you don't have to repeat your story from scratch.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Thoughtful Daily Check-In Prompts</p>
              <p className="text-[11px] text-slate-400">Gentle scheduled check-ins that meet you at your preferred time without guilt or spam.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Strict Privacy &amp; No Ads</p>
              <p className="text-[11px] text-slate-400">Your personal reflections and thoughts belong only to you. Never sold or shared.</p>
            </div>
          </div>
        </div>

        {/* Pricing / Trial tier container */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 text-center">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-2xl font-bold text-white">$9.99</span>
            <span className="text-xs text-slate-400">/ month (Cancel anytime)</span>
          </div>
          <p className="text-[11px] text-teal-400 mt-1 flex items-center justify-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Includes 7-day gentle trial. Zero pressure.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-5 space-y-2">
          <button
            onClick={handleToggleSubscription}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 hover:opacity-95 text-slate-950 font-bold text-xs tracking-wide uppercase transition cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            {settings.isPremium ? 'Deactivate Kalise Plus (Switch to Free)' : 'Start 7-Day Free Trial • Unlock Kalise'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-300 transition cursor-pointer"
          >
            Continue with free wellness tools
          </button>
        </div>
      </div>
    </div>
  );
};
