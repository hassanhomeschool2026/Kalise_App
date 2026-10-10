import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Heart, Shield, RefreshCw, MessageSquareHeart, Lock } from 'lucide-react';
import { ChatMessage, MoodEntry, UserSettings } from '../types';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string, mode: 'Supportive' | 'Listener' | 'Real Talk') => Promise<void>;
  onClearChat: () => void;
  onOpenCrisis: (reason?: string) => void;
  onOpenPremium: () => void;
  settings: UserSettings;
  latestMood?: MoodEntry;
  isLoading: boolean;
}

const STARTER_PROMPTS = [
  "I can't seem to turn off my racing thoughts tonight.",
  "I feel guilty for wanting to set a firm boundary.",
  "Help me unpack why I'm feeling so exhausted.",
  "I had an unsettling interaction and feel misunderstood.",
  "I feel like I'm falling behind everyone else my age.",
];

export const KaliseChat: React.FC<Props> = ({
  messages,
  onSendMessage,
  onClearChat,
  onOpenCrisis,
  onOpenPremium,
  settings,
  latestMood,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [companionMode, setCompanionMode] = useState<'Supportive' | 'Listener' | 'Real Talk'>('Supportive');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isFreeLimitReached = !settings.isPremium && settings.freeMessagesUsed >= 3;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isLoading) return;

    if (isFreeLimitReached) {
      onOpenPremium();
      return;
    }

    setInputText('');
    await onSendMessage(text, companionMode);
  };

  const handlePickStarter = async (starter: string) => {
    if (isLoading) return;
    if (isFreeLimitReached) {
      onOpenPremium();
      return;
    }
    await onSendMessage(starter, companionMode);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[820px] pb-20 pt-2 animate-in fade-in duration-300">
      {/* Top Companion Presence Bar */}
      <div className="p-3.5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between mb-3 shadow-md">
        <div className="flex items-center gap-3">
          {/* Subtle animated breathing orb for Kalise */}
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-indigo-500/30 border border-teal-400/40 flex items-center justify-center animate-serene-breathe">
            <MessageSquareHeart className="w-5 h-5 text-teal-300" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-slate-100 font-serif">Kalise</h2>
              <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full font-medium border border-teal-500/20">
                AI Companion
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {latestMood ? `Aware of your "${latestMood.label}" mood` : 'Present & listening'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenCrisis()}
            className="p-1.5 rounded-xl text-rose-300 hover:bg-rose-500/15 border border-rose-500/20 transition cursor-pointer"
            title="Crisis Resources & 988"
          >
            <Heart className="w-4 h-4 fill-rose-400/20" />
          </button>
          <button
            onClick={onClearChat}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Clear conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Companion Mode Selector */}
      <div className="mb-2.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
        {(['Supportive', 'Listener', 'Real Talk'] as const).map((mode) => {
          const isActive = companionMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setCompanionMode(mode)}
              className={`flex-1 py-1.5 px-2 rounded-xl font-medium transition cursor-pointer text-center ${
                isActive
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {mode}
            </button>
          );
        })}
      </div>

      {/* Free trial messages reminder */}
      {!settings.isPremium && (
        <div className="mb-2 p-2 px-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-300">
          <span>
            Trial: {3 - settings.freeMessagesUsed > 0 ? `${3 - settings.freeMessagesUsed} free trial messages left` : 'Trial messages completed'}
          </span>
          <button
            onClick={onOpenPremium}
            className="font-semibold underline hover:text-white cursor-pointer"
          >
            Unlock Kalise Plus
          </button>
        </div>
      )}

      {/* Chat Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 no-scrollbar">
        {/* Subtle boundary & disclaimer badge */}
        <div className="text-center my-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
            <Shield className="w-3 h-3 text-teal-400" />
            Kalise is an AI wellness companion, not a licensed therapist or physician.
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              <div
                className={`max-w-[86%] rounded-3xl p-4 text-xs md:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-teal-500 text-slate-950 font-medium rounded-tr-xs shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Crisis safeguard trigger if response flagged crisis */}
              {msg.isCrisis && (
                <div className="mt-2 max-w-[86%] p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Immediate Crisis Support Available</span>
                  </div>
                  <p className="mt-1 text-[11px] text-rose-200/90">
                    Please call or text <strong>988</strong> anytime for confidential, free support.
                  </p>
                  <button
                    onClick={() => onOpenCrisis("I detected feelings of immediate crisis in our conversation. Please reach out to someone who can help keep you safe.")}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    View 988 Lifeline &amp; Safety Guide
                  </button>
                </div>
              )}

              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-3 rounded-2xl bg-slate-900/60 border border-slate-800 w-fit">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span className="font-serif italic">Kalise is reflecting...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompts (if chat is short or beginning) */}
      {messages.length <= 2 && (
        <div className="my-2 space-y-1.5">
          <p className="text-[11px] text-slate-400 font-medium">Or explore a prompt to begin:</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePickStarter(prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 whitespace-nowrap transition cursor-pointer shrink-0"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input or Premium Lockout */}
      {isFreeLimitReached ? (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/40 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-indigo-300 text-xs font-semibold">
            <Lock className="w-4 h-4" />
            <span>You've experienced your free trial check-ins</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Upgrade to Kalise Plus for unlimited empathetic conversations, memory of emotional patterns, and scheduled check-ins.
          </p>
          <button
            onClick={onOpenPremium}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            Unlock Kalise Plus (7-Day Trial)
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative mt-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Talk through whatever is happening right now..."
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs md:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-40 transition cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
