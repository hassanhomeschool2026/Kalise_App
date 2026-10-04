import React from 'react';
import { Home, Smile, BookOpen, Sparkles, MessageSquareHeart } from 'lucide-react';

export type TabType = 'home' | 'mood' | 'journal' | 'affirmations' | 'kalise';

interface Props {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const Navigation: React.FC<Props> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'mood', label: 'Mood', icon: Smile },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'affirmations', label: 'Affirmations', icon: Sparkles },
    { id: 'kalise', label: 'Kalise', icon: MessageSquareHeart },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-lg border-t border-slate-800/90 safe-bottom">
      <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as TabType)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer relative ${
                isActive
                  ? 'text-teal-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 w-6 h-1 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
              )}
              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? 'bg-teal-500/15' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-semibold text-slate-100' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
