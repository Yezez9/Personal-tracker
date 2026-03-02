import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';
import { Search, Bell, Moon, Sun, Menu, X } from 'lucide-react';
import { searchItems } from '../../utils/helpers';
import Logo from '../Logo';

export default function Header({ onMenuToggle }) {
    const { darkMode, toggleDarkMode } = useTheme();
    const { state, dispatch } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);
    const searchRef = useRef(null);

    const unreadCount = state.notifications.filter(n => !n.read).length;

    // Search across all modules
    const searchResults = searchQuery.length > 1 ? [
        ...searchItems(state.todos, searchQuery, ['title', 'description']).slice(0, 3).map(r => ({ ...r, type: 'task' })),
        ...searchItems(state.courses, searchQuery, ['name', 'code']).slice(0, 3).map(r => ({ ...r, type: 'course' })),
        ...searchItems(state.bookmarks, searchQuery, ['title', 'url']).slice(0, 3).map(r => ({ ...r, type: 'bookmark' })),
        ...searchItems(state.studySets, searchQuery, ['title']).slice(0, 3).map(r => ({ ...r, type: 'studyset' })),
    ] : [];

    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
            if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSearch(false); setSearchQuery(''); }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const navigateToResult = (result) => {
        if (result.type === 'task') dispatch({ type: 'SET_PAGE', payload: 'todos' });
        else if (result.type === 'course') dispatch({ type: 'SET_PAGE', payload: 'courses' });
        else if (result.type === 'bookmark') dispatch({ type: 'SET_PAGE', payload: 'bookmarks' });
        else if (result.type === 'studyset') dispatch({ type: 'SET_PAGE', payload: 'studysets' });
        setSearchQuery('');
        setShowSearch(false);
    };

    return (
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-gray-200 dark:border-border-dark">
            <div className="flex items-center justify-between h-14 px-4">
                {/* Left: menu + logo on mobile */}
                <div className="flex items-center gap-3">
                    <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                        <Menu size={20} className="dark:text-gray-300" />
                    </button>
                    <div className="lg:hidden flex items-center gap-2">
                        <Logo size={28} />
                        <span className="font-bold text-sm text-gradient">TaskTrack</span>
                    </div>
                </div>

                {/* Center: Search */}
                <div ref={searchRef} className="relative flex-1 max-w-md mx-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks, courses, bookmarks..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
                            onFocus={() => setShowSearch(true)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-surface2-dark border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-primary-dark/30 dark:text-txt-dark transition-all"
                        />
                    </div>
                    {showSearch && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-gray-200 dark:border-border-dark overflow-hidden animate-scale-in">
                            {searchResults.map((r, i) => (
                                <button
                                    key={i}
                                    onClick={() => navigateToResult(r)}
                                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 text-sm transition-colors"
                                >
                                    <span className="text-[10px] uppercase font-bold text-gray-400 w-14">{r.type}</span>
                                    <span className="dark:text-txt-dark truncate">{r.title || r.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1">
                    <button onClick={toggleDarkMode} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors lg:hidden">
                        {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-gray-500" />}
                    </button>

                    {/* Notifications */}
                    <div ref={notifRef} className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors relative"
                        >
                            <Bell size={18} className="dark:text-gray-300" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-secondary-light text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-gray-200 dark:border-border-dark animate-scale-in">
                                <div className="p-3 border-b border-gray-100 dark:border-border-dark flex items-center justify-between">
                                    <h3 className="text-sm font-semibold dark:text-txt-dark">Notifications</h3>
                                    {state.notifications.length > 0 && (
                                        <button onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })} className="text-xs text-gray-400 hover:text-red-400 transition-colors">Clear all</button>
                                    )}
                                </div>
                                {state.notifications.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-gray-400">No notifications</div>
                                ) : (
                                    state.notifications.slice(0, 10).map(n => (
                                        <div key={n.id} className="px-3 py-2 border-b border-gray-50 dark:border-border-dark/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-start gap-2">
                                            <span className="text-sm mt-0.5">{n.icon || '🔔'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs dark:text-txt-dark">{n.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(n.timestamp).toLocaleString()}</p>
                                            </div>
                                            <button onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', payload: n.id })} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-0.5">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Avatar */}
                    <button
                        onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}
                        className="ml-1 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                        {state.profile?.avatar ? (
                            <img src={state.profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            state.profile?.name?.charAt(0).toUpperCase() || '?'
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
