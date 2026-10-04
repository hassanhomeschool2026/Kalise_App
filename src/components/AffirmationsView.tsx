import React, { useState, useMemo } from 'react';
import { Heart, RefreshCw, Share2, Sparkles, Check, Bookmark, BookOpen, Copy } from 'lucide-react';
import { Affirmation } from '../types';

interface Props {
  affirmations: Affirmation[];
  onToggleFavorite: (id: string) => void;
}

export const AffirmationsView: React.FC<Props> = ({ affirmations, onToggleFavorite }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'daily' | 'favorites'>('daily');
  const [copied, setCopied] = useState(false);

  const categories = [
    { id: 'all', label: 'All Affirmations' },
    { id: 'boundaries', label: 'Boundaries' },
    { id: 'resilience', label: 'Resilience' },
    { id: 'self-worth', label: 'Self-Worth' },
    { id: 'healing', label: 'Healing' },
    { id: 'calm', label: 'Calm & Stress' },
    { id: 'compassion', label: 'Self-Compassion' },
    { id: 'motivation', label: 'Motivation' },
  ];

  const filteredAffirmations = useMemo(() => {
    if (selectedCategory === 'all') return affirmations;
    return affirmations.filter((a) => a.category === selectedCategory);
  }, [affirmations, selectedCategory]);

  const currentAffirmation = useMemo(() => {
    if (filteredAffirmations.length === 0) return affirmations[0];
    return filteredAffirmations[currentIndex % filteredAffirmations.length];
  }, [filteredAffirmations, currentIndex, affirmations]);

  const favoriteAffirmations = useMemo(() => {
    return affirmations.filter((a) => a.isFavorite);
  }, [affirmations]);

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handleShare = async (affirmation: Affirmation) => {
    const textToShare = `"${affirmation.text}"\n- Kalise Emotional Wellness`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Affirmation from Kalise',
          text: textToShare,
        });
        return;
      } catch {
        // Fallback to clipboard if share cancelled
      }
    }

    try {
      await navigator.clipboard.writeText(textToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  };

  return (
    <div className="space-y-6 pb-24 pt-2 animate-in fade-in duration-300">
      {/* Header & Sub-navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-serif">Daily Affirmations</h1>
          <p className="text-xs text-slate-400 mt-0.5">Realistic, mature, and grounding encouragement.</p>
        </div>

        <div className="flex p-1 rounded-2xl bg-slate-800/80 border border-slate-700">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewMode('favorites')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              viewMode === 'favorites'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3 h-3" />
            Saved ({favoriteAffirmations.length})
          </button>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <div className="space-y-5">
          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Primary Featured Affirmation Card */}
          <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-6 shadow-2xl overflow-hidden min-h-[340px] flex flex-col justify-between">
            {/* Ambient tranquil glowing element */}
            <div className="absolute top-0 right-0 w-52 h-52 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                  {currentAffirmation.category}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onToggleFavorite(currentAffirmation.id)}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      currentAffirmation.isFavorite
                        ? 'text-rose-400 bg-rose-500/15'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={currentAffirmation.isFavorite ? 'Saved to favorites' : 'Save to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${currentAffirmation.isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => handleShare(currentAffirmation)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Share or copy affirmation"
                  >
                    {copied ? <Check className="w-4 h-4 text-teal-400" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Main Affirmation Statement */}
              <div className="my-8 text-center px-2">
                <blockquote className="text-xl md:text-2xl font-serif text-slate-100 leading-relaxed tracking-tight">
                  "{currentAffirmation.text}"
                </blockquote>
              </div>
            </div>

            {/* Mindful reflection box */}
            <div className="pt-4 border-t border-slate-800/80">
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Reflection to sit with:
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {currentAffirmation.reflectionPrompt}
                </p>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => handleShare(currentAffirmation)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied to clipboard' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition cursor-pointer shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Next Affirmation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Saved Favorites Tab */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-200">Your Saved Affirmations</p>
              <p className="text-[11px] text-slate-400">Words you found solace or grounding in.</p>
            </div>
            <button
              onClick={() => setViewMode('daily')}
              className="text-xs text-teal-300 hover:underline cursor-pointer"
            >
              Browse more
            </button>
          </div>

          {favoriteAffirmations.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800">
              <Bookmark className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">No saved affirmations yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Tap the heart on any affirmation that resonates to keep it in your personal sanctuary.
              </p>
              <button
                onClick={() => setViewMode('daily')}
                className="mt-4 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-semibold text-xs transition cursor-pointer"
              >
                Explore Daily Affirmations
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteAffirmations.map((aff) => (
                <div
                  key={aff.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                      {aff.category}
                    </span>
                    <button
                      onClick={() => onToggleFavorite(aff.id)}
                      className="p-1 rounded-lg text-rose-400 hover:text-slate-400 transition cursor-pointer"
                      title="Remove from favorites"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  <blockquote className="text-sm font-serif text-slate-100 leading-relaxed">
                    "{aff.text}"
                  </blockquote>

                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 italic">
                    {aff.reflectionPrompt}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
