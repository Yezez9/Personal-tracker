import React from 'react';
import Logo from '../Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';
import { getCoinWallet, getLevel } from '../../utils/coinService';
import {
    Home, CheckSquare, FolderOpen, CalendarDays, Calendar,
    BookOpen, Bookmark, Timer, Bot, Settings, Moon, Sun, LogOut
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'todos', label: 'To-Do List', icon: CheckSquare },
    { id: 'courses', label: 'Course Folders', icon: FolderOpen },
    { id: 'schedule', label: 'Class Schedule', icon: CalendarDays },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'studysets', label: 'Study Sets', icon: BookOpen },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'countdowns', label: 'Countdowns', icon: Timer },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
];

export default function Sidebar({ collapsed, onToggle }) {
    const { darkMode, toggleDarkMode } = useTheme();
    const { state, dispatch } = useApp();
    const wallet = getCoinWallet();
    const level = getLevel(wallet.totalCoins);

    return (
        <aside className={`fixed left-0 top-0 h-full z-40 bg-white dark:bg-surface-dark border-r border-gray-200 dark:border-border-dark transition-all duration-300 flex flex-col
      ${collapsed ? 'w-[70px]' : 'w-[250px]'} hidden lg:flex`}>

            {/* Logo */}
            <div className="p-4 flex items-center gap-3 border-b border-gray-100 dark:border-border-dark">
                <Logo size={40} className="flex-shrink-0" />
                {!collapsed && (
                    <div className="animate-fade-in">
                        <h1 className="text-lg font-bold text-gradient">TaskTrack</h1>
                        <p className="text-[10px] text-gray-400 -mt-1">Academic Organizer</p>
                    </div>
                )}
            </div>

            {/* Profile mini card */}
            {state.profile && !collapsed && (
                <div className="mx-3 mt-3 p-3 rounded-xl bg-gray-50 dark:bg-surface2-dark animate-fade-in">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {state.profile.avatar ? (
                                <img src={state.profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                state.profile.name?.charAt(0).toUpperCase() || '?'
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold truncate dark:text-txt-dark">{state.profile.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{level.badge} {level.name}</p>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/10">
                        <span className="text-xs">🪙</span>
                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{wallet.totalCoins}</span>
                        <span className="text-[9px] text-gray-400 ml-auto">coins</span>
                    </div>
                </div>
            )}

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const active = state.currentPage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => dispatch({ type: 'SET_PAGE', payload: item.id })}
                            className={`nav-item w-full ${active ? 'active' : 'text-gray-600 dark:text-gray-400'} ${collapsed ? 'justify-center px-2' : ''}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={18} className={active ? 'text-primary-light dark:text-primary-dark' : ''} />
                            {!collapsed && <span className="animate-fade-in">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom actions */}
            <div className="border-t border-gray-100 dark:border-border-dark p-2 space-y-0.5">
                <button
                    onClick={toggleDarkMode}
                    className={`nav-item w-full text-gray-600 dark:text-gray-400 ${collapsed ? 'justify-center px-2' : ''}`}
                >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>
                <button
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}
                    className={`nav-item w-full text-gray-600 dark:text-gray-400 ${collapsed ? 'justify-center px-2' : ''} ${state.currentPage === 'settings' ? 'active' : ''}`}
                >
                    <Settings size={18} />
                    {!collapsed && <span>Settings</span>}
                </button>
            </div>
        </aside>
    );
}
