import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { getDateGroup, formatDate, formatTime, generateId, TAG_OPTIONS, PRESET_COLORS } from '../utils/helpers';
import { parseNaturalLanguageTask } from '../utils/aiService';
import {
    Plus, Filter, SortAsc, ChevronDown, ChevronUp, Check, X, Sparkles, Trash2, Edit3, Clock, Tag
} from 'lucide-react';

function AddTaskModal({ show, onClose, courses, dispatch }) {
    const [mode, setMode] = useState('manual'); // manual | ai
    const [aiInput, setAiInput] = useState('');
    const [form, setForm] = useState({
        title: '', course: '', dueDate: '', dueTime: '', priority: 'medium',
        description: '', tags: [], subtodos: [],
    });
    const [newSubtodo, setNewSubtodo] = useState('');
    const [aiParsing, setAiParsing] = useState(false);

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
        dispatch({ type: 'ADD_TODO', payload: form });
        onClose();
        setForm({ title: '', course: '', dueDate: '', dueTime: '', priority: 'medium', description: '', tags: [], subtodos: [] });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative glass-strong rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold dark:text-txt-dark">Add Task</h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            <X size={18} className="dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Mode toggle */}
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

                    {mode === 'ai' ? (
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
                                        <span className="text-sm dark:text-gray-300">• {st.title}</span>
                                        <button onClick={() => setForm(p => ({ ...p, subtodos: p.subtodos.filter(s => s.id !== st.id) }))} className="text-gray-300 hover:text-red-400"><X size={12} /></button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <input placeholder="Add sub-task..." value={newSubtodo} onChange={e => setNewSubtodo(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addSubtodo()} className="input-field flex-1" />
                                    <button onClick={addSubtodo} className="btn-ghost text-primary-light dark:text-primary-dark text-sm">Add</button>
                                </div>
                            </div>

                            <button onClick={handleSubmit} disabled={!form.title.trim()} className="btn-primary w-full disabled:opacity-50">
                                Add Task
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TaskItem({ task, courses, dispatch, expanded, onToggle }) {
    const course = courses.find(c => c.id === task.course);
    const subtodoProgress = task.subtodos?.length > 0
        ? Math.round((task.subtodos.filter(s => s.done).length / task.subtodos.length) * 100)
        : null;

    return (
        <div className={`rounded-xl border transition-all duration-200 ${task.status === 'completed'
            ? 'bg-gray-50 dark:bg-surface2-dark/50 border-gray-100 dark:border-border-dark/50 opacity-60'
            : 'bg-white dark:bg-surface-dark border-gray-200 dark:border-border-dark card-hover'
            }`}>
            <div className="p-4 flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_TODO_STATUS', payload: task.id })}
                    className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-light dark:hover:border-primary-dark'
                        }`}
                >
                    {task.status === 'completed' && <Check size={12} />}
                </button>

                <div className="flex-1 min-w-0" onClick={onToggle}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium cursor-pointer ${task.status === 'completed' ? 'line-through text-gray-400' : 'dark:text-txt-dark'}`}>
                            {task.title}
                        </span>
                        {/* Priority badge */}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize priority-${task.priority}`}>
                            {task.priority}
                        </span>
                        {/* AI Score */}
                        {task.aiPriorityScore > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${task.aiPriorityScore >= 75 ? 'bg-red-500/10 text-red-500' : task.aiPriorityScore >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}
                                title={task.aiPriorityReason}>
                                AI:{task.aiPriorityScore}
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

                    <button onClick={() => dispatch({ type: 'DELETE_TODO', payload: task.id })} className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                        <Trash2 size={12} /> Delete task
                    </button>
                </div>
            )}
        </div>
    );
}

export default function TodoList() {
    const { state, dispatch } = useApp();
    const { todos, courses } = state;
    const [showAddModal, setShowAddModal] = useState(false);
    const [filter, setFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('');
    const [sortBy, setSortBy] = useState('dueDate');
    const [expandedTask, setExpandedTask] = useState(null);

    const todayStr = new Date().toISOString().split('T')[0];

    const filteredTodos = useMemo(() => {
        let items = [...todos];

        // Filter
        if (filter === 'today') items = items.filter(t => t.dueDate === todayStr);
        else if (filter === 'upcoming') items = items.filter(t => t.dueDate > todayStr && t.status !== 'completed');
        else if (filter === 'overdue') items = items.filter(t => t.dueDate < todayStr && t.status !== 'completed');
        else if (filter === 'completed') items = items.filter(t => t.status === 'completed');

        // Course filter
        if (courseFilter) items = items.filter(t => t.course === courseFilter);

        // Sort
        if (sortBy === 'dueDate') items.sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
        else if (sortBy === 'aiPriority') items.sort((a, b) => (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0));
        else if (sortBy === 'priority') {
            const order = { high: 0, medium: 1, low: 2 };
            items.sort((a, b) => order[a.priority] - order[b.priority]);
        }

        return items;
    }, [todos, filter, courseFilter, sortBy, todayStr]);

    // Group by date
    const grouped = useMemo(() => {
        if (filter === 'completed' || sortBy !== 'dueDate') return { _all: filteredTodos };
        const groups = {};
        filteredTodos.forEach(t => {
            const g = t.status === 'completed' ? 'COMPLETED' : getDateGroup(t.dueDate);
            if (!groups[g]) groups[g] = [];
            groups[g].push(t);
        });
        return groups;
    }, [filteredTodos, filter, sortBy]);

    const groupOrder = ['OVERDUE', 'TODAY', 'TOMORROW', 'THIS WEEK', 'LATER', 'COMPLETED', '_all'];
    const groupColors = {
        OVERDUE: 'text-red-500',
        TODAY: 'text-primary-light dark:text-primary-dark',
        TOMORROW: 'text-yellow-500',
        'THIS WEEK': 'text-accent-light dark:text-accent-dark',
        LATER: 'text-gray-400',
        COMPLETED: 'text-green-500',
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-txt-dark">To-Do List</h1>
                    <p className="text-sm text-gray-400">{todos.filter(t => t.status !== 'completed').length} active tasks</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Add Task
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {['all', 'today', 'upcoming', 'overdue', 'completed'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${filter === f
                            ? 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}>
                        {f}
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

            <AddTaskModal show={showAddModal} onClose={() => setShowAddModal(false)} courses={courses} dispatch={dispatch} />
        </div>
    );
}
