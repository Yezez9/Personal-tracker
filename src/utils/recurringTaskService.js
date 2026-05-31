// Recurring Task Service — AI difficulty judging, streak/penalty calculations, midnight reset
import storage from './storage';
import { addCoins, deductCoins } from './coinService';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// ─── AI Difficulty Judging via Groq ─────────────────────────────────
export async function judgeRecurringTaskDifficulty(task) {
    if (!GROQ_API_KEY) {
        console.warn('[RecurringTask] No Groq API key — using local fallback');
        return fallbackDifficultyJudge(task);
    }

    const systemPrompt = `You are a difficulty judge for a student productivity app. A student created a recurring daily task. Judge how hard this task is based on: title, description, target duration in minutes, and subject/course if provided. Think carefully — 1 hour of coding daily is genuinely hard and deserves big rewards. 30 minutes of reading is moderate. 10 minutes of reviewing notes is easy. Return ONLY this JSON: { "difficulty": "easy | medium | hard | extreme", "difficultyReason": "one sentence", "baseCoins": number (easy: 10-20, medium: 25-45, hard: 50-80, extreme: 90-150), "penaltyCoins": number (easy: 5, medium: 10, hard: 20, extreme: 30), "encouragement": "short motivational message shown to user when task is created" }`;

    const userMessage = `Task title: "${task.title}"
Description: "${task.description || 'none'}"
Target duration: ${task.targetDuration || 30} minutes per day
Course/subject: ${task.courseName || 'General'}`;

    try {
        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                temperature: 0.3,
                max_tokens: 300,
            }),
        });

        if (!res.ok) {
            console.error('[RecurringTask] Groq API error:', res.status);
            return fallbackDifficultyJudge(task);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return fallbackDifficultyJudge(task);

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            difficulty: parsed.difficulty || 'medium',
            difficultyReason: parsed.difficultyReason || '',
            baseCoins: Math.max(5, Math.min(150, parsed.baseCoins || 25)),
            penaltyCoins: Math.max(5, Math.min(30, parsed.penaltyCoins || 10)),
            encouragement: parsed.encouragement || 'You got this! 💪',
        };
    } catch (err) {
        console.error('[RecurringTask] AI judge error:', err);
        return fallbackDifficultyJudge(task);
    }
}

// ─── Local Fallback Difficulty Judge ────────────────────────────────
export function fallbackDifficultyJudge(task) {
    const dur = task.targetDuration || 30;
    if (dur <= 15) return { difficulty: 'easy', difficultyReason: 'Short daily commitment', baseCoins: 15, penaltyCoins: 5, encouragement: 'Small steps lead to big results! 🌱' };
    if (dur <= 30) return { difficulty: 'medium', difficultyReason: 'Solid daily effort required', baseCoins: 35, penaltyCoins: 10, encouragement: 'Consistency is your superpower! ⚡' };
    if (dur <= 60) return { difficulty: 'hard', difficultyReason: 'Significant daily time investment', baseCoins: 65, penaltyCoins: 20, encouragement: 'Champions are built through daily grind! 🏆' };
    return { difficulty: 'extreme', difficultyReason: 'Massive daily commitment', baseCoins: 120, penaltyCoins: 30, encouragement: 'You\'re going beast mode — respect! 🔥' };
}

// ─── Streak Bonus Calculation ───────────────────────────────────────
export function calculateStreakBonus(baseCoins, currentStreak) {
    let multiplier = 1;
    let label = '';
    if (currentStreak >= 30) { multiplier = 3; label = '30-day streak! 🏆 +200%'; }
    else if (currentStreak >= 14) { multiplier = 2; label = '14-day streak! 💎 +100%'; }
    else if (currentStreak >= 7) { multiplier = 1.5; label = '7-day streak! 🔥 +50%'; }
    else if (currentStreak >= 3) { multiplier = 1.25; label = '3-day streak! ✨ +25%'; }

    return {
        totalCoins: Math.round(baseCoins * multiplier),
        bonusCoins: Math.round(baseCoins * (multiplier - 1)),
        multiplier,
        label,
    };
}

