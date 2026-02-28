import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Plus, X, Trash2, ExternalLink, Search } from 'lucide-react';

export default function Bookmarks() {
    const { state, dispatch } = useApp();
    const { bookmarks, courses } = state;
    const [showAdd, setShowAdd] = useState(false);
    const [search, setSearch] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [form, setForm] = useState({ url: '', title: '', description: '', courseId: '', tags: [] });
    const [tagInput, setTagInput] = useState('');

    const filtered = bookmarks.filter(b => {
        const q = search.toLowerCase();
        const matchSearch = !q || b.title?.toLowerCase().includes(q) || b.url?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q);
        const matchCourse = !courseFilter || b.courseId === courseFilter;
        return matchSearch && matchCourse;
    });

    const addTag = () => { if (tagInput.trim()) { setForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] })); setTagInput(''); } };

    const handleSubmit = () => {
        if (!form.url.trim()) return;
        if (!form.title.trim()) form.title = form.url;
        dispatch({ type: 'ADD_BOOKMARK', payload: form });
        setForm({ url: '', title: '', description: '', courseId: '', tags: [] }); setShowAdd(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold dark:text-txt-dark">Bookmarks</h1>
                <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Bookmark</button>
            </div>
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input placeholder="Search bookmarks..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
                </div>
                <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="input-field w-auto">
                    <option value="">All courses</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            {filtered.length === 0 ? (
                <div className="text-center py-16"><p className="text-4xl mb-3">🔖</p><p className="text-sm text-gray-400">{bookmarks.length === 0 ? 'No bookmarks yet.' : 'No matches found.'}</p></div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(bm => {
                        const course = courses.find(c => c.id === bm.courseId);
                        return (
                            <div key={bm.id} className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-4 card-hover group" style={{ borderLeftColor: course?.color, borderLeftWidth: course ? '3px' : undefined }}>
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold dark:text-txt-dark truncate flex-1 mr-2">{bm.title}</h3>
                                    <div className="flex gap-1">
                                        <a href={bm.url} target="_blank" rel="noreferrer" className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"><ExternalLink size={14} className="text-gray-400" /></a>
                                        <button onClick={() => dispatch({ type: 'DELETE_BOOKMARK', payload: bm.id })} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} className="text-gray-300 hover:text-red-400" /></button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-primary-light dark:text-primary-dark truncate mb-1">{bm.url}</p>
                                {bm.description && <p className="text-xs text-gray-400 line-clamp-2 mb-2">{bm.description}</p>}
                                <div className="flex flex-wrap gap-1">
                                    {course && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${course.color}15`, color: course.color }}>{course.name}</span>}
                                    {bm.tags?.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-surface2-dark text-gray-400">{t}</span>)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative glass-strong rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between"><h2 className="text-lg font-bold dark:text-txt-dark">Add Bookmark</h2><button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><X size={18} className="dark:text-gray-400" /></button></div>
                            <input placeholder="URL *" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} className="input-field" />
                            <input placeholder="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" />
                            <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field h-20 resize-none" />
                            <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} className="input-field">
                                <option value="">Link to course (optional)</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div className="flex gap-2"><input placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} className="input-field flex-1" /><button onClick={addTag} className="btn-ghost text-xs">Add</button></div>
                            {form.tags.length > 0 && <div className="flex flex-wrap gap-1">{form.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-surface2-dark text-gray-500 flex items-center gap-1">{t}<button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))}><X size={10} /></button></span>)}</div>}
                            <button onClick={handleSubmit} disabled={!form.url.trim()} className="btn-primary w-full disabled:opacity-50">Add Bookmark</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
