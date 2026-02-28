import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { generateId } from '../utils/helpers';
import { generateFlashcards } from '../utils/aiService';
import { Plus, X, RotateCcw, Check, Sparkles, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

function FlashcardStudy({ set, onBack, dispatch }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const cards = set.cards || [];
    const card = cards[currentIdx];
    if (!card) return null;

    const markMastered = (mastered) => {
        const updated = { ...set, cards: set.cards.map((c, i) => i === currentIdx ? { ...c, mastered } : c), lastStudied: new Date().toISOString() };
        dispatch({ type: 'UPDATE_STUDY_SET', payload: updated });
        if (currentIdx < cards.length - 1) { setCurrentIdx(currentIdx + 1); setFlipped(false); }
    };
    const masteredCount = cards.filter(c => c.mastered).length;

    return (
        <div className="animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-4">
                <ArrowLeft size={16} /> Back
            </button>
            <h2 className="text-xl font-bold dark:text-txt-dark mb-2">{set.title}</h2>
            <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-light to-accent-light transition-all" style={{ width: `${cards.length > 0 ? (masteredCount / cards.length) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-gray-400">{masteredCount}/{cards.length} mastered</span>
            </div>

            <div className="flex justify-center mb-6">
                <div className="perspective-1000 w-full max-w-md">
                    <div onClick={() => setFlipped(!flipped)}
                        className={`relative w-full min-h-[250px] cursor-pointer transition-transform duration-500 preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>
                        <div className="absolute inset-0 backface-hidden rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-8 flex flex-col items-center justify-center shadow-lg">
                            <p className="text-[10px] text-gray-400 mb-4">FRONT · Card {currentIdx + 1}/{cards.length}</p>
                            <p className="text-lg font-medium dark:text-txt-dark text-center">{card.front}</p>
                            <p className="text-xs text-gray-400 mt-6">Tap to flip</p>
                        </div>
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl gradient-primary p-8 flex flex-col items-center justify-center shadow-lg text-white">
                            <p className="text-[10px] text-white/60 mb-4">BACK</p>
                            <p className="text-base text-center leading-relaxed">{card.back}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-4">
                <button onClick={() => { if (currentIdx > 0) { setCurrentIdx(currentIdx - 1); setFlipped(false); } }}
                    className="p-3 rounded-xl bg-gray-100 dark:bg-surface2-dark hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-30"
                    disabled={currentIdx === 0}>
                    <ChevronLeft size={20} className="dark:text-gray-400" />
                </button>
                <button onClick={() => markMastered(false)} className="px-5 py-3 rounded-xl bg-yellow-500/10 text-yellow-600 font-medium text-sm hover:bg-yellow-500/20 transition-colors flex items-center gap-2">
                    <RotateCcw size={16} /> Review Again
                </button>
                <button onClick={() => markMastered(true)} className="px-5 py-3 rounded-xl bg-green-500/10 text-green-600 font-medium text-sm hover:bg-green-500/20 transition-colors flex items-center gap-2">
                    <Check size={16} /> Know It
                </button>
                <button onClick={() => { if (currentIdx < cards.length - 1) { setCurrentIdx(currentIdx + 1); setFlipped(false); } }}
                    className="p-3 rounded-xl bg-gray-100 dark:bg-surface2-dark hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-30"
                    disabled={currentIdx >= cards.length - 1}>
                    <ChevronRight size={20} className="dark:text-gray-400" />
                </button>
            </div>
        </div>
    );
}

export default function StudySets() {
    const { state, dispatch } = useApp();
    const { studySets, courses } = state;
    const [showAdd, setShowAdd] = useState(false);
    const [studyingSet, setStudyingSet] = useState(null);
    const [aiMode, setAiMode] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiCount, setAiCount] = useState(5);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [form, setForm] = useState({ title: '', courseId: '', cards: [] });
    const [newCard, setNewCard] = useState({ front: '', back: '' });

    if (studyingSet) {
        const set = studySets.find(s => s.id === studyingSet);
        if (set) return <FlashcardStudy set={set} onBack={() => setStudyingSet(null)} dispatch={dispatch} />;
    }

    const addCard = () => {
        if (!newCard.front.trim()) return;
        setForm(p => ({ ...p, cards: [...p.cards, { ...newCard, id: generateId(), mastered: false }] }));
        setNewCard({ front: '', back: '' });
    };

    const handleAIGenerate = async () => {
        setAiGenerating(true);
        const cards = await generateFlashcards(aiTopic, aiCount);
        setForm(p => ({ ...p, title: p.title || `${aiTopic} Flashcards`, cards: [...p.cards, ...cards] }));
        setAiMode(false); setAiTopic(''); setAiGenerating(false);
    };

    const handleSubmit = () => {
        if (!form.title.trim() || form.cards.length === 0) return;
        dispatch({ type: 'ADD_STUDY_SET', payload: form });
        setForm({ title: '', courseId: '', cards: [] }); setShowAdd(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold dark:text-txt-dark">Study Sets</h1>
                <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Set</button>
            </div>

            {studySets.length === 0 && !showAdd ? (
                <div className="text-center py-16"><p className="text-4xl mb-3">🃏</p><p className="text-sm text-gray-400">No study sets yet. Create one!</p></div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studySets.map(set => {
                        const course = courses.find(c => c.id === set.courseId);
                        const mastered = set.cards?.filter(c => c.mastered).length || 0;
                        const total = set.cards?.length || 0;
                        return (
                            <div key={set.id} className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark p-5 card-hover">
                                <div className="flex items-start justify-between mb-3">
                                    <div><h3 className="text-sm font-bold dark:text-txt-dark">{set.title}</h3>
                                        {course && <p className="text-[10px] mt-0.5" style={{ color: course.color }}>{course.icon} {course.name}</p>}
                                    </div>
                                    <button onClick={() => dispatch({ type: 'DELETE_STUDY_SET', payload: set.id })} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                </div>
                                <p className="text-xs text-gray-400 mb-3">{total} cards · {mastered} mastered</p>
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                                    <div className="h-full rounded-full bg-gradient-to-r from-primary-light to-accent-light transition-all" style={{ width: `${total > 0 ? (mastered / total) * 100 : 0}%` }} />
                                </div>
                                <button onClick={() => setStudyingSet(set.id)} className="btn-primary w-full text-sm">Study Now</button>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative glass-strong rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold dark:text-txt-dark">New Study Set</h2>
                                <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><X size={18} className="dark:text-gray-400" /></button>
                            </div>
                            <input placeholder="Set title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" />
                            <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} className="input-field">
                                <option value="">Link to course (optional)</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <button onClick={() => setAiMode(!aiMode)} className="text-xs font-medium text-primary-light dark:text-primary-dark flex items-center gap-1"><Sparkles size={12} /> AI Generate Cards</button>
                            {aiMode && (
                                <div className="p-3 rounded-xl bg-primary-light/5 dark:bg-primary-dark/5 space-y-2 animate-fade-in">
                                    <input placeholder="Topic (e.g., photosynthesis)" value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="input-field" />
                                    <div className="flex gap-2 items-center">
                                        <input type="number" min={1} max={20} value={aiCount} onChange={e => setAiCount(parseInt(e.target.value) || 5)} className="input-field w-20" />
                                        <span className="text-xs text-gray-400">cards</span>
                                        <button onClick={handleAIGenerate} disabled={!aiTopic.trim() || aiGenerating} className="btn-primary text-xs ml-auto disabled:opacity-50">{aiGenerating ? 'Generating...' : 'Generate'}</button>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-gray-100 dark:border-border-dark pt-4">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Cards ({form.cards.length})</p>
                                {form.cards.map((c, i) => (
                                    <div key={c.id} className="flex items-center gap-2 py-1 text-xs">
                                        <span className="font-medium dark:text-gray-300 truncate flex-1">{c.front}</span>
                                        <button onClick={() => setForm(p => ({ ...p, cards: p.cards.filter((_, ii) => ii !== i) }))} className="text-gray-300 hover:text-red-400"><X size={12} /></button>
                                    </div>
                                ))}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <input placeholder="Front" value={newCard.front} onChange={e => setNewCard(p => ({ ...p, front: e.target.value }))} className="input-field text-xs" />
                                    <input placeholder="Back" value={newCard.back} onChange={e => setNewCard(p => ({ ...p, back: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addCard()} className="input-field text-xs" />
                                </div>
                                <button onClick={addCard} disabled={!newCard.front.trim()} className="btn-ghost text-xs text-primary-light dark:text-primary-dark mt-1 disabled:opacity-50">+ Add Card</button>
                            </div>

                            <button onClick={handleSubmit} disabled={!form.title.trim() || form.cards.length === 0} className="btn-primary w-full disabled:opacity-50">Create Study Set</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
