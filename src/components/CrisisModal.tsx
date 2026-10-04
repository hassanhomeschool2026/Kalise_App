import React, { useState } from 'react';
import { Phone, MessageSquare, Heart, ShieldAlert, X, Wind } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export const CrisisModal: React.FC<Props> = ({ isOpen, onClose, reason }) => {
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-teal-500/30 shadow-2xl p-6 text-slate-100 relative overflow-hidden">
        {/* Subtle tranquil background accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Heart className="w-5 h-5 fill-teal-400/20" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Immediate Support &amp; Care</h2>
              <p className="text-xs text-slate-400">You do not have to carry this alone.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close crisis resources"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {reason && (
          <div className="mt-3.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs leading-relaxed">
            <p className="font-medium">A note from Kalise:</p>
            <p className="mt-1 text-amber-300/90">{reason}</p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {/* 988 Lifeline Card */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-teal-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">Free • Confidential • 24/7</span>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">988 Suicide &amp; Crisis Lifeline</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Immediate human connection with trained crisis counselors across the US and Canada.
                </p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-2">
              <a
                href="tel:988"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
              >
                <Phone className="w-3.5 h-3.5" />
                Call 988
              </a>
              <a
                href="sms:988"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold text-xs border border-slate-600 transition"
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                Text 988
              </a>
            </div>
          </div>

          {/* Crisis Text Line */}
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-200">Crisis Text Line</p>
              <p className="text-[11px] text-slate-400">Text HOME to 741741 to connect with a volunteer</p>
            </div>
            <a
              href="sms:741741?body=HOME"
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-teal-300 text-xs font-medium border border-slate-600 transition"
            >
              Text HOME
            </a>
          </div>

          {/* Emergency / International */}
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">If you are in immediate physical danger:</p>
              <p className="mt-0.5 text-rose-200/90 text-[11px]">
                Please call <strong className="text-white">911</strong> (or your local emergency number: 112 in Europe, 999 in UK) or go to the nearest hospital emergency room.
              </p>
              <a
                href="https://findahelpline.com"
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1.5 text-teal-300 hover:underline text-[11px]"
              >
                Outside the US? Find your international crisis lifeline &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Grounding Breath Tool Toggle */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setShowBreathing(!showBreathing)}
            className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-teal-200 transition cursor-pointer"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>{showBreathing ? 'Hide grounding breath' : 'Need to catch your breath? Try 4-7-8 breathing'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
          >
            I'm safe for now
          </button>
        </div>

        {showBreathing && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-800/90 border border-teal-500/20 text-center animate-in fade-in duration-200">
            <p className="text-xs text-slate-400 mb-2">Follow the rhythm to bring your nervous system back down:</p>
            <div className="w-20 h-20 mx-auto rounded-full bg-teal-500/15 border-2 border-teal-400 flex items-center justify-center animate-serene-breathe">
              <span className="text-xs font-semibold text-teal-200">{breathPhase}</span>
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={() => setBreathPhase('Inhale')}
                className={`px-2.5 py-1 rounded-lg text-[11px] ${breathPhase === 'Inhale' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'}`}
              >
                Inhale (4s)
              </button>
              <button
                onClick={() => setBreathPhase('Hold')}
                className={`px-2.5 py-1 rounded-lg text-[11px] ${breathPhase === 'Hold' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'}`}
              >
                Hold (7s)
              </button>
              <button
                onClick={() => setBreathPhase('Exhale')}
                className={`px-2.5 py-1 rounded-lg text-[11px] ${breathPhase === 'Exhale' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'}`}
              >
                Exhale (8s)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
