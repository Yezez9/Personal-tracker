import React, { useState, useEffect } from 'react';
import { initializeNotifications, subscribeToWebPush } from './utils/notificationService';
import { scheduleAllNotifications } from './utils/NotificationScheduler';
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
import Shop from './pages/Shop';
import Settings from './pages/Settings';

function AppContent() {
    const { state, dispatch } = useApp();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [globalToast, setGlobalToast] = useState(null);

    // Global toast listener
    useEffect(() => {
        const handleToast = (e) => {
            setGlobalToast({ ...e.detail, id: Date.now() });
            setTimeout(() => setGlobalToast(null), 3000);
        };
        window.addEventListener('toast', handleToast);
        return () => window.removeEventListener('toast', handleToast);
    }, []);

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

        // Initialize AI push notifications (local web)
        initializeNotifications({
            todos: state.todos,
            schedule: state.schedule,
            courses: state.courses,
            profile: state.profile,
            recurringTasks: state.recurringTasks || [],
        });

        // ─── Streak Freeze Auto-Activation ──────────────────────
        const lastOpened = localStorage.getItem('tasktrack_last_opened');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString().split('T')[0];

        if (lastOpened && lastOpened !== todayIso) {
            const lastDate = new Date(lastOpened);
            lastDate.setHours(0, 0, 0, 0);
            const missedDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)) - 1;

            if (missedDays > 0) {
                const freezes = (state.shopPurchases || []).filter(p => p.itemId === 'streak_freeze' && !p.consumed);
                const freezesToUse = Math.min(missedDays, freezes.length);
                const uncoveredDays = missedDays - freezesToUse;

                // Consume freezes
                for (let i = 0; i < freezesToUse; i++) {
                    dispatch({ type: 'CONSUME_SHOP_ITEM', payload: 'streak_freeze' });
                }

                if (freezesToUse > 0) {
                    const remaining = freezes.length - freezesToUse;
                    dispatch({
                        type: 'ADD_NOTIFICATION',
                        payload: {
                            icon: '❄️',
                            message: `Your Streak Freeze saved your streak! ❄️ You have ${remaining} freeze(s) left.`
                        }
                    });
                }

                if (uncoveredDays > 0) {
                    // Reset streak — user missed days with no freeze coverage
                    const streakData = JSON.parse(localStorage.getItem('study_streak') || '{"currentStreak":0}');
                    streakData.currentStreak = 0;
                    localStorage.setItem('study_streak', JSON.stringify(streakData));
                    dispatch({
                        type: 'ADD_NOTIFICATION',
                        payload: {
                            icon: '💔',
                            message: `Your streak was reset 💔 Buy a Streak Freeze in the Shop to protect future streaks!`
                        }
                    });
                }
            }
        }
        localStorage.setItem('tasktrack_last_opened', todayIso);
    }, []);

    // Trigger Capacitor & Web Push notifications when cloud data is fully loaded
    useEffect(() => {
        if (state._cloudReady && state.profile?.notificationPreferences?.master !== false) {
            scheduleAllNotifications(state);
            subscribeToWebPush(state.tasktrack_user_id);
        }
    }, [state._cloudReady, state.profile?.notificationPreferences?.master]);

    const pages = {
        dashboard: Dashboard,
        todos: TodoList,
        courses: CourseFolders,
        schedule: ClassSchedule,
        calendar: CalendarView,
        recurring: RecurringTasks,
        shop: Shop,
        settings: Settings,
        ai: () => { dispatch({ type: 'SET_PAGE', payload: 'dashboard' }); return null; },
    };

    const PageComponent = pages[state.currentPage] || Dashboard;

    // Show loading spinner while cloud data loads
    if (state._loading) {
        return (
            <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col items-center justify-center p-4">
                <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary-light border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-3xl filter drop-shadow-md">🎯</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-gray-100 mb-2">TaskTrack</h1>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading your workspace...</p>
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
            
            {/* Global Toasts */}
            {globalToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] animate-fade-in">
                    <div className={`px-4 py-2 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
                        globalToast.type === 'error' ? 'bg-red-500 text-white' :
                        globalToast.type === 'warning' ? 'bg-amber-500 text-white' :
                        'bg-gray-800 text-white'
                    }`}>
                        {globalToast.type === 'error' && <span>❌</span>}
                        {globalToast.type === 'warning' && <span>⚠️</span>}
                        {globalToast.message}
                    </div>
                </div>
            )}
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
