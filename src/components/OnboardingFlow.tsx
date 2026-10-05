import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Smile,
  Moon,
  BookOpen,
  Pill,
  MessageSquareHeart,
  Check,
  Shield,
  Heart,
} from 'lucide-react';

interface Props {
  userName: string;
  onComplete: (selectedGoals: string[]) => void;
}

const GOAL_OPTIONS = [
  { id: 'moods', label: 'Understanding my moods', icon: Smile },
  { id: 'routines', label: 'Building healthier routines', icon: Moon },
  { id: 'journaling', label: 'Reflecting through journaling', icon: BookOpen },
  { id: 'medications', label: 'Remembering medications & supplements', icon: Pill },
  { id: 'companion', label: 'Having someone to talk things through with', icon: MessageSquareHeart },
];

export const OnboardingFlow: React.FC<Props> = ({ userName, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    onComplete(selectedGoals);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between p-6 max-w-lg mx-auto font-sans animate-in fade-in duration-300">
      {/* Step Indicators */}
      <div className="pt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-teal-400'
                  : s < step
                  ? 'w-4 bg-teal-500/50'
                  : 'w-4 bg-slate-800'
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Step {step} of 4
        </span>
      </div>

      {/* Main Content Area */}
      <div className="my-auto py-8">
        {/* SCREEN 1: WELCOME */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-lg shadow-teal-500/10">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold">
                Welcome to Kalise
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-100 leading-tight">
                A private space to notice how you're feeling.
              </h1>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Reflect on your day, track your moods and sleep, and build a clearer understanding of
              your natural patterns without judgment, pressure, or clinical diagnostic jargon.
            </p>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
              <Shield className="w-5 h-5 text-teal-400 shrink-0" />
              <span>Your reflections and logs remain completely private to your account.</span>
            </div>
          </div>
        )}

        {/* SCREEN 2: WHAT KALISE HELPS WITH */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold">
                Core Features
              </p>
              <h2 className="text-2xl font-bold font-serif text-slate-100">
                What Kalise helps with
              </h2>
              <p className="text-xs text-slate-400">
                Thoughtful, lightweight tools built for self-awareness.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-300 shrink-0">
                  <Smile className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Notice your mood and energy</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Log how you're doing in thirty seconds and see gentle pattern insights.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300 shrink-0">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Track sleep and restfulness</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Distinguish your sleep hours from how rested your body and mind actually feel.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Write privately</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    A safe, uncluttered journal to put thoughts into words.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-300 shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Keep up with medications</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Organize quiet reminders and keep a personal log of when items were taken.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300 shrink-0">
                  <MessageSquareHeart className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Talk things through with Kalise</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    An empathetic, conversational companion whenever you need to decompress.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: WHAT WOULD YOU LIKE KALISE TO HELP WITH? */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold">
                Personalization
              </p>
              <h2 className="text-2xl font-bold font-serif text-slate-100">
                What would you like Kalise to help with?
              </h2>
              <p className="text-xs text-slate-400">
                Choose any that resonate. This is for personalization only and can be changed later.
              </p>
            </div>

            <div className="space-y-2">
              {GOAL_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedGoals.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleGoal(opt.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/15 border-teal-500/50 text-slate-100 shadow-xs'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium">{opt.label}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-teal-500 border-teal-400 text-slate-950'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN 4: MEET KALISE */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-indigo-500/30 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <MessageSquareHeart className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold">
                Your AI Companion
              </p>
              <h2 className="text-2xl font-bold font-serif text-slate-100">Meet Kalise</h2>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Kalise is an adult AI wellness companion designed to help you decompress, reflect on
              difficult moments, and organize your thoughts with empathy and calm presence.
            </p>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <Heart className="w-4 h-4" />
                <span>Important Safety Boundary</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Kalise is an AI companion : not a licensed therapist, psychiatrist, physician, or
                diagnostic tool. It does not provide medical treatment or diagnose conditions. If you
                are ever experiencing a crisis, the 988 Suicide &amp; Crisis Lifeline is always
                accessible within the app.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="pt-4 flex items-center justify-between gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Back
          </button>
        )}

        {step === 3 && (
          <button
            type="button"
            onClick={() => setStep(4)}
            className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer underline underline-offset-4 ml-auto mr-2"
          >
            Skip for now
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
            className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-teal-500/20"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-teal-500/20"
          >
            <span>Let's Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
