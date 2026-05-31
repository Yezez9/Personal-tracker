import React, { useState, useEffect, useMemo } from 'react';
import storage from '../utils/storage';
import { useApp } from '../contexts/AppContext';
import { formatDate, formatRelativeDate, isToday, getDateGroup } from '../utils/helpers';
import { generateDailyBriefing, generateSmartRecommendations } from '../utils/aiService';
import { playNotificationSound } from '../utils/soundService';
import {
    CheckCircle2, Clock, AlertTriangle, TrendingUp, Calendar, BookOpen, Sparkles, ChevronRight, Edit3, ArrowRight, Flame
} from 'lucide-react';

export default function Dashboard() {
    const { state, dispatch } = useApp();
    const { profile, todos, schedule, courses, recurringTasks } = state;
    const [briefing, setBriefing] = useState('');
    const [editingCard, setEditingCard] = useState(false);
    const [smartRecs, setSmartRecs] = useState([]);
    const [recsLoading, setRecsLoading] = useState(true);

    const [briefingLoading, setBriefingLoading] = useState(true);

    useEffect(() => {
        setBriefingLoading(true);
        generateDailyBriefing({ todos, schedule, profile, courses, recurringTasks }).then(text => {
            setBriefing(text);
            setBriefingLoading(false);
            if (text) playNotificationSound();
        });
    }, []);

    const todayStr = new Date().toISOString().split('T')[0];
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const todayTasks = todos.filter(t => t.dueDate === todayStr && t.status !== 'completed');
    const overdueTasks = todos.filter(t => t.dueDate < todayStr && t.status !== 'completed');

    // Fetch smart recommendations
    useEffect(() => {
        setRecsLoading(true);
        generateSmartRecommendations({ todos, courses, recurringTasks: recurringTasks || [] }).then(recs => {
            setSmartRecs(recs);
            setRecsLoading(false);
        });
    }, [todos]);

    // Upcoming in 3 days
    const upcoming3Days = todos
        .filter(t => {
            if (t.status === 'completed') return false;
            const diff = Math.ceil((new Date(t.dueDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
            return diff >= 0 && diff <= 3;
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const completedThisWeek = useMemo(() => {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return todos.filter(t => t.status === 'completed').length;
    }, [todos]);

    const upcomingDeadlines = todos
        .filter(t => t.dueDate >= todayStr && t.status !== 'completed')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 3);

    const todayClasses = schedule.filter(s => s.day === dayName);
    const nextClass = todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

    // Study streak
    const [streak, setStreak] = useState(1);
    useEffect(() => {
        const todayDate = new Date().toISOString().split('T')[0];
        const streakData = storage.get('study_streak') || { lastOpenedDate: null, currentStreak: 0 };
        const { lastOpenedDate, currentStreak } = streakData;

        if (!lastOpenedDate) {
            storage.set('study_streak', { lastOpenedDate: todayDate, currentStreak: 1 });
            setStreak(1);
        } else if (lastOpenedDate === todayDate) {
            setStreak(currentStreak);
        } else {
            const last = new Date(lastOpenedDate + 'T00:00:00');
            const now = new Date(todayDate + 'T00:00:00');
            const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                const newStreak = currentStreak + 1;
                storage.set('study_streak', { lastOpenedDate: todayDate, currentStreak: newStreak });
                setStreak(newStreak);
            } else {
                storage.set('study_streak', { lastOpenedDate: todayDate, currentStreak: 1 });
                setStreak(1);
            }
        }
    }, []);

    const recentActivity = [...todos].sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    ).slice(0, 5);

    const totalTodos = todos.filter(t => t.status !== 'completed').length;
    const completionRate = todos.length > 0 ? Math.round((todos.filter(t => t.status === 'completed').length / todos.length) * 100) : 0;

    // Urgency color bars for Upcoming cards
    const urgencyBarColors = ['bg-blue-500', 'bg-accent-light', 'bg-yellow-400', 'bg-secondary-light'];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ═══ Hero Student Card ═══ */}
            <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-xl" style={{ background: 'linear-gradient(135deg, #6C63FF 0%, #9B59B6 25%, #FF6584 55%, #43D8A0 100%)' }}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/4 blur-lg" />
                <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 blur-md" />

                <div className="relative flex items-start gap-5">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold overflow-hidden ring-2 ring-white/20">
                            {profile?.avatar ? (
                                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                profile?.name?.charAt(0).toUpperCase() || '?'
                            )}
                        </div>
                        <button
                            onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}
                            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-light flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        >
                            <Edit3 size={12} />
                        </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <p className="text-sm font-medium text-white/70">Welcome back,</p>
                        <h2 className="text-2xl font-bold tracking-tight">{profile?.name || 'Student'}</h2>
                        <p className="text-white/80 text-sm mt-0.5">{profile?.program || 'Set your program'}</p>
                        <p className="text-white/50 text-xs">{profile?.school || 'Set your school'} {profile?.studentId ? `• Semester II` : ''}</p>
                    </div>
                </div>

                {/* Stat pills */}
                <div className="relative mt-5 flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-sm font-medium">
                        <BookOpen size={14} /> {courses.length} Courses
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-sm font-medium">
                        <CheckCircle2 size={14} /> {totalTodos} Active Tasks
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-sm font-medium">
                        <Sparkles size={14} /> {(recurringTasks || []).length} Habits
                    </div>
                </div>
            </div>

            {/* ═══ Quick Stats Row ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tasks Due Today */}
                <div className="glass-card p-4 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Tasks Due Today</p>
                            <p className="text-2xl font-bold dark:text-txt-dark leading-none mt-0.5">{String(todayTasks.length).padStart(2, '0')}</p>
                        </div>
                    </div>
                </div>

                {/* AI Picks */}
                <div className="glass-card p-4 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">AI Picks</p>
                            <p className="text-2xl font-bold dark:text-txt-dark leading-none mt-0.5">{String(smartRecs.length).padStart(2, '0')}</p>
                        </div>
                    </div>
                </div>

                {/* Completed */}
                <div className="glass-card p-4 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-accent-light/15 flex items-center justify-center flex-shrink-0">
                            <TrendingUp size={20} className="text-accent-light" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Completed</p>
                            <p className="text-2xl font-bold dark:text-txt-dark leading-none mt-0.5">{completedThisWeek}</p>
                        </div>
                    </div>
                </div>

                {/* Day Streak */}
                <div className="glass-card p-4 card-hover relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(67,216,160,0.08))' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                            <Flame size={20} className="text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Day Streak</p>
                            <p className="text-2xl font-bold dark:text-txt-dark leading-none mt-0.5">{streak} Days</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ AI Daily Briefing ═══ */}
            {(briefing || briefingLoading) && (
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary-light/15 flex items-center justify-center">
                                <Sparkles size={18} className="text-primary-light dark:text-primary-dark" />
                            </div>
                            <h3 className="text-base font-bold dark:text-txt-dark">AI Daily Briefing</h3>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-primary-light/10 text-primary-light dark:text-primary-dark font-semibold">Powered by LLaMA 3.3 70B</span>
                    </div>
                    {briefingLoading ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700/40 rounded-full w-3/4" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700/40 rounded-full w-full" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700/40 rounded-full w-1/2" />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">&ldquo;{briefing}&rdquo;</p>
                    )}
                </div>
            )}

            {/* ═══ Two Column: Today's Summary + Smart Recommendations ═══ */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Today's Summary */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold dark:text-txt-dark flex items-center gap-2">
                            <Calendar size={16} className="text-primary-light dark:text-primary-dark" />
                            Today's Summary
                        </h3>
                        <span className="text-[10px] text-gray-400">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                    </div>

                    {todayClasses.length > 0 && (
                        <div className="mb-4">
                            {todayClasses.map((cls, i) => {
                                const courseName = courses.find(c => c.id === cls.courseId)?.name || 'Class';
                                return (
                                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-border-dark/30 last:border-0">
                                        <div className="text-[10px] text-gray-400 font-mono w-20 flex-shrink-0 pt-0.5">
                                            {cls.startTime} – {cls.endTime}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold dark:text-gray-200 truncate">{courseName}</p>
                                            <p className="text-[11px] text-gray-400">{cls.room || 'Room TBD'}</p>
                                        </div>
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium flex-shrink-0">Lecture</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {todayTasks.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Quick Checklist</p>
                            {todayTasks.slice(0, 3).map(task => (
                                <div key={task.id} className="flex items-center gap-3 py-2">
                                    <button
                                        onClick={() => dispatch({ type: 'TOGGLE_TODO', payload: task.id })}
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.status === 'completed'
                                            ? 'bg-primary-light border-primary-light text-white'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-light'
                                            }`}
                                    >
                                        {task.status === 'completed' && <CheckCircle2 size={12} />}
                                    </button>
                                    <span className={`text-sm truncate ${task.status === 'completed' ? 'line-through text-gray-400' : 'dark:text-gray-300'}`}>
                                        {task.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {todayClasses.length === 0 && todayTasks.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">Nothing scheduled for today! 🎉</p>
                    )}
                </div>

                {/* Smart Recommendations */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold mb-1 dark:text-txt-dark flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-400" />
                        Smart Recommendations
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4">Personalized study plan based on upcoming deadlines</p>

                    {recsLoading ? (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl" />
                            ))}
                        </div>
                    ) : smartRecs.length > 0 ? smartRecs.slice(0, 3).map((rec, i) => {
                        const urgencyColors = { high: 'text-red-400', medium: 'text-orange-400', low: 'text-blue-400' };
                        const urgencyBadge = { high: 'bg-red-500/10 text-red-400', medium: 'bg-orange-500/10 text-orange-400', low: 'bg-blue-500/10 text-blue-400' };
                        const task = todos.find(t => t.id === rec.taskId);
                        const courseName = task ? courses.find(c => c.id === task.courseId || c.id === task.course)?.name : null;

                        return (
                            <div key={rec.taskId || i} className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-border-dark/30 mb-2.5 last:mb-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-semibold dark:text-txt-dark truncate">{task?.title || rec.suggestedAction}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ml-2 ${urgencyBadge[rec.urgencyLevel] || urgencyBadge.low}`}>
                                        {rec.urgencyLevel === 'high' ? 'Urgent' : rec.urgencyLevel === 'medium' ? 'Next Up' : 'Optional'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{rec.recommendationReason}</p>
                                <div className="flex items-center justify-between mt-2">
                                    {courseName && <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary-light/10 text-primary-light font-medium">{courseName}</span>}
                                    <button
                                        onClick={() => dispatch({ type: 'SET_PAGE', payload: 'todos' })}
                                        className={`text-[11px] font-semibold flex items-center gap-1 ${urgencyColors[rec.urgencyLevel] || 'text-blue-400'}`}
                                    >
                                        Start Now <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    }) : (
                        <p className="text-sm text-gray-400 text-center py-6">No pending tasks to recommend 🎯</p>
                    )}
                </div>
            </div>

            {/* ═══ Upcoming in 3 Days ═══ */}
            <div className="glass-card p-5">
                <h3 className="text-base font-bold mb-4 dark:text-txt-dark flex items-center gap-2">
                    <Clock size={18} className="text-secondary-light dark:text-secondary-dark" />
                    Upcoming in 3 Days ⏳
                </h3>
                {upcoming3Days.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {upcoming3Days.slice(0, 4).map((task, i) => {
                            const daysLeft = Math.ceil((new Date(task.dueDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                            const pillColor = daysLeft <= 1 ? 'bg-red-500/10 text-red-400' : daysLeft === 2 ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-400';
                            const pillText = daysLeft === 0 ? 'Today' : daysLeft === 1 ? '24 hours left' : `${daysLeft} days left`;
                            const barColor = urgencyBarColors[i % urgencyBarColors.length];

                            return (
                                <div key={task.id} className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-border-dark/30 overflow-hidden">
                                    <div className={`h-1 ${barColor}`} />
                                    <div className="p-3.5">
                                        <h4 className="text-sm font-semibold dark:text-txt-dark line-clamp-2 mb-2">{task.title}</h4>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Clock size={10} /> {pillText}
                                            </span>
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${pillColor}`}>
                                                {task.priority === 'high' ? 'High Urgency' : task.priority === 'medium' ? 'Normal' : 'Low'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No deadlines in the next 3 days 🎉</p>
                )}
            </div>
        </div>
    );
}
