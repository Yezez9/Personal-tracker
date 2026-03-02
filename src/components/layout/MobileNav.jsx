import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Home, CheckSquare, FolderOpen, CalendarDays, BookOpen, Settings } from 'lucide-react';

const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'todos', icon: CheckSquare, label: 'Tasks' },
    { id: 'courses', icon: FolderOpen, label: 'Courses' },
    { id: 'schedule', icon: CalendarDays, label: 'Schedule' },
    { id: 'studysets', icon: BookOpen, label: 'Study' },
    { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function MobileNav() {
    const { state, dispatch } = useApp();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl border-t border-gray-200 dark:border-border-dark"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-around h-16 px-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = state.currentPage === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => dispatch({ type: 'SET_PAGE', payload: tab.id })}
                            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 active:scale-90
                ${active
                                    ? 'text-primary-light dark:text-primary-dark'
                                    : 'text-gray-400'}`}
                        >
                            <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                            <span className={`text-[9px] font-medium leading-tight ${active ? 'font-semibold' : ''}`}>{tab.label}</span>
                            {active && <div className="w-4 h-0.5 rounded-full bg-primary-light dark:bg-primary-dark" />}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
