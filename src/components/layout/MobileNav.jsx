import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Home, CheckSquare, FolderOpen, CalendarDays, BookOpen } from 'lucide-react';

const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'todos', icon: CheckSquare, label: 'Tasks' },
    { id: 'courses', icon: FolderOpen, label: 'Courses' },
    { id: 'schedule', icon: CalendarDays, label: 'Schedule' },
    { id: 'studysets', icon: BookOpen, label: 'Study' },
];

export default function MobileNav() {
    const { state, dispatch } = useApp();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/90 dark:bg-surface-dark/90 backdrop-blur-xl border-t border-gray-200 dark:border-border-dark">
            <div className="flex items-center justify-around h-16 px-2">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = state.currentPage === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => dispatch({ type: 'SET_PAGE', payload: tab.id })}
                            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200
                ${active
                                    ? 'text-primary-light dark:text-primary-dark'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                            <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{tab.label}</span>
                            {active && <div className="w-4 h-0.5 rounded-full bg-primary-light dark:bg-primary-dark mt-0.5" />}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
