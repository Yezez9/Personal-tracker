import React, { useState, useEffect, useMemo } from 'react';
import storage from '../utils/storage';
import { useApp } from '../contexts/AppContext';
import { formatDate, formatRelativeDate, isToday, getDateGroup } from '../utils/helpers';
import { generateDailyBriefing, generateSmartRecommendations } from '../utils/aiService';
import {
    CheckCircle2, Clock, AlertTriangle, TrendingUp, Calendar, BookOpen, Sparkles, ChevronRight, Edit3
} from 'lucide-react';

export default function Dashboard() {
    const { state, dispatch } = useApp();
    const { profile, todos, schedule, courses, studySets, countdowns, bookmarks } = state;
    const [briefing, setBriefing] = useState('');
    const [editingCard, setEditingCard] = useState(false);
    const [smartRecs, setSmartRecs] = useState([]);
    const [recsLoading, setRecsLoading] = useState(true);

    const [briefingLoading, setBriefingLoading] = useState(true);

    useEffect(() => {
        setBriefingLoading(true);
        generateDailyBriefing({ todos, schedule, profile, courses, studySets, countdowns, bookmarks }).then(text => {
            setBriefing(text);
            setBriefingLoading(false);
        });
    }, []);

    const todayStr = new Date().toISOString().split('T')[0];
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const todayTasks = todos.filter(t => t.dueDate === todayStr && t.status !== 'completed');
    const overdueTasks = todos.filter(t => t.dueDate < todayStr && t.status !== 'completed');

    // Fetch smart recommendations
    useEffect(() => {
        setRecsLoading(true);
        generateSmartRecommendations({ todos, courses, countdowns: state.countdowns || [], studySets }).then(recs => {
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

    // Study streak — persistent, calendar-day based
    const [streak, setStreak] = useState(1);
    useEffect(() => {
        const todayDate = new Date().toISOString().split('T')[0];
        const streakData = storage.get('study_streak') || { lastOpenedDate: null, currentStreak: 0 };
        const { lastOpenedDate, currentStreak } = streakData;

        if (!lastOpenedDate) {
            // First ever open
            storage.set('study_streak', { lastOpenedDate: todayDate, currentStreak: 1 });
            setStreak(1);
        } else if (lastOpenedDate === todayDate) {
            // Same day — do nothing
            setStreak(currentStreak);
        } else {
            // Different day — count how many days apart
            const last = new Date(lastOpenedDate + 'T00:00:00');
            const now = new Date(todayDate + 'T00:00:00');
            const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Exactly next day — increment
                const newStreak = currentStreak + 1;
                storage.set('study_streak', { lastOpenedDate: todayDate, currentStreak: newStreak });
                setStreak(newStreak);
            } else {
                // 2+ days gap — reset
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

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Student ID Card */}
            <div className="relative overflow-hidden rounded-2xl gradient-primary p-6 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
                            {profile?.avatar ? (
                                <img src={profile.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                                profile?.name?.charAt(0).toUpperCase() || '?'
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{profile?.name || 'Student'}</h2>
                            <p className="text-white/70 text-sm">{profile?.program || 'Set your program'}</p>
                            <p className="text-white/50 text-xs mt-1">{profile?.school || 'Set your school'} {profile?.studentId ? `• ID: ${profile.studentId}` : ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <Edit3 size={16} />
                    </button>
                </div>
                <div className="relative mt-4 flex gap-6 text-sm">
                    <div><span className="text-white/60">Courses</span> <span className="font-semibold ml-1">{courses.length}</span></div>
                    <div><span className="text-white/60">Active Tasks</span> <span className="font-semibold ml-1">{totalTodos}</span></div>
                    <div><span className="text-white/60">Study Sets</span> <span className="font-semibold ml-1">{studySets.length}</span></div>
                </div>
            </div>

            {/* AI Daily Briefing */}
            {(briefing || briefingLoading) && (
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-5 shadow-sm card-hover">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
                            <Sparkles size={16} className="text-primary-light dark:text-primary-dark" />
                        </div>
                        <h3 className="text-sm font-semibold dark:text-txt-dark">AI Daily Briefing</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-light/10 text-primary-light dark:text-primary-dark font-medium">Powered by LLaMA 3.3 70B</span>
                    </div>
                    {briefingLoading ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{briefing}</p>
                    )}
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Tasks */}
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-4 card-hover">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
                            <CheckCircle2 size={20} className="text-primary-light dark:text-primary-dark" />
                        </div>
                        <span className="text-2xl font-bold dark:text-txt-dark">{todayTasks.length}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tasks due today</p>
                </div>

                {/* AI Picks */}
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-4 card-hover">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Sparkles size={20} className="text-purple-500" />
                        </div>
                        <span className="text-2xl font-bold dark:text-txt-dark">{smartRecs.length}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">AI Picks</p>
                </div>

                {/* Completed this week */}
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-4 card-hover">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-light/10 dark:bg-accent-dark/10 flex items-center justify-center">
                            <TrendingUp size={20} className="text-accent-light dark:text-accent-dark" />
                        </div>
                        <span className="text-2xl font-bold dark:text-txt-dark">{completedThisWeek}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed total</p>
                </div>

                {/* Study Streak */}
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-4 card-hover">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary-light/10 dark:bg-secondary-dark/10 flex items-center justify-center">
                            <span className="text-lg">🔥</span>
                        </div>
                        <span className="text-2xl font-bold dark:text-txt-dark">{streak}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{streak} Day Streak</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Today's Summary */}
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-5 shadow-sm">
                    <h3 className="text-sm font-semibold mb-4 dark:text-txt-dark flex items-center gap-2">
                        <Calendar size={16} className="text-primary-light dark:text-primary-dark" />
                        Today's Summary
                    </h3>
                    {todayClasses.length > 0 && (
                        <div className="mb-3">
                            <p className="text-xs font-medium text-gray-400 mb-2">CLASSES</p>
                            {todayClasses.map((cls, i) => (
                                <div key={i} className="flex items-center gap-3 py-1.5">
                                    <Clock size={14} className="text-gray-400" />
                                    <span className="text-sm dark:text-gray-300">
                                        {cls.startTime}–{cls.endTime} · {courses.find(c => c.id === cls.courseId)?.name || 'Class'} ({cls.room || 'TBD'})
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {todayTasks.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-gray-400 mb-2">TASKS DUE</p>
                            {todayTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 py-1.5">
                                    <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                    <span className="text-sm dark:text-gray-300 truncate">{task.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {todayClasses.length === 0 && todayTasks.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">Nothing scheduled for today! 🎉</p>
                    )}
                </div>

                {/* Smart Recommendations */}
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-5 shadow-sm">
                    <h3 className="text-sm font-semibold mb-1 dark:text-txt-dark flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-500" />
                        Smart Recommendations
                    </h3>
                    <p className="text-[10px] text-gray-400 mb-4">Suggested by AI — based on type, deadline & priority</p>
                    {recsLoading ? (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/30 rounded-xl" />
                            ))}
                        </div>
                    ) : smartRecs.length > 0 ? smartRecs.map((rec, i) => {
                        const urgencyColors = { high: 'border-red-500/30 bg-red-500/5', medium: 'border-orange-500/30 bg-orange-500/5', low: 'border-blue-500/30 bg-blue-500/5' };
                        const urgencyBadge = { high: 'bg-red-500/10 text-red-500', medium: 'bg-orange-500/10 text-orange-500', low: 'bg-blue-500/10 text-blue-500' };
                        const typeBadge = { exam: '📝', assignment: '📄', project: '🏗️', reading: '📖', lab: '🔬', other: '📌' };
                        const task = todos.find(t => t.id === rec.taskId);
                        return (
                            <div key={rec.taskId || i} className={`rounded-xl border p-3 mb-2 last:mb-0 ${urgencyColors[rec.urgencyLevel] || urgencyColors.low}`}>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm">{typeBadge[rec.taskType] || '📌'}</span>
                                        <span className="text-sm font-semibold dark:text-txt-dark truncate">{task?.title || rec.suggestedAction}</span>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${urgencyBadge[rec.urgencyLevel]}`}>{rec.urgencyLevel}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">{rec.taskType}</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{rec.recommendationReason}</p>
                                <p className="text-[10px] text-purple-500 dark:text-purple-400 font-medium mt-1">💡 {rec.suggestedAction} · {rec.suggestedDeadline}</p>
                            </div>
                        );
                    }) : (
                        <p className="text-sm text-gray-400 text-center py-4">No pending tasks to recommend 🎯</p>
                    )}
                </div>

                {/* Upcoming in 3 Days */}
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-5 shadow-sm">
                    <h3 className="text-sm font-semibold mb-4 dark:text-txt-dark flex items-center gap-2">
                        <Clock size={16} className="text-secondary-light dark:text-secondary-dark" />
                        Upcoming in 3 Days ⏳
                    </h3>
                    {upcoming3Days.length > 0 ? upcoming3Days.map(task => {
                        const daysLeft = Math.ceil((new Date(task.dueDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                        const pillColor = daysLeft <= 1 ? 'bg-red-500/10 text-red-500' : daysLeft === 2 ? 'bg-orange-500/10 text-orange-500' : 'bg-yellow-500/10 text-yellow-500';
                        const pillText = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days left`;
                        const typeText = (tags => {
                            const t = (tags || []).join(' ').toLowerCase();
                            if (t.includes('exam')) return 'exam';
                            if (t.includes('project')) return 'project';
                            if (t.includes('assignment') || t.includes('homework')) return 'assignment';
                            if (t.includes('lab')) return 'lab';
                            if (t.includes('read')) return 'reading';
                            return null;
                        })(task.tags);
                        return (
                            <div key={task.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-border-dark/50 last:border-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                    <span className="text-sm dark:text-gray-300 truncate">{task.title}</span>
                                    {typeText && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">{typeText}</span>}
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${pillColor}`}>{pillText}</span>
                            </div>
                        );
                    }) : (
                        <p className="text-sm text-gray-400 text-center py-4">No deadlines in the next 3 days 🎉</p>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-4 dark:text-txt-dark">Recent Activity</h3>
                {recentActivity.length > 0 ? recentActivity.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-border-dark/50 last:border-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${item.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-primary-light/10 text-primary-light dark:text-primary-dark'}`}>
                            {item.status === 'completed' ? '✓' : '📝'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm dark:text-gray-300 truncate">{item.title}</p>
                            <p className="text-[10px] text-gray-400">{item.status === 'completed' ? 'Completed' : 'Added'} · {formatDate(item.createdAt)}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-gray-400 text-center py-4">No activity yet. Start by adding a task!</p>
                )}
            </div>

            {/* Completion Progress Ring */}
            {todos.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-5 shadow-sm flex items-center gap-6">
                    <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="6" />
                            <circle
                                cx="40" cy="40" r="34" fill="none" stroke="url(#progressGrad)" strokeWidth="6"
                                strokeDasharray={`${completionRate * 2.136} 213.6`}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#6C63FF" />
                                    <stop offset="100%" stopColor="#43D8A0" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold dark:text-txt-dark">{completionRate}%</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold dark:text-txt-dark">Overall Completion</h3>
                        <p className="text-xs text-gray-400 mt-1">
                            {todos.filter(t => t.status === 'completed').length} of {todos.length} tasks completed
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
