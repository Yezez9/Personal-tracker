import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { judgeRecurringTaskDifficulty, calculateStreakBonus, DIFFICULTY_CONFIG, getWeeklyCompletionRate } from '../utils/recurringTaskService';
import { addCoins } from '../utils/coinService';
import { Plus, X, Trash2, Check, Clock, Flame, Repeat, Zap, Brain } from 'lucide-react';

// ─── Weekly Progress Ring ───────────────────────────────────────────
function WeeklyRing({ completed, total = 7, size = 40 }) {
    const stroke = 3;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = total > 0 ? (completed / total) : 0;
    const dashOffset = circumference * (1 - progress);

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-700/30" />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke}
                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" className="transition-all duration-700" />
            <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6C63FF" />
                    <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
            </defs>
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-gray-300 text-[9px] font-bold transform rotate-90" style={{ transformOrigin: 'center' }}>
                {completed}/{total}
            </text>
        </svg>
    );
}

// ─── Add Recurring Task Modal ───────────────────────────────────────
function AddRecurringModal({ show, onClose, courses, dispatch }) {
    const [form, setForm] = useState({ title: '', description: '', courseId: '', targetDuration: 30 });
    const [aiJudge, setAiJudge] = useState(true);
    const [manualDifficulty, setManualDifficulty] = useState('medium');
    const [judging, setJudging] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [step, setStep] = useState('form'); // 'form' | 'result'

    if (!show) return null;

    const handleJudge = async () => {
        setJudging(true);
        const courseName = courses.find(c => c.id === form.courseId)?.name || '';
        const taskData = { ...form, courseName };

        if (aiJudge) {
            const result = await judgeRecurringTaskDifficulty(taskData);
            setAiResult(result);
        } else {
            // Manual difficulty — use fallback ranges
            const ranges = { easy: { baseCoins: 15, penaltyCoins: 5 }, medium: { baseCoins: 35, penaltyCoins: 10 }, hard: { baseCoins: 65, penaltyCoins: 20 }, extreme: { baseCoins: 120, penaltyCoins: 30 } };
            const r = ranges[manualDifficulty];
            setAiResult({ difficulty: manualDifficulty, difficultyReason: 'Manually set by you', baseCoins: r.baseCoins, penaltyCoins: r.penaltyCoins, encouragement: 'You got this! 💪' });
        }
        setJudging(false);
        setStep('result');
    };

    const handleConfirm = () => {
        if (!aiResult) return;
        dispatch({
            type: 'ADD_RECURRING_TASK',
            payload: {
                title: form.title,
                description: form.description,
                courseId: form.courseId,
                frequency: 'daily',
                targetDuration: form.targetDuration,
                difficulty: aiResult.difficulty,
                difficultyReason: aiResult.difficultyReason,
                baseCoins: aiResult.baseCoins,
                penaltyCoins: aiResult.penaltyCoins,
                encouragement: aiResult.encouragement,
            }
        });
        // Reset
        setForm({ title: '', description: '', courseId: '', targetDuration: 30 });
        setAiResult(null);
        setStep('form');
        onClose();
    };

    const diffConfig = aiResult ? DIFFICULTY_CONFIG[aiResult.difficulty] || DIFFICULTY_CONFIG.medium : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative glass-card bg-white dark:bg-surface-dark rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold dark:text-txt-dark flex items-center gap-2">
                            <Repeat size={18} className="text-primary-light" />
                            {step === 'form' ? 'New Recurring Task' : 'AI Difficulty Result'}
                        </h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><X size={18} className="dark:text-gray-400" /></button>
                    </div>

                    {step === 'form' ? (
                        <>
                            <input placeholder="Task title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" />
                            <textarea placeholder="Description (helps AI judge better)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field h-20 resize-none" />
                            <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} className="input-field">
                                <option value="">Link to course (optional)</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Target duration (minutes/day)</label>
                                <input type="number" min="5" max="240" value={form.targetDuration} onChange={e => setForm(p => ({ ...p, targetDuration: parseInt(e.target.value) || 30 }))} className="input-field" />
                            </div>

                            {/* AI Judge Toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-surface2-dark">
                                <div className="flex items-center gap-2">
                                    <Brain size={16} className="text-primary-light" />
                                    <div>
                                        <p className="text-sm font-medium dark:text-txt-dark">Let AI judge difficulty</p>
                                        <p className="text-[10px] text-gray-400">Uses Groq LLaMA 3.3 to assign rewards</p>
                                    </div>
                                </div>
                                <button onClick={() => setAiJudge(!aiJudge)}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${aiJudge ? 'bg-primary-light dark:bg-primary-dark' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${aiJudge ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {!aiJudge && (
                                <div className="flex gap-2">
                                    {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                                        <button key={key} onClick={() => setManualDifficulty(key)}
                                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border-2 ${manualDifficulty === key ? `${cfg.bg} ${cfg.text} border-current` : 'border-transparent text-gray-400 dark:bg-surface2-dark'}`}>
                                            {cfg.emoji} {cfg.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button onClick={handleJudge} disabled={!form.title.trim() || judging}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #6C63FF, #9B59B6)' }}>
                                {judging ? (
                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
                                ) : (
                                    <><Zap size={16} /> {aiJudge ? 'Judge with AI' : 'Continue'}</>
                                )}
                            </button>
                        </>
                    ) : (
                        /* AI Result Preview */
                        <>
                            <div className="glass-card p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${diffConfig?.bg} ${diffConfig?.text}`}>
                                        {diffConfig?.emoji} {aiResult?.difficulty?.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-400">{form.targetDuration} min/day</span>
                                </div>
                                <p className="text-sm dark:text-gray-300">{aiResult?.difficultyReason}</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg">🪙</span>
                                        <span className="text-sm font-bold text-green-400">+{aiResult?.baseCoins}</span>
                                        <span className="text-[10px] text-gray-400">/day</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg">⚠️</span>
                                        <span className="text-sm font-bold text-red-400">-{aiResult?.penaltyCoins}</span>
                                        <span className="text-[10px] text-gray-400">/miss</span>
                                    </div>
                                </div>
                                <p className="text-xs italic text-gray-400 border-t border-border-dark/30 pt-2">"{aiResult?.encouragement}"</p>
                            </div>

                            {/* Override difficulty */}
                            <div>
                                <p className="text-[10px] text-gray-500 mb-1.5">Disagree? Override manually:</p>
                                <div className="flex gap-1.5">
                                    {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                                        <button key={key} onClick={() => {
                                            const ranges = { easy: { b: 15, p: 5 }, medium: { b: 35, p: 10 }, hard: { b: 65, p: 20 }, extreme: { b: 120, p: 30 } };
                                            setAiResult(r => ({ ...r, difficulty: key, baseCoins: ranges[key].b, penaltyCoins: ranges[key].p, difficultyReason: 'Manually overridden' }));
                                        }}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${aiResult?.difficulty === key ? `${cfg.bg} ${cfg.text}` : 'text-gray-500 hover:text-gray-300'}`}>
                                            {cfg.emoji} {cfg.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep('form')} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-300 border border-border-dark/50">
                                    Back
                                </button>
                                <button onClick={handleConfirm}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                    ✅ Confirm & Create
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Recurring Task Card ────────────────────────────────────────────
function RecurringTaskCard({ task, courses, dispatch }) {
    const course = courses.find(c => c.id === task.courseId);
    const diffConfig = DIFFICULTY_CONFIG[task.difficulty] || DIFFICULTY_CONFIG.medium;
    const weeklyRate = getWeeklyCompletionRate(task);
    const streakInfo = calculateStreakBonus(task.baseCoins || 25, task.currentStreak || 0);
    const [confirming, setConfirming] = useState(false);

    const handleComplete = () => {
        if (task.isCompletedToday) return;
        dispatch({ type: 'COMPLETE_RECURRING_TASK', payload: task.id });

        // Award coins with streak bonus
        const coinsToAward = streakInfo.totalCoins;
        addCoins(coinsToAward, task.title, streakInfo.label || 'Daily habit completed');
        window.dispatchEvent(new CustomEvent('coinEarned', {
            detail: { coins: coinsToAward, baseCoins: task.baseCoins, streakBonus: streakInfo.bonusCoins, reasoning: `Recurring task completed! ${streakInfo.label}` }
        }));
    };

    const handleDelete = () => {
        if (confirming) {
            dispatch({ type: 'DELETE_RECURRING_TASK', payload: task.id });
        } else {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 3000);
        }
    };

    return (
        <div className={`glass-card overflow-hidden transition-all duration-500 group ${
            task.isCompletedToday
                ? 'ring-1 ring-green-500/30 shadow-green-500/10 shadow-lg'
                : 'ring-1 ring-red-500/20 animate-pulse-subtle'
        }`}>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Completion Checkbox */}
                    <button onClick={handleComplete} disabled={task.isCompletedToday}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            task.isCompletedToday
                                ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20 scale-105'
                                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:scale-105 cursor-pointer'
                        }`}>
                        {task.isCompletedToday ? <Check size={20} strokeWidth={3} /> : <span className="text-lg">○</span>}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className={`text-sm font-bold truncate ${task.isCompletedToday ? 'text-green-400 line-through opacity-70' : 'dark:text-txt-dark'}`}>{task.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${diffConfig.bg} ${diffConfig.text}`}>
                                {diffConfig.label}
                            </span>
                        </div>
                        {task.encouragement && (
                            <p className="text-[11px] italic text-gray-500 dark:text-gray-500 mb-1.5 truncate">"{task.encouragement}"</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <Clock size={10} /> {task.targetDuration} min
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-orange-400 font-semibold">
                                <Flame size={10} /> {task.currentStreak || 0}
                            </span>
                            <span className="text-[10px] text-green-400 font-semibold">+{streakInfo.totalCoins} 🪙</span>
                            <span className="text-[10px] text-red-400">-{task.penaltyCoins || 10} ⚠️</span>
                            {course && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${course.color}15`, color: course.color }}>
                                    {course.icon} {course.name}
                                </span>
                            )}
                        </div>
                        {/* Streak badges */}
                        {task.currentStreak >= 3 && (
                            <div className="flex gap-1.5 mt-2">
                                {task.currentStreak >= 3 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-semibold">✨ 3-day</span>}
                                {task.currentStreak >= 7 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-semibold">🔥 7-day</span>}
                                {task.currentStreak >= 14 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-semibold">💎 14-day</span>}
                                {task.currentStreak >= 30 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold">🏆 30-day LEGEND</span>}
                            </div>
                        )}
                    </div>

                    {/* Right side: ring + actions */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <WeeklyRing completed={weeklyRate} />
                        <button onClick={handleDelete}
                            className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${confirming ? 'bg-red-500/20 text-red-400 opacity-100' : 'hover:bg-red-500/10 text-gray-400 hover:text-red-400'}`}>
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function RecurringTasks() {
    const { state, dispatch } = useApp();
    const { recurringTasks, courses } = state;
    const [showModal, setShowModal] = useState(false);

    // Sort: incomplete first, completed at bottom
    const sorted = [...recurringTasks].filter(t => t.isActive).sort((a, b) => {
        if (a.isCompletedToday !== b.isCompletedToday) return a.isCompletedToday ? 1 : -1;
        return (b.currentStreak || 0) - (a.currentStreak || 0);
    });

    const completedToday = sorted.filter(t => t.isCompletedToday).length;
    const totalActive = sorted.length;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-txt-dark tracking-tight flex items-center gap-2">
                        Recurring Tasks <span className="text-xl">🔄</span>
                    </h1>
                    <p className="text-sm text-gray-400">Daily habits that build your future</p>
                </div>
                <div className="flex items-center gap-3">
                    {totalActive > 0 && (
                        <span className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 font-semibold">
                            {completedToday}/{totalActive} Done Today
                        </span>
                    )}
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm shadow-lg transition-all hover:opacity-90 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #6C63FF, #9B59B6)' }}>
                        <Plus size={16} /> Add Habit
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            {totalActive > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card p-3 text-center">
                        <p className="text-xl font-black text-orange-400">🔥 {recurringTasks.reduce((max, t) => Math.max(max, t.currentStreak || 0), 0)}</p>
                        <p className="text-[10px] text-gray-400">Best Active Streak</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                        <p className="text-xl font-black text-green-400">✅ {recurringTasks.reduce((sum, t) => sum + (t.totalCompletions || 0), 0)}</p>
                        <p className="text-[10px] text-gray-400">Total Completions</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                        <p className="text-xl font-black text-primary-light dark:text-primary-dark">🏆 {recurringTasks.reduce((max, t) => Math.max(max, t.longestStreak || 0), 0)}</p>
                        <p className="text-[10px] text-gray-400">Longest Streak Ever</p>
                    </div>
                </div>
            )}

            {/* Task List */}
            {sorted.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-5xl mb-4">💪</p>
                    <p className="text-lg font-semibold dark:text-txt-dark mb-1">No recurring tasks yet</p>
                    <p className="text-sm text-gray-400 mb-6">Build a habit that sticks — start with one small daily commitment</p>
                    <button onClick={() => setShowModal(true)}
                        className="px-6 py-3 rounded-xl font-semibold text-white text-sm shadow-lg transition-all hover:opacity-90 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #6C63FF, #9B59B6)' }}>
                        <Plus size={16} className="inline mr-1" /> Create Your First Habit
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Incomplete tasks */}
                    {sorted.filter(t => !t.isCompletedToday).length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> TO DO TODAY
                            </h3>
                            <div className="space-y-2">
                                {sorted.filter(t => !t.isCompletedToday).map(task => (
                                    <RecurringTaskCard key={task.id} task={task} courses={courses} dispatch={dispatch} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed tasks */}
                    {sorted.filter(t => t.isCompletedToday).length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-2 flex items-center gap-1.5">
                                <Check size={10} /> COMPLETED TODAY
                            </h3>
                            <div className="space-y-2 opacity-80">
                                {sorted.filter(t => t.isCompletedToday).map(task => (
                                    <RecurringTaskCard key={task.id} task={task} courses={courses} dispatch={dispatch} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AddRecurringModal show={showModal} onClose={() => setShowModal(false)} courses={courses} dispatch={dispatch} />
        </div>
    );
}
