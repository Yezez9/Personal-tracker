// Coin/Reward Service — AI-powered gamification via Groq LLaMA 3.3 70B
import storage from './storage';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Level System ───────────────────────────────────────────────────
export const LEVELS = [
    { name: 'Rookie', min: 0, badge: '🌱' },
    { name: 'Scholar', min: 501, badge: '📚' },
    { name: "Dean's Lister", min: 1501, badge: '🎓' },
    { name: 'Cum Laude', min: 3501, badge: '🏅' },
    { name: 'Academic Legend', min: 5001, badge: '👑' },
];

export function getLevel(totalCoins) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (totalCoins >= LEVELS[i].min) return LEVELS[i];
    }
    return LEVELS[0];
}

// ─── Streak Multiplier ──────────────────────────────────────────────
export function getStreakMultiplier() {
    const streakData = storage.get('study_streak') || { currentStreak: 1 };
    const streak = streakData.currentStreak || 1;
    if (streak >= 15) return { multiplier: 1.5, label: '1.5x' };
    if (streak >= 8) return { multiplier: 1.25, label: '1.25x' };
    if (streak >= 4) return { multiplier: 1.1, label: '1.1x' };
    return { multiplier: 1, label: '1x' };
}

// ─── Recurrence Detection ───────────────────────────────────────────
function getRecurrenceData() {
    return storage.get('coin_recurrence') || {};
}

function recordCompletion(courseName, taskType) {
    const data = getRecurrenceData();
    const key = `${courseName || 'general'}::${taskType || 'other'}`;
    data[key] = (data[key] || 0) + 1;
    storage.set('coin_recurrence', data);
    return data[key];
}

export function isRecurring(courseName, taskType) {
    const data = getRecurrenceData();
    const key = `${courseName || 'general'}::${taskType || 'other'}`;
    return (data[key] || 0) >= 3;
}

// ─── Coin Wallet ────────────────────────────────────────────────────
export function getCoinWallet() {
    return storage.get('coin_wallet') || { totalCoins: 0, weeklyCoins: 0, weekStart: '', history: [] };
}

export function addCoins(amount, taskTitle, reason) {
    const wallet = getCoinWallet();
    const todayStr = new Date().toISOString().split('T')[0];

    // Reset weekly counter if new week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    if (wallet.weekStart !== weekStartStr) {
        wallet.weeklyCoins = 0;
        wallet.weekStart = weekStartStr;
    }

    wallet.totalCoins = (wallet.totalCoins || 0) + amount;
    wallet.weeklyCoins = (wallet.weeklyCoins || 0) + amount;
    wallet.history = [
        { date: todayStr, task: taskTitle, coins: amount, reason },
        ...(wallet.history || []).slice(0, 19)
    ];

    storage.set('coin_wallet', wallet);
    return wallet;
}

// ─── AI Coin Scoring (on task creation) ─────────────────────────────
export async function scoreTaskCoins(task, courses, allTodos) {
    const courseName = courses?.find(c => c.id === task.course)?.name || 'General';

    if (GROQ_API_KEY) {
        const systemPrompt = `You are a gamification engine for a student productivity app. Analyze this task and return a JSON object with the coin reward. Consider these factors:

- Task type: exam prep and projects are worth more than simple assignments or readings
- Subject difficulty: STEM subjects (math, science, programming, engineering) score higher than others
- Description quality: detailed descriptions with clear goals score higher
- Priority level: high priority = more coins
- Recurrence penalty: reduce by 10-20% if this type of task appears frequently

Task data:
- Title: ${task.title}
- Description: ${task.description || 'none'}
- Course: ${courseName}
- Priority: ${task.priority || 'medium'}
- Tags: ${(task.tags || []).join(', ') || 'none'}
- Due date: ${task.dueDate || 'none'}

Return ONLY this JSON — no other text:
{"baseCoins":number,"taskType":"exam|project|assignment|lab|reading|quiz|other","difficultyScore":number,"reasoning":"short explanation"}`;

        try {
            const res = await fetch(GROQ_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Score this task.' }],
                    temperature: 0.5, max_tokens: 200
                })
            });
            if (res.ok) {
                const data = await res.json();
                const text = data.choices?.[0]?.message?.content || '';
                const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleaned);
                if (parsed.baseCoins) return parsed;
            }
        } catch (err) {
            console.warn('[CoinService] AI scoring failed:', err.message);
        }
    }

    // Local fallback
    const text = `${task.title} ${task.description || ''} ${(task.tags || []).join(' ')}`.toLowerCase();
    let baseCoins = 25;
    let taskType = 'other';

    if (text.includes('exam') || text.includes('midterm') || text.includes('final') || text.includes('test')) { baseCoins = 80; taskType = 'exam'; }
    else if (text.includes('project')) { baseCoins = 65; taskType = 'project'; }
    else if (text.includes('quiz')) { baseCoins = 50; taskType = 'quiz'; }
    else if (text.includes('lab')) { baseCoins = 45; taskType = 'lab'; }
    else if (text.includes('assignment') || text.includes('homework')) { baseCoins = 35; taskType = 'assignment'; }
    else if (text.includes('read') || text.includes('chapter')) { baseCoins = 20; taskType = 'reading'; }

    if (task.priority === 'high') baseCoins += 15;
    if (task.priority === 'low') baseCoins -= 5;
    baseCoins = Math.max(10, Math.min(100, baseCoins));

    return { baseCoins, taskType, difficultyScore: Math.round(baseCoins / 10), reasoning: 'Scored locally based on task type and priority.' };
}

// ─── Calculate Final Coins on Completion ────────────────────────────
export function calculateCompletionCoins(task, courses) {
    const baseCoins = task.coinReward?.baseCoins || 25;
    const courseName = courses?.find(c => c.id === task.course)?.name || 'General';
    const taskType = task.coinReward?.taskType || 'other';
    let coins = baseCoins;
    let bonusNote = '';

    // Early completion bonus
    if (task.dueDate) {
        const now = new Date();
        const due = new Date(task.dueDate);
        const daysEarly = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

        if (daysEarly >= 3) { coins = Math.round(coins * 1.5); bonusNote = '+50% early bonus! '; }
        else if (daysEarly >= 1) { coins = Math.round(coins * 1.25); bonusNote = '+25% early bonus! '; }
        else if (daysEarly < 0) { coins = Math.max(5, Math.round(coins * 0.75)); bonusNote = '-25% late penalty. '; }
    }

    // Recurrence detection
    const completionCount = recordCompletion(courseName, taskType);
    const recurring = completionCount >= 3;
    if (recurring) {
        coins = Math.max(5, Math.round(coins * 0.85));
        bonusNote += 'Recurring task -15%. ';
    }

    // Streak multiplier
    const { multiplier, label } = getStreakMultiplier();
    if (multiplier > 1) {
        coins = Math.round(coins * multiplier);
        bonusNote += `Streak ${label}! `;
    }

    coins = Math.max(5, coins);
    return { coins, bonusNote: bonusNote.trim(), recurring };
}
