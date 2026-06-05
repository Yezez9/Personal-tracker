import React from 'react';
import Logo from '../Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';
import { getCoinWallet, getLevel } from '../../utils/coinService';
import {
    Home, CheckSquare, FolderOpen, CalendarDays, Calendar,
    Repeat, ShoppingBag, Bot, Settings, Moon, Sun, Sparkles
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'todos', label: 'To-Do List', icon: CheckSquare },
    { id: 'courses', label: 'Course Folders', icon: FolderOpen },
    { id: 'schedule', label: 'Class Schedule', icon: CalendarDays },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'recurring', label: 'Recurring Tasks', icon: Repeat },
    { id: 'shop', label: 'Coin Shop', icon: ShoppingBag },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
];

export default function Sidebar({ collapsed, onToggle }) {
    const { darkMode, toggleDarkMode } = useTheme();
    const { state, dispatch } = useApp();
    const wallet = getCoinWallet();
    const level = getLevel(wallet.totalCoins);

    return (
        <aside className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 flex flex-col
            bg-white dark:bg-sidebar-dark
            ${collapsed ? 'w-[70px]' : 'w-[220px]'} hidden lg:flex`}>

            {/* Logo */}
            <div className="p-5 flex items-center gap-3">
                <Logo size={36} className="flex-shrink-0" />
                {!collapsed && (
                    <div className="animate-fade-in">
                        <h1 className="text-base font-bold dark:text-white">TaskTrack</h1>
                        <p className="text-[9px] uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 -mt-0.5 font-medium">Academic Organizer</p>
                    </div>
                )}
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const active = state.currentPage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => dispatch({ type: 'SET_PAGE', payload: item.id })}
                            className={`nav-item w-full ${active ? 'active' : 'text-gray-500 dark:text-gray-400'} ${collapsed ? 'justify-center px-2' : ''}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={18} className={active ? 'text-primary-light dark:text-primary-dark' : ''} />
                            {!collapsed && <span className="animate-fade-in text-[13px]">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 pb-4 space-y-2">
                {/* Settings */}
                <button
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}
                    className={`nav-item w-full text-gray-500 dark:text-gray-400 ${collapsed ? 'justify-center px-2' : ''} ${state.currentPage === 'settings' ? 'active' : ''}`}
                >
                    <Settings size={18} />
                    {!collapsed && <span className="text-[13px]">Settings</span>}
                </button>

                {/* Light/Dark Mode toggle pill */}
                {!collapsed && (
                    <button
                        onClick={toggleDarkMode}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-surface2-dark text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface3-dark transition-all"
                    >
                        {darkMode ? <Sun size={16} className="text-yellow-400" /> : <Sparkles size={16} className="text-primary-light" />}
                        <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                )}
                {collapsed && (
                    <button
                        onClick={toggleDarkMode}
                        className="nav-item w-full justify-center px-2 text-gray-500 dark:text-gray-400"
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                )}

                {/* User profile mini card */}
                {state.profile && !collapsed && (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-surface2-dark/50 mt-1">
                        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-primary-light/20">
                            {state.profile.avatar ? (
                                <img src={state.profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                state.profile.name?.charAt(0).toUpperCase() || '?'
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold truncate dark:text-txt-dark">{state.profile.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{level.badge} {level.name} · {wallet.totalCoins >= 1000 ? `${(wallet.totalCoins / 1000).toFixed(1)}K` : wallet.totalCoins} PTS</p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
