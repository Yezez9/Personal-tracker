import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import storage from '../utils/storage';
import { getNotificationSettings, setNotificationSettings, requestNotificationPermission } from '../utils/notificationService';
import { getCoinWallet, getLevel, getStreakMultiplier, LEVELS } from '../utils/coinService';
import { isSoundEnabled, setSoundEnabled } from '../utils/soundService';
import { User, Download, Upload, Trash2, Moon, Sun, Bell, BellOff, Trophy, Volume2, VolumeX, Smartphone } from 'lucide-react';

export default function Settings() {
    const { state, dispatch } = useApp();
    const { darkMode, toggleDarkMode } = useTheme();
    const { profile } = state;
    const [form, setForm] = useState(profile || { name: '', studentId: '', program: '', school: '', avatar: '' });

    const [deferredPrompt, setDeferredPrompt] = React.useState(window.deferredPrompt || null);
    const [isInstalled, setIsInstalled] = React.useState(false);

    React.useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator?.standalone || window.Capacitor) {
            setIsInstalled(true);
        }
        
        const handlePrompt = (e) => setDeferredPrompt(e);
        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            window.deferredPrompt = null;
        });
        
        return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
    }, []);

    const handleInstallPWA = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setIsInstalled(true);
        setDeferredPrompt(null);
        window.deferredPrompt = null;
    };
    const fileRef = useRef(null);
    const [notifSettings, setNotifSettings] = useState(getNotificationSettings());
    const [soundOn, setSoundOn] = useState(isSoundEnabled());

    const toggleNotifSetting = async (key) => {
        // Request permission if enabling
        if (!notifSettings[key]) {
            const perm = await requestNotificationPermission();
            if (perm !== 'granted') {
                alert('Please allow notifications in your browser settings to enable this feature.');
                return;
            }
        }
        const updated = { ...notifSettings, [key]: !notifSettings[key] };
        setNotifSettings(updated);
        setNotificationSettings(updated);
    };

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
        a.href = url; a.download = `tasktrack-backup-${new Date().toISOString().split('T')[0]}.json`;
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

            {/* App Installation */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6">
                <h2 className="text-sm font-semibold dark:text-txt-dark mb-4 flex items-center gap-2">
                    <Smartphone size={16} className="text-accent-light dark:text-accent-dark" /> Install Apps
                </h2>
                <div className="space-y-3">
                    <button 
                        onClick={handleInstallPWA} 
                        disabled={isInstalled || (!isInstalled && !deferredPrompt)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${isInstalled || (!isInstalled && !deferredPrompt) ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-surface2-dark' : 'hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer'}`}
                    >
                        <Download size={18} className="text-primary-light dark:text-primary-dark" />
                        <div>
                            <p className="text-sm font-medium dark:text-txt-dark">
                                {isInstalled ? 'Web App Already Installed ' : 'Install Web App (PWA)'}
                            </p>
                            <p className="text-[10px] text-gray-400">Add TaskTrack to your home screen</p>
                        </div>
                    </button>
                    
                    <a 
                        href="/TaskTrack.apk" 
                        download="TaskTrack.apk" 
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left no-underline cursor-pointer"
                    >
                        <Download size={18} className="text-green-500" />
                        <div>
                            <p className="text-sm font-medium dark:text-txt-dark">Download Android APK</p>
                            <p className="text-[10px] text-gray-400">Direct download for Android devices</p>
                        </div>
                    </a>
                </div>
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

            {/* Notifications */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6">
                <h2 className="text-sm font-semibold dark:text-txt-dark mb-4 flex items-center gap-2">
                    <Bell size={16} className="text-secondary-light dark:text-secondary-dark" /> Notifications
                </h2>
                <div className="space-y-4">
                    {/* Daily Notifications Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium dark:text-txt-dark">Daily Notifications</p>
                            <p className="text-[10px] text-gray-400">AI-generated reminders morning, afternoon & evening</p>
                        </div>
                        <button
                            onClick={() => toggleNotifSetting('dailyNotifications')}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifSettings.dailyNotifications ? 'bg-primary-light dark:bg-primary-dark' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notifSettings.dailyNotifications ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                    {/* Streak Reminder Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium dark:text-txt-dark">Streak Reminders</p>
                            <p className="text-[10px] text-gray-400">🔥 Nightly reminder at 8 PM to keep your streak alive</p>
                        </div>
                        <button
                            onClick={() => toggleNotifSetting('streakReminder')}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifSettings.streakReminder ? 'bg-primary-light dark:bg-primary-dark' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notifSettings.streakReminder ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                    {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
                        <p className="text-[10px] text-amber-500 flex items-center gap-1">
                            <BellOff size={12} /> Browser notifications are currently blocked. Enable them in your browser settings.
                        </p>
                    )}
                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-border-dark">
                        <div className="flex items-center gap-2">
                            {soundOn ? <Volume2 size={14} className="text-primary-light dark:text-primary-dark" /> : <VolumeX size={14} className="text-gray-400" />}
                            <div>
                                <p className="text-sm font-medium dark:text-txt-dark">Sound Effects</p>
                                <p className="text-[10px] text-gray-400">iMessage-style chime on notifications & completions</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { const v = !soundOn; setSoundOn(v); setSoundEnabled(v); }}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${soundOn ? 'bg-primary-light dark:bg-primary-dark' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${soundOn ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Rewards & Gamification */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6">
                <h2 className="text-sm font-semibold dark:text-txt-dark mb-4 flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" /> Rewards & Gamification
                </h2>
                {(() => {
                    const wallet = getCoinWallet();
                    const level = getLevel(wallet.totalCoins);
                    const { multiplier, label } = getStreakMultiplier();
                    const nextLevel = LEVELS.find(l => l.min > wallet.totalCoins);
                    const progress = nextLevel ? ((wallet.totalCoins - level.min) / (nextLevel.min - level.min)) * 100 : 100;
                    return (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-yellow-500/10 p-3 text-center">
                                    <p className="text-2xl font-black text-yellow-500">🪙 {wallet.totalCoins}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Total Coins</p>
                                </div>
                                <div className="rounded-xl bg-primary-light/10 dark:bg-primary-dark/10 p-3 text-center">
                                    <p className="text-2xl font-black text-primary-light dark:text-primary-dark">🪙 {wallet.weeklyCoins || 0}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">This Week</p>
                                </div>
                            </div>
                            {/* Level */}
                            <div className="rounded-xl bg-gray-50 dark:bg-surface2-dark p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold dark:text-txt-dark">{level.badge} {level.name}</span>
                                    {nextLevel && <span className="text-[10px] text-gray-400">{nextLevel.min - wallet.totalCoins} coins to {nextLevel.name}</span>}
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
                                </div>
                                <div className="flex justify-between mt-1.5">
                                    {LEVELS.map(l => (
                                        <span key={l.name} className={`text-[9px] ${wallet.totalCoins >= l.min ? 'text-yellow-500 font-bold' : 'text-gray-400'}`} title={l.name}>{l.badge}</span>
                                    ))}
                                </div>
                            </div>
                            {/* Streak multiplier */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-surface2-dark">
                                <span className="text-sm dark:text-txt-dark">🔥 Streak Multiplier</span>
                                <span className={`text-sm font-bold ${multiplier > 1 ? 'text-green-500' : 'text-gray-400'}`}>{label}</span>
                            </div>
                            {/* History */}
                            {wallet.history?.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Earnings</p>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {wallet.history.slice(0, 10).map((h, i) => (
                                            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                                                <div className="min-w-0">
                                                    <p className="text-xs dark:text-txt-dark truncate">{h.task}</p>
                                                    <p className="text-[10px] text-gray-400">{h.date} {h.reason && `• ${h.reason}`}</p>
                                                </div>
                                                <span className="text-xs font-bold text-yellow-500 flex-shrink-0 ml-2">+{h.coins} 🪙</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
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
                <p className="text-xs text-gray-400">TaskTrack v1.0 · Built with ❤️ for students</p>
            </div>
        </div>
    );
}
