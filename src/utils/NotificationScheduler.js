import { LocalNotifications } from '@capacitor/local-notifications';
import { generateChatResponse } from './aiService';

// Helper to generate a unique ID
const generateId = () => Math.floor(Math.random() * 2000000000);

export async function scheduleAllNotifications(state) {
    if (!window.Capacitor) return;
    
    try {
        const prefs = state.profile?.notificationPreferences || {};
        if (!prefs.master) {
            // Cancel all if master switch is off
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel({ notifications: pending.notifications });
            }
            return;
        }

        // Cancel existing first so we can cleanly reschedule
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
        }

        const toSchedule = [];
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Morning Briefing (8:00 AM)
        if (prefs.morning) {
            let morningTime = new Date(now);
            morningTime.setHours(8, 0, 0, 0);
            if (now > morningTime) {
                morningTime.setDate(morningTime.getDate() + 1);
            }
            
            const pendingTodos = state.todos.filter(t => t.status !== 'completed');
            const groqPrompt = `You are a helpful AI assistant for TaskTrack. The student has ${pendingTodos.length} pending tasks. Generate a short, motivating morning briefing push notification (max 15 words) to wake them up and get them started. Be energetic. DO NOT use quotes around the output.`;
            const msg = await generateChatResponse(groqPrompt, []);
            
            toSchedule.push({
                id: generateId(),
                title: 'Good Morning! 🌅',
                body: msg || `You have ${pendingTodos.length} tasks waiting for you today. Let's get to work!`,
                schedule: { at: morningTime },
                sound: 'notification.wav',
                actionTypeId: 'OPEN_APP',
                extra: { route: '/dashboard' }
            });
        }

        // 2. Deadline Warnings (9:00 AM, up to 3 days before)
        if (prefs.deadline) {
            const pendingTodos = state.todos.filter(t => t.status !== 'completed' && t.dueDate);
            for (const task of pendingTodos) {
                const due = new Date(task.dueDate);
                due.setHours(0,0,0,0);
                const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
                
                if (diffDays >= 0 && diffDays <= 3) {
                    let alertTime = new Date(now);
                    alertTime.setHours(9, 0, 0, 0);
                    if (now > alertTime) {
                        alertTime.setDate(alertTime.getDate() + 1); // Schedule for tomorrow if missed today
                    }
                    
                    // Don't schedule if it's already due today and we missed 9AM
                    if (!(diffDays === 0 && now > alertTime)) {
                        const groqPrompt = `You are a strict AI assistant for TaskTrack. The user has a task "${task.title}" due in ${diffDays} days. Write a short push notification (max 12 words) warning them about the coin penalty if they miss it. No quotes.`;
                        const msg = await generateChatResponse(groqPrompt, []);
                        
                        toSchedule.push({
                            id: generateId(),
                            title: 'Deadline Approaching ⏰',
                            body: msg || `Task "${task.title}" is due soon. Don't lose your coins!`,
                            schedule: { at: alertTime },
                            sound: 'notification.wav',
                            actionTypeId: 'OPEN_APP',
                            extra: { route: '/todos' }
                        });
                    }
                }
            }
        }

        // 3. Recurring Task Reminders (7:00 PM)
        if (prefs.recurring) {
            let eveningTime = new Date(now);
            eveningTime.setHours(19, 0, 0, 0);
            if (now > eveningTime) {
                eveningTime.setDate(eveningTime.getDate() + 1);
            }
            
            const incompleteRecurring = state.recurringTasks?.filter(t => t.isActive && !t.isCompletedToday) || [];
            if (incompleteRecurring.length > 0) {
                const groqPrompt = `You are an AI assistant for TaskTrack. The user has ${incompleteRecurring.length} recurring habits incomplete today (like "${incompleteRecurring[0].title}"). Write a short, slightly urgent push notification (max 15 words) warning them that they will lose their streak and penalty coins at midnight. No quotes.`;
                const msg = await generateChatResponse(groqPrompt, []);
                
                toSchedule.push({
                    id: generateId(),
                    title: 'Daily Habits Incomplete! ⚠️',
                    body: msg || `You have unfinished daily habits. Complete them before midnight to save your streak!`,
                    schedule: { at: eveningTime },
                    sound: 'notification.wav',
                    actionTypeId: 'OPEN_APP',
                    extra: { route: '/recurring' }
                });
            }
        }

        // 4. Streak Reminder (8:00 PM)
        if (prefs.streak) {
            let streakTime = new Date(now);
            streakTime.setHours(20, 0, 0, 0);
            if (now > streakTime) {
                streakTime.setDate(streakTime.getDate() + 1);
            }
            
            const currentStreak = state.profile?.streak || 0;
            if (currentStreak > 0) {
                const groqPrompt = `You are a dramatic AI assistant for TaskTrack. The user currently has a study streak of ${currentStreak} days. Write a highly dramatic push notification (max 15 words) begging them to open the app and do a task so their precious streak doesn't die. No quotes.`;
                const msg = await generateChatResponse(groqPrompt, []);
                
                toSchedule.push({
                    id: generateId(),
                    title: 'Protect Your Streak! 🔥',
                    body: msg || `Your ${currentStreak}-day streak is in danger! Do a task right now to save it!`,
                    schedule: { at: streakTime },
                    sound: 'notification.wav',
                    actionTypeId: 'OPEN_APP',
                    extra: { route: '/dashboard' }
                });
            }
        }

        if (toSchedule.length > 0) {
            await LocalNotifications.schedule({ notifications: toSchedule });
            console.log(`[NotificationScheduler] Scheduled ${toSchedule.length} background notifications.`);
        }

    } catch (err) {
        console.error('[NotificationScheduler] Error scheduling:', err);
    }
}

// Fire an immediate local notification (e.g. when completing a task)
export async function fireImmediateNotification(title, body) {
    if (!window.Capacitor) return;
    try {
        await LocalNotifications.schedule({
            notifications: [
                {
                    id: generateId(),
                    title,
                    body,
                    schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
                    sound: 'notification.wav',
                    actionTypeId: 'OPEN_APP'
                }
            ]
        });
    } catch (err) {
        console.error('[NotificationScheduler] Immediate notification failed', err);
    }
}
