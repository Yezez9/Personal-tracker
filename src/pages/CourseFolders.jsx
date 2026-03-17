import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { PRESET_COLORS, PRESET_EMOJIS, formatDate, formatRelativeDate } from '../utils/helpers';
import { Plus, X, ArrowLeft, FileText, Link2, BookOpen, CheckSquare, StickyNote, Trash2, ExternalLink, Edit3 } from 'lucide-react';

function CourseModal({ show, onClose, course, dispatch }) {
    const [form, setForm] = useState(course || { name: '', code: '', color: PRESET_COLORS[0], icon: '📚', professor: '' });

    useEffect(() => {
        if (show) {
            setForm(course || { name: '', code: '', color: PRESET_COLORS[0], icon: '📚', professor: '' });
        }
    }, [show, course]);

    if (!show) return null;

    const handleSubmit = () => {
        if (!form.name.trim()) return;
        dispatch({ type: course ? 'UPDATE_COURSE' : 'ADD_COURSE', payload: form });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative glass-strong rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold dark:text-txt-dark">{course ? 'Edit Course' : 'Add Course'}</h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><X size={18} className="dark:text-gray-400" /></button>
                    </div>
                    <input placeholder="Course name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" />
                    <input placeholder="Course code (e.g., MATH101)" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="input-field" />
                    <input placeholder="Professor name" value={form.professor} onChange={e => setForm(p => ({ ...p, professor: e.target.value }))} className="input-field" />
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(c => (
                                <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                                    className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-surface-dark scale-110' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_EMOJIS.map(e => (
                                <button key={e} onClick={() => setForm(p => ({ ...p, icon: e }))}
                                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === e ? 'bg-gray-200 dark:bg-surface2-dark scale-110' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSubmit} disabled={!form.name.trim()} className="btn-primary w-full disabled:opacity-50">
                        {course ? 'Save Changes' : 'Add Course'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CourseDetail({ course, onBack }) {
    const { state, dispatch } = useApp();
    const [activeTab, setActiveTab] = useState('files');
    const [noteText, setNoteText] = useState(course.notes || '');
    const [newLink, setNewLink] = useState({ url: '', title: '', description: '' });
    const [showAddLink, setShowAddLink] = useState(false);
    const [newFile, setNewFile] = useState({ name: '', type: 'pdf', url: '' });
    const [showAddFile, setShowAddFile] = useState(false);

    const courseTodos = state.todos.filter(t => t.course === course.id);
    const courseStudySets = state.studySets.filter(s => s.courseId === course.id);
    const courseLinks = course.links || [];
    const courseFiles = course.files || [];

    const tabs = [
        { id: 'files', label: 'Files', icon: FileText, count: courseFiles.length },
        { id: 'links', label: 'Links', icon: Link2, count: courseLinks.length },
        { id: 'studysets', label: 'Study Sets', icon: BookOpen, count: courseStudySets.length },
        { id: 'todos', label: 'To-Dos', icon: CheckSquare, count: courseTodos.length },
        { id: 'notes', label: 'Notes', icon: StickyNote },
    ];

    const saveNote = () => {
        dispatch({ type: 'UPDATE_COURSE', payload: { id: course.id, notes: noteText } });
    };

    const addLink = () => {
        if (!newLink.url.trim()) return;
        const links = [...courseLinks, { ...newLink, id: Date.now().toString() }];
        dispatch({ type: 'UPDATE_COURSE', payload: { id: course.id, links } });
        setNewLink({ url: '', title: '', description: '' });
        setShowAddLink(false);
    };

    const removeLink = (id) => {
        dispatch({ type: 'UPDATE_COURSE', payload: { id: course.id, links: courseLinks.filter(l => l.id !== id) } });
    };

    const addFile = () => {
        if (!newFile.name.trim()) return;
        const files = [...courseFiles, { ...newFile, id: Date.now().toString() }];
        dispatch({ type: 'UPDATE_COURSE', payload: { id: course.id, files } });
        setNewFile({ name: '', type: 'pdf', url: '' });
        setShowAddFile(false);
    };

    const removeFile = (id) => {
        dispatch({ type: 'UPDATE_COURSE', payload: { id: course.id, files: courseFiles.filter(f => f.id !== id) } });
    };

    const fileIcons = { pdf: '📄', docx: '📝', pptx: '📊', img: '🖼️', other: '📎' };

    return (
        <div className="animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-4">
                <ArrowLeft size={16} /> Back to Courses
            </button>

            <div className="rounded-2xl border border-gray-200 dark:border-border-dark overflow-hidden mb-6" style={{ borderTopColor: course.color, borderTopWidth: '3px' }}>
                <div className="p-6 bg-white dark:bg-surface-dark">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{course.icon}</span>
                        <div>
                            <h2 className="text-xl font-bold dark:text-txt-dark">{course.name}</h2>
                            <p className="text-sm text-gray-400">{course.code} {course.professor ? `• Prof. ${course.professor}` : ''}</p>
                        </div>
                    </div>
                </div>

                <div className="flex border-t border-gray-100 dark:border-border-dark overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}>
                                <Icon size={14} />
                                {tab.label}
                                {tab.count !== undefined && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-surface2-dark">{tab.count}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-5">
                {activeTab === 'files' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold dark:text-txt-dark">Files</h3>
                            <button onClick={() => setShowAddFile(!showAddFile)} className="text-xs text-primary-light dark:text-primary-dark font-medium flex items-center gap-1">
                                <Plus size={14} /> Add File
                            </button>
                        </div>
                        {showAddFile && (
                            <div className="space-y-2 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-surface2-dark animate-fade-in">
                                <input placeholder="File name" value={newFile.name} onChange={e => setNewFile(p => ({ ...p, name: e.target.value }))} className="input-field" />
                                <div className="flex gap-2">
                                    <select value={newFile.type} onChange={e => setNewFile(p => ({ ...p, type: e.target.value }))} className="input-field w-auto">
                                        <option value="pdf">PDF</option><option value="docx">DOCX</option><option value="pptx">PPTX</option><option value="img">Image</option><option value="other">Other</option>
                                    </select>
                                    <input placeholder="URL (optional)" value={newFile.url} onChange={e => setNewFile(p => ({ ...p, url: e.target.value }))} className="input-field flex-1" />
                                </div>
                                <button onClick={addFile} disabled={!newFile.name.trim()} className="btn-primary text-xs disabled:opacity-50">Add</button>
                            </div>
                        )}
                        {courseFiles.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No files yet</p> : (
                            <div className="space-y-2">
                                {courseFiles.map(f => (
                                    <div key={f.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <span className="text-lg">{fileIcons[f.type] || '📎'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium dark:text-txt-dark truncate">{f.name}</p>
                                            <p className="text-[10px] text-gray-400 uppercase">{f.type}</p>
                                        </div>
                                        {f.url && <a href={f.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary-light"><ExternalLink size={14} /></a>}
                                        <button onClick={() => removeFile(f.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'links' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold dark:text-txt-dark">Links</h3>
                            <button onClick={() => setShowAddLink(!showAddLink)} className="text-xs text-primary-light dark:text-primary-dark font-medium flex items-center gap-1">
                                <Plus size={14} /> Add Link
                            </button>
                        </div>
                        {showAddLink && (
                            <div className="space-y-2 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-surface2-dark animate-fade-in">
                                <input placeholder="URL" value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} className="input-field" />
                                <input placeholder="Title" value={newLink.title} onChange={e => setNewLink(p => ({ ...p, title: e.target.value }))} className="input-field" />
                                <input placeholder="Description" value={newLink.description} onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))} className="input-field" />
                                <button onClick={addLink} disabled={!newLink.url.trim()} className="btn-primary text-xs disabled:opacity-50">Add Link</button>
                            </div>
                        )}
                        {courseLinks.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No links yet</p> : (
                            <div className="space-y-2">
                                {courseLinks.map(l => (
                                    <div key={l.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <div className="w-8 h-8 rounded-lg bg-primary-light/10 flex items-center justify-center flex-shrink-0">
                                            <Link2 size={14} className="text-primary-light" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium dark:text-txt-dark truncate">{l.title || l.url}</p>
                                            {l.description && <p className="text-[10px] text-gray-400 truncate">{l.description}</p>}
                                        </div>
                                        <a href={l.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary-light"><ExternalLink size={14} /></a>
                                        <button onClick={() => removeLink(l.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'studysets' && (
                    <div>
                        <h3 className="text-sm font-semibold dark:text-txt-dark mb-4">Study Sets</h3>
                        {courseStudySets.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No study sets linked to this course</p> : (
                            <div className="space-y-2">
                                {courseStudySets.map(s => (
                                    <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => { /* navigate to study sets */ }}>
                                        <span className="text-lg">🃏</span>
                                        <div>
                                            <p className="text-sm font-medium dark:text-txt-dark">{s.title}</p>
                                            <p className="text-[10px] text-gray-400">{s.cards?.length || 0} cards</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'todos' && (
                    <div>
                        <h3 className="text-sm font-semibold dark:text-txt-dark mb-4">Tasks for {course.name}</h3>
                        {courseTodos.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No tasks for this course</p> : (
                            <div className="space-y-2">
                                {courseTodos.map(t => (
                                    <div key={t.id} className="flex items-center gap-3 py-2">
                                        <span className={`w-2 h-2 rounded-full ${t.status === 'completed' ? 'bg-green-500' : t.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                        <span className={`text-sm ${t.status === 'completed' ? 'line-through text-gray-400' : 'dark:text-gray-300'}`}>{t.title}</span>
                                        <span className="text-[10px] text-gray-400 ml-auto">{t.dueDate ? formatDate(t.dueDate) : ''}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div>
                        <h3 className="text-sm font-semibold dark:text-txt-dark mb-4">Notes</h3>
                        <textarea
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onBlur={saveNote}
                            placeholder="Write your notes here..."
                            className="input-field h-64 resize-y font-mono text-sm"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CourseFolders() {
    const { state, dispatch } = useApp();
    const { courses, todos } = state;
    const [showModal, setShowModal] = useState(false);
    const [editCourse, setEditCourse] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);

    if (selectedCourse) {
        const course = courses.find(c => c.id === selectedCourse);
        if (course) return <CourseDetail course={course} onBack={() => setSelectedCourse(null)} />;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-txt-dark">Course Folders</h1>
                    <p className="text-sm text-gray-400">{courses.length} courses</p>
                </div>
                <button onClick={() => { setEditCourse(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Add Course
                </button>
            </div>

            {courses.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-4xl mb-3">📁</p>
                    <p className="text-sm text-gray-400">No courses yet. Add your first course!</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map(course => {
                        const taskCount = todos.filter(t => t.course === course.id && t.status !== 'completed').length;
                        const nextDeadline = todos.filter(t => t.course === course.id && t.status !== 'completed' && t.dueDate)
                            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

                        return (
                            <div key={course.id}
                                className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark overflow-hidden card-hover cursor-pointer group"
                                onClick={() => setSelectedCourse(course.id)}>
                                <div className="h-2" style={{ backgroundColor: course.color }} />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{course.icon}</span>
                                            <div>
                                                <h3 className="text-sm font-bold dark:text-txt-dark">{course.name}</h3>
                                                <p className="text-[11px] text-gray-400">{course.code}</p>
                                            </div>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); setEditCourse(course); setShowModal(true); }}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                                            <Edit3 size={14} className="text-gray-400" />
                                        </button>
                                    </div>
                                    {course.professor && <p className="text-xs text-gray-400 mb-3">Prof. {course.professor}</p>}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">{taskCount} active task{taskCount !== 1 ? 's' : ''}</span>
                                        {nextDeadline && (
                                            <span className="text-[10px] font-medium" style={{ color: course.color }}>
                                                {formatRelativeDate(nextDeadline.dueDate)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <CourseModal show={showModal} onClose={() => { setShowModal(false); setEditCourse(null); }} course={editCourse} dispatch={dispatch} />
        </div>
    );
}
