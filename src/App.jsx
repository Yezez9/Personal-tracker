import React, { useState, useEffect } from 'react';
import { initializeNotifications } from './utils/notificationService';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider, useApp } from './contexts/AppContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';
import AIAssistant from './components/AIAssistant';
import InstallPrompt from './components/InstallPrompt';
import OnboardingFlow from './components/OnboardingFlow';
import CoinAnimation from './components/CoinAnimation';
import Dashboard from './pages/Dashboard';
import TodoList from './pages/TodoList';
import CourseFolders from './pages/CourseFolders';
import ClassSchedule from './pages/ClassSchedule';
import CalendarView from './pages/CalendarView';
import RecurringTasks from './pages/RecurringTasks';
import Settings from './pages/Settings';

function AppContent() {
    const { state, dispatch } = useApp();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Generate daily notifications on mount
    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const overdue = state.todos.filter(t => t.dueDate < todayStr && t.status !== 'completed');
        const dueSoon = state.todos.filter(t => {
            const diff = (new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff < 1 && t.status !== 'completed';
        });

        if (overdue.length > 0 && state.notifications.length === 0) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { icon: '⚠️', message: `You have ${overdue.length} overdue task(s)!` } });
        }
        if (dueSoon.length > 0) {
            dueSoon.forEach(t => {
                if (!state.notifications.some(n => n.message?.includes(t.title))) {
                    dispatch({ type: 'ADD_NOTIFICATION', payload: { icon: '⏰', message: `"${t.title}" is due today!` } });
                }
            });
        }

        // Rescore all tasks daily
        dispatch({ type: 'RESCORE_ALL_TODOS' });

        // Midnight reset for recurring tasks
        import('./utils/recurringTaskService').then(({ performMidnightReset }) => {
            performMidnightReset(state.recurringTasks, dispatch, state.profile?.name);
        });

        // Initialize AI push notifications
        initializeNotifications({
            todos: state.todos,
            schedule: state.schedule,
            courses: state.courses,
            profile: state.profile,
            recurringTasks: state.recurringTasks || [],
        });
    }, []);

    const pages = {
        dashboard: Dashboard,
        todos: TodoList,
        courses: CourseFolders,
        schedule: ClassSchedule,
        calendar: CalendarView,
        recurring: RecurringTasks,
        settings: Settings,
        ai: () => { dispatch({ type: 'SET_PAGE', payload: 'dashboard' }); return null; },
    };

    const PageComponent = pages[state.currentPage] || Dashboard;

    // Show loading spinner while cloud data loads
    if (state._loading) {
        return (
            <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center">
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="w-12 h-12 border-3 border-primary-light/20 border-t-primary-light rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-400 font-medium">Loading TaskTrack...</p>
                    <p className="text-[10px] text-gray-500">Syncing with cloud ☁️</p>
                </div>
            </div>
        );
    }

    if (!state.onboardingComplete) {
        return <OnboardingFlow />;
    }

    return (
        <div className="min-h-screen bg-bg-light dark:bg-bg-dark transition-colors duration-300">
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

            {/* Mobile sidebar overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="absolute left-0 top-0 h-full w-[250px] animate-slide-in">
                        <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
                    </div>
                </div>
            )}

            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[220px]'}`}>
                <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
                <main className="p-4 lg:p-6 pb-24 lg:pb-6 min-h-[calc(100vh-56px)]">
                    <PageComponent />
                </main>
            </div>

            <MobileNav />
            <AIAssistant />
            <InstallPrompt />
            <CoinAnimation />
        </div>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AppProvider>
                <AppContent />
            </AppProvider>
        </ThemeProvider>
    );
}
