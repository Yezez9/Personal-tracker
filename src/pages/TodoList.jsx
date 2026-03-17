import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { getDateGroup, formatDate, formatTime, generateId, TAG_OPTIONS, PRESET_COLORS } from '../utils/helpers';
import { parseNaturalLanguageTask } from '../utils/aiService';
import {
    Plus, Filter, SortAsc, ChevronDown, ChevronUp, Check, X, Sparkles, Trash2, Edit3, Clock, Tag, AlertTriangle
} from 'lucide-react';

// ─── Unified Task Modal (Add + Edit) ────────────────────────────────
function TaskModal({ show, onClose, courses, dispatch, editTask }) {
    const isEdit = !!editTask;
    const [mode, setMode] = useState('manual');
    const [aiInput, setAiInput] = useState('');
    const [form, setForm] = useState(
        isEdit
            ? {
                title: editTask.title || '',
                course: editTask.course || '',
                dueDate: editTask.dueDate || '',
                dueTime: editTask.dueTime || '',
                priority: editTask.priority || 'medium',
                description: editTask.description || '',
                tags: editTask.tags || [],
                subtodos: editTask.subtodos || [],
                status: editTask.status || 'pending',
            }
            : { title: '', course: '', dueDate: '', dueTime: '', priority: 'medium', description: '', tags: [], subtodos: [], status: 'pending' }
    );
    const [newSubtodo, setNewSubtodo] = useState('');
    const [editingSubtodo, setEditingSubtodo] = useState(null);
    const [aiParsing, setAiParsing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    if (!show) return null;

    const handleAIParse = async () => {
        setAiParsing(true);
        const parsed = await parseNaturalLanguageTask(aiInput, courses);
        setForm(prev => ({ ...prev, ...parsed }));
        setMode('manual');
        setAiParsing(false);
    };

    const addSubtodo = () => {
        if (!newSubtodo.trim()) return;
        setForm(prev => ({ ...prev, subtodos: [...prev.subtodos, { id: generateId(), title: newSubtodo, done: false }] }));
        setNewSubtodo('');
    };

    const toggleTag = (tag) => {
        setForm(prev => ({
            ...prev,
            tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
        }));
    };

    const handleSubmit = () => {
        if (!form.title.trim()) return;
        if (isEdit) {
            dispatch({ type: 'UPDATE_TODO', payload: { id: editTask.id, updates: form } });
            // Rescore after edit
            setTimeout(() => dispatch({ type: 'RESCORE_ALL_TODOS' }), 100);
        } else {
            dispatch({ type: 'ADD_TODO', payload: form });
        }
        onClose();
    };

    const handleDelete = () => {
        dispatch({ type: 'DELETE_TODO', payload: editTask.id });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative glass-strong rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold dark:text-txt-dark">{isEdit ? 'Edit Task' : 'Add Task'}</h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            <X size={18} className="dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Mode toggle (only for Add) */}
                    {!isEdit && (
                        <div className="flex gap-2 mb-5">
                            <button
                                onClick={() => setMode('manual')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${mode === 'manual' ? 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                            >
                                Manual Entry
                            </button>
                            <button
                                onClick={() => setMode('ai')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${mode === 'ai' ? 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                            >
                                <Sparkles size={12} /> AI Fill
                            </button>
                        </div>
                    )}

                    {mode === 'ai' && !isEdit ? (
                        <div className="space-y-3">
                            <textarea
                                placeholder='e.g., "Submit math homework by Friday, high priority"'
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                className="input-field h-24 resize-none"
                            />
                            <button onClick={handleAIParse} disabled={!aiInput.trim() || aiParsing} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                                <Sparkles size={14} /> {aiParsing ? 'Parsing...' : 'Parse with AI'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <input placeholder="Task title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" />

                            <select value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))} className="input-field">
                                <option value="">Select course (optional)</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>

                            <div className="grid grid-cols-2 gap-3">
                                <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="input-field" />
                                <input type="time" value={form.dueTime} onChange={e => setForm(p => ({ ...p, dueTime: e.target.value }))} className="input-field" />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Priority</label>
                                <div className="flex gap-2">
                                    {['low', 'medium', 'high'].map(p => (
                                        <button key={p} onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all ${form.priority === p
                                                ? p === 'high' ? 'bg-red-500 text-white' : p === 'medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                                                : 'bg-gray-100 dark:bg-surface2-dark text-gray-500 dark:text-gray-400'
                                                }`}>
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status (only in edit mode) */}
                            {isEdit && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Status</label>
                                    <div className="flex gap-2">
                                        {['pending', 'in_progress', 'completed'].map(s => (
                                            <button key={s} onClick={() => setForm(prev => ({ ...prev, status: s }))}
                                                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${form.status === s
                                                    ? s === 'completed' ? 'bg-green-500 text-white' : s === 'in_progress' ? 'bg-amber-500 text-white' : 'bg-primary-light text-white dark:bg-primary-dark'
                                                    : 'bg-gray-100 dark:bg-surface2-dark text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                {s === 'in_progress' ? 'In Progress' : s === 'pending' ? 'Pending' : 'Completed'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field h-20 resize-none" />

                            {/* Tags */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Tags</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {TAG_OPTIONS.map(tag => (
                                        <button key={tag} onClick={() => toggleTag(tag)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${form.tags.includes(tag)
                                                ? 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark'
                                                : 'bg-gray-100 dark:bg-surface2-dark text-gray-400'
                                                }`}>
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sub-todos */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Sub-tasks</label>
                                {form.subtodos.map(st => (
                                    <div key={st.id} className="flex items-center gap-2 py-1">
                                        {editingSubtodo === st.id ? (
                                            <input
                                                autoFocus
                                                value={st.title}
                                                onChange={e => setForm(p => ({ ...p, subtodos: p.subtodos.map(s => s.id === st.id ? { ...s, title: e.target.value } : s) }))}
                                                onBlur={() => setEditingSubtodo(null)}
                                                onKeyDown={e => e.key === 'Enter' && setEditingSubtodo(null)}
                                                className="input-field flex-1 text-sm py-1"
                                            />
                                        ) : (
                                            <span
                                                className="text-sm dark:text-gray-300 flex-1 cursor-pointer hover:text-primary-light dark:hover:text-primary-dark"
                                                onClick={() => setEditingSubtodo(st.id)}
                                            >
                                                • {st.title}
                                            </span>
                                        )}
                                        <button onClick={() => setForm(p => ({ ...p, subtodos: p.subtodos.filter(s => s.id !== st.id) }))} className="text-gray-300 hover:text-red-400">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <input placeholder="Add sub-task..." value={newSubtodo} onChange={e => setNewSubtodo(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addSubtodo()} className="input-field flex-1" />
                                    <button onClick={addSubtodo} className="btn-ghost text-primary-light dark:text-primary-dark text-sm">Add</button>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                {isEdit && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all flex items-center gap-2"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                )}
                                <button onClick={handleSubmit} disabled={!form.title.trim()} className="btn-primary flex-1 disabled:opacity-50">
                                    {isEdit ? 'Save Changes' : 'Add Task'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-red-500" />
                            </div>
                            <h3 className="text-base font-bold dark:text-txt-dark">Delete Task?</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Are you sure you want to delete this task? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-surface2-dark text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Task Item with Edit button + Swipe Actions ─────────────────────
function TaskItem({ task, courses, dispatch, expanded, onToggle, onEdit }) {
    const course = courses.find(c => c.id === task.course);
    const subtodoProgress = task.subtodos?.length > 0
        ? Math.round((task.subtodos.filter(s => s.done).length / task.subtodos.length) * 100)
        : null;
    const touchStartX = useRef(0);
    const touchDeltaX = useRef(0);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const cardRef = useRef(null);

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchDeltaX.current = 0;
    };

    const handleTouchMove = (e) => {
        const delta = e.touches[0].clientX - touchStartX.current;
        touchDeltaX.current = delta;
        if (delta < 0) {
            setSwipeOffset(Math.max(-130, delta));
        } else if (swipeOffset < 0) {
            setSwipeOffset(Math.min(0, swipeOffset + delta));
        }
    };

    const handleTouchEnd = () => {
        if (touchDeltaX.current < -60) {
            setSwipeOffset(-130);
        } else {
            setSwipeOffset(0);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Swipe reveal actions (behind the card) */}
            <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-0">
                <button
                    onClick={() => { onEdit(task); setSwipeOffset(0); }}
                    className="w-[65px] flex items-center justify-center bg-blue-500 text-white"
                >
                    <div className="flex flex-col items-center gap-0.5">
                        <Edit3 size={16} />
                        <span className="text-[10px] font-medium">Edit</span>
                    </div>
                </button>
                <button
                    onClick={() => { dispatch({ type: 'DELETE_TODO', payload: task.id }); setSwipeOffset(0); }}
                    className="w-[65px] flex items-center justify-center bg-red-500 text-white"
                >
                    <div className="flex flex-col items-center gap-0.5">
                        <Trash2 size={16} />
                        <span className="text-[10px] font-medium">Delete</span>
                    </div>
                </button>
            </div>

            {/* Main card (slides left on swipe) */}
            <div
                ref={cardRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 || swipeOffset === -130 ? 'transform 0.25s ease' : 'none' }}
                className={`relative z-10 border transition-all duration-200 bg-white dark:bg-surface-dark card-hover ${task.status === 'completed'
                    ? 'border-gray-100 dark:border-border-dark/50'
                    : task.status === 'in_progress'
                        ? 'border-amber-200 dark:border-amber-800/30'
                        : 'border-gray-200 dark:border-border-dark'
                    }`}>
                
                {/* Status overlays to prevent transparent background bleeding */}
                {task.status === 'in_progress' && <div className="absolute inset-0 bg-amber-50/50 dark:bg-amber-900/10 pointer-events-none" />}
                {task.status === 'completed' && <div className="absolute inset-0 bg-gray-50/80 dark:bg-surface2-dark/50 pointer-events-none" />}

                <div className={`relative p-4 flex items-start gap-3 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                    {/* Checkbox */}
                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_TODO_STATUS', payload: task.id })}
                        className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.status === 'completed'
                            ? 'bg-green-500 border-green-500 text-white'
                            : task.status === 'in_progress'
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'border-gray-300 dark:border-gray-600 hover:border-primary-light dark:hover:border-primary-dark'
                            }`}
                    >
                        {task.status === 'completed' && <Check size={12} />}
                        {task.status === 'in_progress' && <span className="text-[10px]">🔄</span>}
                    </button>

                    <div className="flex-1 min-w-0" onClick={onToggle}>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium cursor-pointer ${task.status === 'completed' ? 'line-through text-gray-400' : task.status === 'in_progress' ? 'text-amber-700 dark:text-amber-400' : 'dark:text-txt-dark'}`}>
                                {task.title}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize priority-${task.priority}`}>
                                {task.priority}
                            </span>
                            {task.aiPriorityScore > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${task.aiPriorityScore >= 75 ? 'bg-red-500/10 text-red-500' : task.aiPriorityScore >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}
                                    title={task.aiPriorityReason}>
                                    AI:{task.aiPriorityScore}
                                </span>
                            )}
                            {task.coinReward && !task.coinsAwarded && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" title="Coin reward for completing">
                                    🪙 {task.coinReward.baseCoins}
                                </span>
                            )}
                            {task.coinsAwarded && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-green-500/10 text-green-500" title="Coins already claimed for this task">
                                    ✅ Claimed
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {course && (
                                <span className="text-[11px] font-medium" style={{ color: course.color }}>{course.icon} {course.name}</span>
                            )}
                            {task.dueDate && (
                                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                    <Clock size={10} /> {formatDate(task.dueDate)} {task.dueTime ? formatTime(task.dueTime) : ''}
                                </span>
                            )}
                            {task.tags?.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-surface2-dark text-gray-500 dark:text-gray-400">{tag}</span>
                            ))}
                        </div>

                        {subtodoProgress !== null && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-primary-light to-accent-light transition-all duration-300" style={{ width: `${subtodoProgress}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400">{subtodoProgress}%</span>
                            </div>
                        )}
                    </div>

                    {/* Edit button (always visible) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                        title="Edit task"
                    >
                        <Edit3 size={14} className="text-gray-400 hover:text-primary-light dark:hover:text-primary-dark" />
                    </button>

                    <button onClick={onToggle} className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>
                </div>

                {/* Expanded content */}
                {expanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 dark:border-border-dark/50 pt-3 animate-fade-in">
                        {task.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{task.description}</p>}

                        {task.aiPriorityReason && (
                            <div className="text-xs text-gray-400 italic mb-3 flex items-start gap-1.5">
                                <Sparkles size={12} className="text-primary-light dark:text-primary-dark flex-shrink-0 mt-0.5" />
                                {task.aiPriorityReason}
                            </div>
                        )}

                        {task.subtodos?.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                                {task.subtodos.map(st => (
                                    <label key={st.id} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox" checked={st.done}
                                            onChange={() => dispatch({ type: 'TOGGLE_SUBTODO', payload: { todoId: task.id, subtodoId: st.id } })}
                                            className="w-3.5 h-3.5 rounded border-gray-300 text-primary-light focus:ring-primary-light/30"
                                        />
                                        <span className={`text-sm ${st.done ? 'line-through text-gray-400' : 'dark:text-gray-300'}`}>{st.title}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => onEdit(task)} className="text-xs text-primary-light dark:text-primary-dark hover:underline flex items-center gap-1 transition-colors">
                                <Edit3 size={12} /> Edit task
                            </button>
                            <button onClick={() => dispatch({ type: 'DELETE_TODO', payload: task.id })} className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                <Trash2 size={12} /> Delete task
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main TodoList ──────────────────────────────────────────────────
export default function TodoList() {
    const { state, dispatch } = useApp();
    const { todos, courses } = state;
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [filter, setFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('');
    const [sortBy, setSortBy] = useState('dueDate');
    const [expandedTask, setExpandedTask] = useState(null);

    const todayStr = new Date().toISOString().split('T')[0];

    const filteredTodos = useMemo(() => {
        let items = [...todos];

        if (filter === 'today') items = items.filter(t => t.dueDate === todayStr);
        else if (filter === 'upcoming') items = items.filter(t => t.dueDate > todayStr && t.status !== 'completed');
        else if (filter === 'pending') items = items.filter(t => t.status === 'pending');
        else if (filter === 'in_progress') items = items.filter(t => t.status === 'in_progress');
        else if (filter === 'completed') items = items.filter(t => t.status === 'completed');

        if (courseFilter) items = items.filter(t => t.course === courseFilter);

        if (sortBy === 'dueDate') items.sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
        else if (sortBy === 'aiPriority') items.sort((a, b) => (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0));
        else if (sortBy === 'priority') {
            const order = { high: 0, medium: 1, low: 2 };
            items.sort((a, b) => order[a.priority] - order[b.priority]);
        }

        return items;
    }, [todos, filter, courseFilter, sortBy, todayStr]);

    const grouped = useMemo(() => {
        if (filter === 'completed' || filter === 'in_progress' || sortBy !== 'dueDate') return { _all: filteredTodos };
        const groups = {};
        filteredTodos.forEach(t => {
            const g = t.status === 'completed' ? 'COMPLETED' : t.status === 'in_progress' ? 'IN PROGRESS' : getDateGroup(t.dueDate);
            if (!groups[g]) groups[g] = [];
            groups[g].push(t);
        });
        return groups;
    }, [filteredTodos, filter, sortBy]);

    const groupOrder = ['OVERDUE', 'TODAY', 'TOMORROW', 'THIS WEEK', 'IN PROGRESS', 'LATER', 'COMPLETED', '_all'];
    const groupColors = {
        OVERDUE: 'text-red-500',
        TODAY: 'text-primary-light dark:text-primary-dark',
        TOMORROW: 'text-yellow-500',
        'THIS WEEK': 'text-accent-light dark:text-accent-dark',
        'IN PROGRESS': 'text-amber-500',
        LATER: 'text-gray-400',
        COMPLETED: 'text-green-500',
    };

    const openAdd = () => { setEditingTask(null); setShowModal(true); };
    const openEdit = (task) => { setEditingTask(task); setShowModal(true); };
    const closeModal = () => { setEditingTask(null); setShowModal(false); };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-txt-dark">To-Do List</h1>
                    <p className="text-sm text-gray-400">{todos.filter(t => t.status !== 'completed').length} active tasks</p>
                </div>
                <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Add Task
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {['all', 'today', 'upcoming', 'in_progress', 'pending', 'completed'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === f
                            ? f === 'in_progress' ? 'bg-amber-500/10 text-amber-500' : f === 'pending' ? 'bg-purple-500/10 text-purple-500' : 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}>
                        {f === 'in_progress' ? '⏳ In Progress' : f === 'pending' ? '✨ Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Sort + course filter */}
            <div className="flex gap-3 items-center flex-wrap">
                <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="input-field w-auto text-xs py-1.5">
                    <option value="">All courses</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field w-auto text-xs py-1.5">
                    <option value="dueDate">Sort: Due Date</option>
                    <option value="aiPriority">Sort: AI Priority</option>
                    <option value="priority">Sort: Priority</option>
                </select>
            </div>

            {/* Task Groups */}
            {groupOrder
                .filter(g => grouped[g]?.length > 0)
                .map(group => (
                    <div key={group} className="space-y-2">
                        {group !== '_all' && (
                            <div className="flex items-center gap-2 pt-2">
                                <h3 className={`text-xs font-bold tracking-wider ${groupColors[group] || 'text-gray-400'}`}>
                                    {group}
                                </h3>
                                <div className="flex-1 h-px bg-gray-100 dark:bg-border-dark" />
                                <span className="text-[10px] text-gray-400">{grouped[group].length}</span>
                            </div>
                        )}
                        {grouped[group].map(task => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                courses={courses}
                                dispatch={dispatch}
                                expanded={expandedTask === task.id}
                                onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                                onEdit={openEdit}
                            />
                        ))}
                    </div>
                ))}

            {filteredTodos.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-4xl mb-3">📝</p>
                    <p className="text-sm text-gray-400">No tasks found. Add one to get started!</p>
                </div>
            )}

            <TaskModal
                show={showModal}
                onClose={closeModal}
                courses={courses}
                dispatch={dispatch}
                editTask={editingTask}
                key={editingTask?.id || 'new'}
            />
        </div>
    );
}
