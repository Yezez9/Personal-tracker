import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { getCountdownParts, PRESET_COLORS, PRESET_EMOJIS } from '../utils/helpers';
import { Plus, X, Trash2 } from 'lucide-react';

function CountdownCard({ countdown, onDelete }) {
    const [parts, setParts] = useState(getCountdownParts(countdown.date));

    useEffect(() => {
        const interval = setInterval(() => setParts(getCountdownParts(countdown.date)), 1000);
        return () => clearInterval(interval);
    }, [countdown.date]);

    const urgencyColor = parts.expired ? 'from-gray-400 to-gray-500'
        : parts.totalDays < 7 ? 'from-red-500 to-red-600'
            : parts.totalDays < 14 ? 'from-yellow-500 to-orange-500'
                : 'from-green-500 to-emerald-500';

    return (
        <div className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark overflow-hidden card-hover group">
            <div className={`h-1.5 bg-gradient-to-r ${urgencyColor}`} />
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{countdown.icon || '⏳'}</span>
                        <h3 className="text-sm font-bold dark:text-txt-dark">{countdown.title}</h3>
                    </div>
                    <button onClick={onDelete} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
                {parts.expired ? (
                    <p className="text-center text-lg font-bold text-gray-400">Event Passed</p>
                ) : (
                    <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                            { val: parts.days, label: 'Days' },
                            { val: parts.hours, label: 'Hours' },
                            { val: parts.minutes, label: 'Mins' },
                            { val: parts.seconds, label: 'Secs' },
                        ].map(item => (
                            <div key={item.label}>
                                <div className="text-2xl font-bold tabular-nums dark:text-txt-dark">{String(item.val).padStart(2, '0')}</div>
                                <div className="text-[10px] text-gray-400 font-medium">{item.label}</div>
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-[10px] text-gray-400 text-center mt-3">{new Date(countdown.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
        </div>
    );
}

export default function Countdowns() {
    const { state, dispatch } = useApp();
    const { countdowns, courses } = state;
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ title: '', date: '', icon: '⏳', color: PRESET_COLORS[0], courseId: '' });

    const handleSubmit = () => {
        if (!form.title.trim() || !form.date) return;
        dispatch({ type: 'ADD_COUNTDOWN', payload: form });
        setForm({ title: '', date: '', icon: '⏳', color: PRESET_COLORS[0], courseId: '' }); setShowAdd(false);
    };

    const sorted = [...countdowns].sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold dark:text-txt-dark">Countdowns</h1>
                <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Countdown</button>
            </div>
            {sorted.length === 0 ? (
                <div className="text-center py-16"><p className="text-4xl mb-3">⏳</p><p className="text-sm text-gray-400">No countdowns yet. Track your big milestones!</p></div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sorted.map(cd => <CountdownCard key={cd.id} countdown={cd} onDelete={() => dispatch({ type: 'DELETE_COUNTDOWN', payload: cd.id })} />)}
                </div>
            )}
            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative glass-strong rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between"><h2 className="text-lg font-bold dark:text-txt-dark">Add Countdown</h2><button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><X size={18} className="dark:text-gray-400" /></button></div>
                            <input placeholder="Event title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" />
                            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input-field" />
                            <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Icon</label>
                                <div className="flex flex-wrap gap-2">{['⏳', '🎓', '📝', '🎉', '🏆', '⚡', '🎯', '📅', '🔔', '💪'].map(e => <button key={e} onClick={() => setForm(p => ({ ...p, icon: e }))} className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === e ? 'bg-gray-200 dark:bg-surface2-dark scale-110' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>{e}</button>)}</div>
                            </div>
                            <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} className="input-field">
                                <option value="">Link to course (optional)</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button onClick={handleSubmit} disabled={!form.title.trim() || !form.date} className="btn-primary w-full disabled:opacity-50">Add Countdown</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
