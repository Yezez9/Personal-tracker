import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { DAYS_OF_WEEK, DAYS_SHORT, getTimeSlots, formatTime } from '../utils/helpers';
import { Plus, X, List, Grid3X3, Calendar } from 'lucide-react';

function AddClassModal({ show, onClose, courses, dispatch, editEntry }) {
    const [form, setForm] = useState(editEntry || {
        courseId: '', day: 'Monday', startTime: '09:00', endTime: '10:00', room: '', type: 'lecture'
    });

    if (!show) return null;

    const handleSubmit = () => {
        if (!form.courseId || !form.day) return;
        const course = courses.find(c => c.id === form.courseId);
        dispatch({ type: editEntry ? 'UPDATE_SCHEDULE' : 'ADD_SCHEDULE', payload: { ...form, color: course?.color || '#6C63FF' } });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative glass-strong rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold dark:text-txt-dark">{editEntry ? 'Edit Class' : 'Add Class'}</h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><X size={18} className="dark:text-gray-400" /></button>
                    </div>
                    <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} className="input-field">
                        <option value="">Select course *</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                    <select value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value }))} className="input-field">
                        {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start</label>
                            <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End</label>
                            <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} className="input-field" />
                        </div>
                    </div>
                    <input placeholder="Room" value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} className="input-field" />
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                        <option value="lecture">Lecture</option>
                        <option value="lab">Lab</option>
                        <option value="recitation">Recitation</option>
                        <option value="online">Online</option>
                    </select>
                    <div className="flex gap-2">
                        <button onClick={handleSubmit} disabled={!form.courseId} className="btn-primary flex-1 disabled:opacity-50">
                            {editEntry ? 'Save' : 'Add Class'}
                        </button>
                        {editEntry && (
                            <button onClick={() => { dispatch({ type: 'DELETE_SCHEDULE', payload: editEntry.id }); onClose(); }} className="btn-danger">
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ClassSchedule() {
    const { state, dispatch } = useApp();
    const { schedule, courses } = state;
    const [viewMode, setViewMode] = useState('week');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editEntry, setEditEntry] = useState(null);

    const today = new Date();
    const currentDay = DAYS_OF_WEEK[today.getDay()];
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    const timeSlots = getTimeSlots(7, 21);

    const getBlockStyle = (entry) => {
        const [startH, startM] = entry.startTime.split(':').map(Number);
        const [endH, endM] = entry.endTime.split(':').map(Number);
        const top = ((startH - 7) * 60 + startM) * (60 / 60); // 60px per hour
        const height = ((endH - startH) * 60 + (endM - startM)) * (60 / 60);
        return { top: `${top}px`, height: `${Math.max(height, 20)}px` };
    };

    const currentTimeTop = ((currentHour - 7) * 60 + currentMinute) * (60 / 60);

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-txt-dark">Class Schedule</h1>
                    <p className="text-sm text-gray-400">{schedule.length} classes</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-gray-100 dark:bg-surface2-dark rounded-xl p-0.5">
                        {[{ id: 'week', icon: Grid3X3 }, { id: 'list', icon: List }].map(v => (
                            <button key={v.id} onClick={() => setViewMode(v.id)}
                                className={`p-2 rounded-lg transition-all ${viewMode === v.id ? 'bg-white dark:bg-surface-dark shadow-sm' : 'text-gray-400'}`}>
                                <v.icon size={16} />
                            </button>
                        ))}
                    </div>
                    <button onClick={() => { setEditEntry(null); setShowAddModal(true); }} className="btn-primary flex items-center gap-2">
                        <Plus size={16} /> Add Class
                    </button>
                </div>
            </div>

            {viewMode === 'week' ? (
                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Day headers */}
                            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 dark:border-border-dark">
                                <div className="p-2" />
                                {DAYS_OF_WEEK.map(day => (
                                    <div key={day} className={`p-3 text-center text-xs font-semibold ${day === currentDay ? 'text-primary-light dark:text-primary-dark bg-primary-light/5 dark:bg-primary-dark/5' : 'text-gray-400'}`}>
                                        {DAYS_SHORT[DAYS_OF_WEEK.indexOf(day)]}
                                    </div>
                                ))}
                            </div>

                            {/* Time grid */}
                            <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${(21 - 7) * 60}px` }}>
                                {/* Time labels */}
                                <div className="relative">
                                    {timeSlots.map((slot, i) => (
                                        <div key={slot} className="absolute text-[10px] text-gray-400 pr-2 text-right w-full" style={{ top: `${i * 60}px` }}>
                                            {formatTime(slot)}
                                        </div>
                                    ))}
                                </div>

                                {/* Day columns */}
                                {DAYS_OF_WEEK.map((day, dayIdx) => (
                                    <div key={day} className={`relative border-l border-gray-50 dark:border-border-dark/50 ${day === currentDay ? 'bg-primary-light/[0.02] dark:bg-primary-dark/[0.02]' : ''}`}>
                                        {/* Horizontal grid lines */}
                                        {timeSlots.map((_, i) => (
                                            <div key={i} className="absolute left-0 right-0 border-t border-gray-50 dark:border-border-dark/30" style={{ top: `${i * 60}px` }} />
                                        ))}

                                        {/* Schedule blocks */}
                                        {schedule.filter(s => s.day === day).map(entry => {
                                            const course = courses.find(c => c.id === entry.courseId);
                                            const style = getBlockStyle(entry);
                                            return (
                                                <div key={entry.id}
                                                    onClick={() => { setEditEntry(entry); setShowAddModal(true); }}
                                                    className="absolute left-1 right-1 rounded-lg p-1.5 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden text-white text-[10px] shadow-sm"
                                                    style={{ ...style, backgroundColor: entry.color || course?.color || '#6C63FF' }}>
                                                    <p className="font-semibold truncate">{course?.name || 'Class'}</p>
                                                    <p className="opacity-80 truncate">{entry.room} · {entry.type}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* Current time line */}
                                {currentHour >= 7 && currentHour <= 21 && (
                                    <div className="absolute left-[60px] right-0 flex items-center z-10 pointer-events-none" style={{ top: `${currentTimeTop}px` }}>
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <div className="flex-1 h-px bg-red-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* List view */
                <div className="space-y-3">
                    {DAYS_OF_WEEK.map(day => {
                        const daySchedule = schedule.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                        if (daySchedule.length === 0) return null;
                        return (
                            <div key={day}>
                                <h3 className={`text-xs font-bold mb-2 ${day === currentDay ? 'text-primary-light dark:text-primary-dark' : 'text-gray-400'}`}>
                                    {day.toUpperCase()} {day === currentDay && '(TODAY)'}
                                </h3>
                                {daySchedule.map(entry => {
                                    const course = courses.find(c => c.id === entry.courseId);
                                    return (
                                        <div key={entry.id} onClick={() => { setEditEntry(entry); setShowAddModal(true); }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark mb-2 card-hover cursor-pointer">
                                            <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: entry.color || course?.color }} />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium dark:text-txt-dark">{course?.icon} {course?.name || 'Class'}</p>
                                                <p className="text-xs text-gray-400">{formatTime(entry.startTime)} – {formatTime(entry.endTime)} · {entry.room || 'TBD'} · {entry.type}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                    {schedule.length === 0 && (
                        <div className="text-center py-12"><p className="text-4xl mb-3">📅</p><p className="text-sm text-gray-400">No classes scheduled yet.</p></div>
                    )}
                </div>
            )}

            <AddClassModal show={showAddModal} onClose={() => { setShowAddModal(false); setEditEntry(null); }} courses={courses} dispatch={dispatch} editEntry={editEntry} />
        </div>
    );
}