// ─── Escalating Penalty Calculation ─────────────────────────────────
export function calculatePenalty(penaltyCoins, consecutiveFailedDays) {
    const days = Math.max(0, consecutiveFailedDays);
    let multiplier = 1;
    if (days >= 5) multiplier = 3;
    else if (days >= 4) multiplier = 2.5;
    else if (days >= 3) multiplier = 2;
    else if (days >= 2) multiplier = 1.5;
    else if (days >= 1) multiplier = 1;
    else return 0;

    return Math.round(penaltyCoins * multiplier);
}

// ─── Midnight Reset Logic ───────────────────────────────────────────
export function performMidnightReset(recurringTasks, dispatch, profileName) {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastResetDate = storage.get('recurring_last_reset_date');

    // Already reset today
    if (lastResetDate === todayStr) return;

    storage.set('recurring_last_reset_date', todayStr);

    if (!recurringTasks || recurringTasks.length === 0) return;

    // Calculate how many days were missed since last reset
    const lastReset = lastResetDate ? new Date(lastResetDate) : null;
    const today = new Date(todayStr);

    recurringTasks.forEach(task => {
        if (!task.isActive) return;

        // Check if task was completed on the last known day
        const lastCompleted = task.lastCompletedDate;
        
        if (lastReset) {
            // Calculate days between last reset and today
            const daysDiff = Math.floor((today - lastReset) / (1000 * 60 * 60 * 24));
            
            // For each missed day, apply penalty
            let missedDays = 0;
            for (let d = 1; d < daysDiff; d++) {
                const checkDate = new Date(lastReset);
                checkDate.setDate(checkDate.getDate() + d);
                const checkStr = checkDate.toISOString().split('T')[0];
                
                if (lastCompleted !== checkStr) {
                    missedDays++;
                }
            }

            // Also check if yesterday was missed
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastCompleted !== yesterdayStr && lastCompleted !== todayStr) {
                // Yesterday was missed — apply penalty
                const newConsecutiveFailed = (task.consecutiveFailedDays || 0) + Math.max(1, missedDays);
                const penalty = calculatePenalty(task.penaltyCoins || 10, newConsecutiveFailed);
                
                if (penalty > 0) {
                    deductCoins(penalty, task.title, `Missed ${task.title} — ${newConsecutiveFailed} day streak broken`);
                }

                dispatch({
                    type: 'UPDATE_RECURRING_TASK',
                    payload: {
                        id: task.id,
                        isCompletedToday: false,
                        consecutiveFailedDays: newConsecutiveFailed,
                        failedDays: (task.failedDays || 0) + Math.max(1, missedDays),
                        currentStreak: 0,
                    }
                });
            } else {
                // Yesterday was completed — just reset today's status
                dispatch({
                    type: 'UPDATE_RECURRING_TASK',
                    payload: {
                        id: task.id,
                        isCompletedToday: false,
                    }
                });
            }
        } else {
            // First time opening — just reset
            dispatch({
                type: 'UPDATE_RECURRING_TASK',
                payload: {
                    id: task.id,
                    isCompletedToday: false,
                }
            });
        }
    });
}

// ─── Weekly Completion Rate ─────────────────────────────────────────
export function getWeeklyCompletionRate(task) {
    // Returns number of days completed in the last 7 days (0-7)
    const completionLog = task.completionLog || [];
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        if (completionLog.includes(ds)) count++;
    }
    // Also count today if completed
    if (task.isCompletedToday) {
        const todayStr = today.toISOString().split('T')[0];
        if (!completionLog.includes(todayStr)) count++;
    }
    return Math.min(7, count);
}

// ─── Difficulty Color/Badge Map ─────────────────────────────────────
export const DIFFICULTY_CONFIG = {
    easy: { color: '#22c55e', bg: 'bg-green-500/15', text: 'text-green-400', label: 'Easy', emoji: '🟢' },
    medium: { color: '#eab308', bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: 'Medium', emoji: '🟡' },
    hard: { color: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Hard', emoji: '🟠' },
    extreme: { color: '#ef4444', bg: 'bg-red-500/15', text: 'text-red-400', label: 'Extreme', emoji: '🔴' },
};
