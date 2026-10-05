import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';
import { storageService } from '../services/storage';

interface ThemeContextType {
  theme: ThemeMode;
  effectiveTheme: 'dark' | 'light';
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  effectiveTheme: 'dark',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = storageService.getSettings().theme;
    return saved || 'dark';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(prefers-color-scheme: light)').matches;
  });

  // Listen to system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(!e.matches);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const effectiveTheme: 'dark' | 'light' =
    theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme === 'light' ? 'light' : 'dark';

  // Apply class to html tag and update theme-color meta tag
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (effectiveTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    // Update mobile theme-color meta
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', effectiveTheme === 'light' ? '#f5f7fa' : '#090d16');
    }
  }, [effectiveTheme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    const settings = storageService.getSettings();
    storageService.saveSettings({
      ...settings,
      theme: mode,
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
