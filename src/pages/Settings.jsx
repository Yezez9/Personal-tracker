import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import storage from '../utils/storage';
import { User, Download, Upload, Trash2, Moon, Sun, Key, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

export default function Settings() {
    const { state, dispatch } = useApp();
    const { darkMode, toggleDarkMode } = useTheme();
    const { profile } = state;
    const [form, setForm] = useState(profile || { name: '', studentId: '', program: '', school: '', avatar: '' });
    const fileRef = useRef(null);
    const [apiKey, setApiKey] = useState(storage.get('gemini_api_key') || '');
    const [apiKeyStatus, setApiKeyStatus] = useState(null); // null | 'testing' | 'valid' | 'invalid'
    const [apiKeySaved, setApiKeySaved] = useState(false);

    const saveProfile = () => {
        dispatch({ type: 'SET_PROFILE', payload: form });
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setForm(p => ({ ...p, avatar: reader.result }));
        reader.readAsDataURL(file);
    };

    const exportData = () => {
        const data = storage.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `folderlyai-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click(); URL.revokeObjectURL(url);
    };

    const importData = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            try {
                const data = JSON.parse(reader.result);
                storage.importAll(data);
                window.location.reload();
            } catch { alert('Invalid backup file'); }
        };
        reader.readAsText(file);
    };

    const clearAllData = () => {
        if (confirm('Are you sure? This will delete ALL your data permanently.')) {
            storage.clear();
            dispatch({ type: 'CLEAR_ALL_DATA' });
            window.location.reload();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-2xl">
            <h1 className="text-2xl font-bold dark:text-txt-dark">Settings</h1>

            {/* Profile */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6">
                <h2 className="text-sm font-semibold dark:text-txt-dark mb-4 flex items-center gap-2"><User size={16} className="text-primary-light dark:text-primary-dark" /> Student Profile</h2>
                <div className="flex items-center gap-4 mb-5">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-xl font-bold overflow-hidden cursor-pointer" onClick={() => fileRef.current?.click()}>
                            {form.avatar ? <img src={form.avatar} alt="" className="w-full h-full object-cover" /> : (form.name?.charAt(0).toUpperCase() || '?')}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>
                    <div className="text-xs text-gray-400">Click avatar to upload photo<br />Stored as base64</div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" /></div>
                    <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Student ID</label><input value={form.studentId || ''} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} className="input-field" /></div>
                    <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Program / Course</label><input value={form.program || ''} onChange={e => setForm(p => ({ ...p, program: e.target.value }))} className="input-field" /></div>
                    <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">School</label><input value={form.school || ''} onChange={e => setForm(p => ({ ...p, school: e.target.value }))} className="input-field" /></div>
                </div>
                <button onClick={saveProfile} className="btn-primary mt-4">Save Profile</button>
            </div>

            {/* Gemini API Key */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6">
                <h2 className="text-sm font-semibold dark:text-txt-dark mb-1 flex items-center gap-2"><Key size={16} className="text-primary-light dark:text-primary-dark" /> AI Integration</h2>
                <p className="text-[11px] text-gray-400 mb-4">Powered by <strong>Google Gemini 2.0 Flash</strong>. Get a free API key from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-primary-light dark:text-primary-dark hover:underline inline-flex items-center gap-0.5">aistudio.google.com <ExternalLink size={10} /></a></p>
                <div className="flex gap-2 mb-3">
                    <input
                        type="password"
                        placeholder="Enter your Gemini API key"
                        value={apiKey}
                        onChange={e => { setApiKey(e.target.value); setApiKeySaved(false); setApiKeyStatus(null); }}
                        className="input-field flex-1 font-mono text-xs"
                    />
                    <button onClick={() => {
                        storage.set('gemini_api_key', apiKey.trim());
                        setApiKeySaved(true);
                        setTimeout(() => setApiKeySaved(false), 2000);
                    }} className="btn-primary text-xs px-4">{apiKeySaved ? '✓ Saved' : 'Save'}</button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={async () => {
                        setApiKeyStatus('testing');
                        try {
                            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contents: [{ parts: [{ text: 'Say "connected" in one word.' }] }] })
                            });
                            setApiKeyStatus(res.ok ? 'valid' : 'invalid');
                        } catch { setApiKeyStatus('invalid'); }
                    }} disabled={!apiKey.trim() || apiKeyStatus === 'testing'} className="text-xs font-medium text-primary-light dark:text-primary-dark hover:underline disabled:opacity-50">
                        {apiKeyStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>
                    {apiKeyStatus === 'valid' && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12} /> Connected</span>}
                    {apiKeyStatus === 'invalid' && <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={12} /> Invalid key</span>}
                    {apiKey.trim() && <button onClick={() => { setApiKey(''); storage.remove('gemini_api_key'); setApiKeyStatus(null); }} className="text-xs text-red-400 hover:underline ml-auto">Remove key</button>}
                </div>
                {!apiKey.trim() && <p className="text-[10px] text-gray-400 mt-2">Without an API key, AI features use local template-based responses instead of Gemini.</p>}
            </div>

            {/* Theme */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6">
                <h2 className="text-sm font-semibold dark:text-txt-dark mb-4">Appearance</h2>
                <div className="flex gap-3">
                    {[
                        { mode: 'light', icon: Sun, label: 'Light' },
                        { mode: 'dark', icon: Moon, label: 'Dark' },
                    ].map(opt => (
                        <button key={opt.mode} onClick={() => { if ((opt.mode === 'dark') !== darkMode) toggleDarkMode(); }}
                            className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${(opt.mode === 'dark') === darkMode
                                ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
                                : 'border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-gray-600'}`}>
                            <opt.icon size={20} className={(opt.mode === 'dark') === darkMode ? 'text-primary-light dark:text-primary-dark' : 'text-gray-400'} />
                            <span className="text-xs font-medium dark:text-gray-300">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Data Management */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6">
                <h2 className="text-sm font-semibold dark:text-txt-dark mb-4">Data Management</h2>
                <div className="space-y-3">
                    <button onClick={exportData} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left">
                        <Download size={18} className="text-accent-light dark:text-accent-dark" />
                        <div><p className="text-sm font-medium dark:text-txt-dark">Export Data</p><p className="text-[10px] text-gray-400">Download all data as JSON</p></div>
                    </button>
                    <label className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                        <Upload size={18} className="text-primary-light dark:text-primary-dark" />
                        <div><p className="text-sm font-medium dark:text-txt-dark">Import Data</p><p className="text-[10px] text-gray-400">Restore from a backup JSON</p></div>
                        <input type="file" accept=".json" className="hidden" onChange={importData} />
                    </label>
                    <button onClick={clearAllData} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors text-left">
                        <Trash2 size={18} className="text-red-500" />
                        <div><p className="text-sm font-medium text-red-500">Clear All Data</p><p className="text-[10px] text-gray-400">Permanently delete everything</p></div>
                    </button>
                </div>
            </div>

            {/* About */}
            <div className="text-center py-4">
                <p className="text-xs text-gray-400">FolderlyAI v1.0 · Built with ❤️ for students</p>
            </div>
        </div>
    );
}
