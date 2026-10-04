import React, { useState } from 'react';
import { BookOpen, Plus, Search, Trash2, Edit3, Shield, Sparkles, MessageSquareHeart, Check, ArrowLeft, Calendar, Clock } from 'lucide-react';
import { JournalEntry } from '../types';

interface Props {
  entries: JournalEntry[];
  onSaveEntry: (entry: { title: string; content: string; promptUsed?: string; tags?: string[] }, id?: string) => void;
  onDeleteEntry: (id: string) => void;
  onShareWithKalise: (text: string) => void;
}

const INSPIRATIONAL_PROMPTS = [
  "What is weighing on your mind today?",
  "What do you need more of right now?",
  "What went well today?",
  "What would you tell a friend going through this?",
  "What are you feeling that you haven't expressed?",
  "Where are you expending energy on things you cannot control?",
  "What is one gentle boundary you could honor for yourself tonight?",
];

export const JournalView: React.FC<Props> = ({
  entries,
  onSaveEntry,
  onDeleteEntry,
  onShareWithKalise,
}) => {
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const startNewEntry = (prompt?: string) => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setSelectedPrompt(prompt);
    setIsWriting(true);
  };

  const startEditEntry = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setSelectedPrompt(entry.promptUsed);
    setIsWriting(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSaveEntry(
      {
        title: title.trim() || 'Untitled Reflection',
        content,
        promptUsed: selectedPrompt,
      },
      editingId || undefined
    );

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsWriting(false);
      setEditingId(null);
      setTitle('');
      setContent('');
      setSelectedPrompt(undefined);
    }, 800);
  };

  const filteredEntries = entries.filter((e) => {
    const q = searchQuery.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-24 pt-2 animate-in fade-in duration-300">
      {/* Writing / Editor Mode */}
      {isWriting ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <button
              onClick={() => setIsWriting(false)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Journal</span>
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-teal-400 font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>Private • Offline Safe</span>
            </div>
          </div>

          {/* Optional Prompt Picker */}
          {!editingId && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-medium">Select a reflective prompt (or write freely):</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {INSPIRATIONAL_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setSelectedPrompt(prompt);
                      if (!title) setTitle(prompt);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition cursor-pointer shrink-0 ${
                      selectedPrompt === prompt
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-medium'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {selectedPrompt && (
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-200 leading-relaxed flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-teal-400">Prompt:</span> {selectedPrompt}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPrompt(undefined)}
                  className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your reflection a name..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60 font-serif"
              />
            </div>

            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write whatever is moving through you. Unfiltered, private, and safe..."
                rows={10}
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60 resize-none leading-relaxed"
                autoFocus
              />
            </div>

            {/* Optional share with Kalise */}
            {content.trim().length > 20 && (
              <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Want to explore these feelings with Kalise?
                </span>
                <button
                  type="button"
                  onClick={() => onShareWithKalise(`I just wrote this in my journal: "${content.slice(0, 300)}...". Can you help me reflect on this?`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium transition cursor-pointer"
                >
                  <MessageSquareHeart className="w-3.5 h-3.5" />
                  Talk with Kalise
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsWriting(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim() || savedSuccess}
                className={`flex-1 py-3 rounded-2xl text-xs font-bold tracking-wide uppercase transition cursor-pointer ${
                  savedSuccess
                    ? 'bg-teal-400 text-slate-950 flex items-center justify-center gap-1.5'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-50'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Saved
                  </>
                ) : (
                  editingId ? 'Update Entry' : 'Save Reflection'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Journal Entries List & Browse View */
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-serif">Private Journal</h1>
              <p className="text-xs text-slate-400 mt-0.5">Your unfiltered thoughts, kept completely private.</p>
            </div>
            <button
              onClick={() => startNewEntry()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition cursor-pointer shadow-lg shadow-teal-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          </div>

          {/* Quick prompt cards to inspire */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <p className="text-xs font-semibold text-slate-200">Writing Inspiration</p>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {INSPIRATIONAL_PROMPTS.slice(0, 4).map((p) => (
                <button
                  key={p}
                  onClick={() => startNewEntry(p)}
                  className="px-3 py-2 rounded-2xl bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 text-xs text-slate-300 text-left shrink-0 max-w-[210px] truncate transition cursor-pointer"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past reflections..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60"
            />
          </div>

          {/* Entries list */}
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">No journal entries found.</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? 'Try clearing your search term.' : 'Begin writing whenever you need to process a feeling.'}
              </p>
              <button
                onClick={() => startNewEntry()}
                className="mt-4 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-semibold text-xs transition cursor-pointer"
              >
                Write an Entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const dateObj = new Date(entry.createdAt);
                const dateFormatted = dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const timeFormatted = dateObj.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={entry.id}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 transition hover:border-slate-700/80 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-100 font-serif">
                          {entry.title}
                        </h2>
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-teal-400" /> {dateFormatted}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" /> {timeFormatted}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditEntry(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                          title="Edit reflection"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Delete reflection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {entry.promptUsed && (
                      <div className="text-[11px] text-teal-300/90 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20 inline-block">
                        Prompt: {entry.promptUsed}
                      </div>
                    )}

                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {entry.content}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={() => startEditEntry(entry)}
                        className="text-[11px] text-teal-300 hover:underline cursor-pointer"
                      >
                        Read full entry &rarr;
                      </button>

                      {/* Explicit button to share with Kalise */}
                      <button
                        onClick={() => onShareWithKalise(`I wrote this reflection: "${entry.content.slice(0, 300)}...". Can you help me explore it?`)}
                        className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition cursor-pointer"
                        title="Share this entry with Kalise"
                      >
                        <MessageSquareHeart className="w-3 h-3" />
                        Explore with Kalise
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
