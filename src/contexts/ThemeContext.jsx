import React, { createContext, useContext, useState, useEffect } from 'react';
import storage from '../utils/storage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [darkMode, setDarkMode] = useState(() => {
        const saved = storage.get('app_settings');
        if (saved?.theme === 'dark') return true;
        if (saved?.theme === 'light') return false;
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const next = !prev;
            const settings = storage.get('app_settings') || {};
            storage.set('app_settings', { ...settings, theme: next ? 'dark' : 'light' });
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be within ThemeProvider');
    return ctx;
}
