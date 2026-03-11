// Notification Sound — iMessage-style ascending chime via Web Audio API
import storage from './storage';

const SOUND_SETTINGS_KEY = 'notification_sound_enabled';

export function isSoundEnabled() {
    const val = storage.get(SOUND_SETTINGS_KEY);
    return val === null || val === undefined ? true : val;
}

export function setSoundEnabled(enabled) {
    storage.set(SOUND_SETTINGS_KEY, enabled);
}

export function playNotificationSound() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [783.99, 1046.50]; // G5 and C6 — iMessage-like ascending chime
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.02);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.15);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.15);
        });
    } catch (err) {
        console.warn('[Sound] Web Audio API not available:', err.message);
    }
}
