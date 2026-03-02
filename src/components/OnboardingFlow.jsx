import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { PRESET_COLORS, PRESET_EMOJIS, generateId } from '../utils/helpers';
import { ChevronRight, Sparkles } from 'lucide-react';

export default function OnboardingFlow() {
    const { dispatch } = useApp();
    const [step, setStep] = useState(0);
    const [profile, setProfile] = useState({ name: '', school: '', program: '' });
    const [course, setCourse] = useState({ name: '', code: '', color: PRESET_COLORS[0], icon: '📚', professor: '' });
    const [task, setTask] = useState({ title: '', dueDate: '', priority: 'medium' });

    const handleFinish = () => {
        dispatch({ type: 'SET_PROFILE', payload: profile });
        if (course.name.trim()) dispatch({ type: 'ADD_COURSE', payload: course });
        if (task.title.trim()) dispatch({ type: 'ADD_TODO', payload: { ...task, course: course.name.trim() ? '' : '' } });
        dispatch({ type: 'COMPLETE_ONBOARDING' });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-bg-light dark:bg-bg-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-light/20">
                        <Sparkles size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gradient">TaskTrack</h1>
                    <p className="text-sm text-gray-400 mt-1">Your AI-powered academic life, organized.</p>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-8">
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary-light dark:bg-primary-dark' : i < step ? 'w-4 bg-primary-light/40' : 'w-4 bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6 shadow-lg animate-scale-in">
                    {step === 0 && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-lg font-bold dark:text-txt-dark">👋 Welcome! Let's set up.</h2>
                                <p className="text-xs text-gray-400 mt-1">Tell us about yourself</p>
                            </div>
                            <input placeholder="Your name *" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="input-field" autoFocus />
                            <input placeholder="School / University" value={profile.school} onChange={e => setProfile(p => ({ ...p, school: e.target.value }))} className="input-field" />
                            <input placeholder="Program / Course" value={profile.program} onChange={e => setProfile(p => ({ ...p, program: e.target.value }))} className="input-field" />
                            <button onClick={() => setStep(1)} disabled={!profile.name.trim()} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-lg font-bold dark:text-txt-dark">📚 Add your first course</h2>
                                <p className="text-xs text-gray-400 mt-1">You can add more later</p>
                            </div>
                            <input placeholder="Course name (e.g., Linear Algebra)" value={course.name} onChange={e => setCourse(p => ({ ...p, name: e.target.value }))} className="input-field" autoFocus />
                            <input placeholder="Course code (e.g., MATH101)" value={course.code} onChange={e => setCourse(p => ({ ...p, code: e.target.value }))} className="input-field" />
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.slice(0, 10).map(c => (
                                        <button key={c} onClick={() => setCourse(p => ({ ...p, color: c }))}
                                            className={`w-6 h-6 rounded-lg transition-all ${course.color === c ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-surface-dark scale-110' : 'hover:scale-110'}`}
                                            style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setStep(0)} className="btn-ghost flex-1">Back</button>
                                <button onClick={() => setStep(2)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    {course.name.trim() ? 'Next' : 'Skip'} <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-lg font-bold dark:text-txt-dark">📝 Add your first task</h2>
                                <p className="text-xs text-gray-400 mt-1">What's on your plate?</p>
                            </div>
                            <input placeholder="Task title (e.g., Submit homework)" value={task.title} onChange={e => setTask(p => ({ ...p, title: e.target.value }))} className="input-field" autoFocus />
                            <input type="date" value={task.dueDate} onChange={e => setTask(p => ({ ...p, dueDate: e.target.value }))} className="input-field" />
                            <div className="flex gap-2">
                                {['low', 'medium', 'high'].map(p => (
                                    <button key={p} onClick={() => setTask(prev => ({ ...prev, priority: p }))}
                                        className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all ${task.priority === p
                                            ? p === 'high' ? 'bg-red-500 text-white' : p === 'medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                                            : 'bg-gray-100 dark:bg-surface2-dark text-gray-500'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
                                <button onClick={handleFinish} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    🚀 Get Started
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
