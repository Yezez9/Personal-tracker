// Notification Service — AI-powered push notifications via Groq LLaMA 3.3 70B
import storage from './storage';
import { playNotificationSound } from './soundService';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroqForNotifications(systemPrompt) {
    if (!GROQ_API_KEY) return null;
    try {
        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: 'Generate the notification(s) now.' }
                ],
                temperature: 1.0,
                max_tokens: 500
            })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.choices?.[0]?.message?.content || null;
    } catch { return null; }
}

// Request notification permission
export async function requestNotificationPermission() {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
}

// Show a browser notification
function showNotification(title, body, tag) {
    if (Notification.permission !== 'granted') return;

    // Play the iMessage-style chime
    playNotificationSound();

    // Try service worker notifications first (work when app is closed)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
                body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: tag || 'tasktrack-' + Date.now(),
                vibrate: [100, 50, 100],
                silent: false,
                renotify: true,
            });
        });
    } else {
        // Fallback to basic Notification API
        new Notification(title, { body, icon: '/icons/icon-192x192.png', tag });
    }
}

// Schedule a notification at a specific hour today
function scheduleAt(hour, minute, callback) {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute || 0, 0, 0);

    let delay = target - now;
    if (delay < 0) return null; // Time already passed today

    return setTimeout(callback, delay);
}

// Generate AI daily notifications
export async function generateDailyNotifications(context) {
    const settings = storage.get('notification_settings') || {};
    if (settings.dailyNotifications === false) return;

    const { todos = [], schedule = [], courses = [], profile = {}, countdowns = [] } = context;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    const taskSummary = todos
        .filter(t => t.status !== 'completed')
        .map(t => {
            const daysUntil = t.dueDate ? Math.ceil((new Date(t.dueDate) - today) / (1000 * 60 * 60 * 24)) : null;
            return `"${t.title}" (${t.priority} priority, ${daysUntil !== null ? daysUntil + ' days until due' : 'no due date'}, status: ${t.status})`;
        }).join(', ');

    const todayClasses = schedule.filter(s => s.day === dayName)
        .map(s => `${courses.find(c => c.id === s.courseId)?.name || 'Class'} at ${s.startTime}`).join(', ');

    const upcomingCountdowns = (countdowns || [])
        .map(c => {
            const d = Math.ceil((new Date(c.date || c.targetDate) - today) / (1000 * 60 * 60 * 24));
            return d > 0 && d <= 7 ? `${c.title} in ${d} days` : null;
        }).filter(Boolean).join(', ');

    const systemPrompt = `You are a fun, witty notification writer for a student app called TaskTrack. Look at this student data:
- Student: ${profile?.name || 'Student'}
- Today: ${dayName}, ${todayStr}
- Tasks: ${taskSummary || 'No active tasks'}
- Classes today: ${todayClasses || 'None'}
- Upcoming events: ${upcomingCountdowns || 'None'}

Write 3 short push notification messages for today — one for morning, one for afternoon, one for evening. Each must be unique, reference their actual tasks or exams by name, and have personality and light humor like Duolingo. Include emojis. Keep each message under 100 characters.
Return as JSON array: [{"time":"morning","title":"TaskTrack","body":"message"},{"time":"afternoon","title":"TaskTrack","body":"message"},{"time":"evening","title":"TaskTrack","body":"message"}]
Return ONLY the JSON array, no other text.`;

    try {
        const result = await callGroqForNotifications(systemPrompt);
        if (!result) return;

        const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const notifications = JSON.parse(cleaned);

        if (!Array.isArray(notifications)) return;

        // Schedule each notification
        const timeMap = { morning: 9, afternoon: 14, evening: 19 };

        notifications.forEach(notif => {
            const hour = timeMap[notif.time] || 12;
            scheduleAt(hour, 0, () => {
                showNotification(notif.title || 'TaskTrack', notif.body, `tasktrack-${notif.time}`);
            });
        });

        // Store that we already generated notifications today
        storage.set('last_notification_date', todayStr);
    } catch (err) {
        console.warn('[Notifications] Error generating:', err.message);
    }
}

// Generate streak reminder notification
export async function generateStreakReminder() {
    const settings = storage.get('notification_settings') || {};
    if (settings.streakReminder === false) return;

    const streakData = storage.get('study_streak') || { currentStreak: 1 };
    const streak = streakData.currentStreak || 1;

    const systemPrompt = `Write a single short push notification reminding the student to open TaskTrack today to keep their study streak alive. Their current streak is ${streak} days. Be fun, slightly dramatic, and use emojis like Duolingo does. ${streak >= 7 ? 'Make it feel like a lot is at stake — they have a big streak going!' : 'Make it encouraging — they are building momentum!'} Never write the same message twice — think of a fresh one each time. Keep it under 100 characters. Return ONLY the notification body text, nothing else. No quotes.`;

    try {
        const result = await callGroqForNotifications(systemPrompt);
        if (!result) {
            // Fallback
            showNotification('🔥 Streak at Risk!', `Your ${streak}-day streak is on the line! Open TaskTrack to keep it alive 💪`, 'tasktrack-streak');
            return;
        }

        const body = result.replace(/^["']|["']$/g, '').trim();
        scheduleAt(20, 0, () => {
            showNotification('🔥 Streak at Risk!', body, 'tasktrack-streak');
        });
    } catch {
        showNotification('🔥 Streak at Risk!', `Your ${streak}-day streak needs you! Open TaskTrack now 🔥`, 'tasktrack-streak');
    }
}

// Initialize all notifications for the day
export async function initializeNotifications(context) {
    // Check if we already generated today
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = storage.get('last_notification_date');

    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return;

    if (lastDate !== todayStr) {
        await generateDailyNotifications(context);
        await generateStreakReminder();
    }
}

// Get current notification settings
export function getNotificationSettings() {
    return storage.get('notification_settings') || { dailyNotifications: true, streakReminder: true };
}

// Save notification settings
export function setNotificationSettings(settings) {
    storage.set('notification_settings', settings);
}
