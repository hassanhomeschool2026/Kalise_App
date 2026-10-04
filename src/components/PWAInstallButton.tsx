import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  variant?: 'minimal' | 'banner' | 'pill';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'minimal' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'pill') {
      return (
        <button
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 transition text-xs font-medium cursor-pointer"
          title="Install Kalise app"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      );
    }

    if (variant === 'banner') {
      return (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/60 to-slate-900/80 border border-teal-500/20 text-slate-200 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-100">Add Kalise to your Home Screen</p>
              <p className="text-xs text-slate-400">Private, fast offline access whenever you need to check in.</p>
            </div>
          </div>
          <button
            onClick={install}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
          >
            Install
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-teal-300 border border-teal-500/20 text-xs font-medium transition cursor-pointer"
        title="Install Kalise App"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-teal-300 border border-teal-500/20 text-xs font-medium transition cursor-pointer"
          title="Add to Home Screen"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add to Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-teal-400" />
                  Install Kalise on iPhone
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p>
                    Tap the <strong className="text-teal-300">Share</strong> icon{' '}
                    <Share className="inline w-3.5 h-3.5 mx-0.5 text-teal-300" /> in Safari's bottom toolbar.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p>
                    Scroll down and tap <strong className="text-teal-300">"Add to Home Screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <p>Tap <strong className="text-teal-300">"Add"</strong> in the top right corner.</p>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-slate-400 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                Once added, Kalise opens full-screen like a native app with your offline reflections preserved.
              </p>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 py-2.5 text-xs font-semibold transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
