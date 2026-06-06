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
// ─── Deduct Coins (penalties — never go negative) ───────────────────
export function deductCoins(amount, taskTitle, reason) {
    const wallet = getCoinWallet();
    const todayStr = new Date().toISOString().split('T')[0];

    const deduction = Math.min(amount, wallet.totalCoins || 0);
    wallet.totalCoins = Math.max(0, (wallet.totalCoins || 0) - deduction);
    wallet.weeklyCoins = Math.max(0, (wallet.weeklyCoins || 0) - deduction);
    wallet.history = [
        { date: todayStr, task: taskTitle, coins: -deduction, reason },
        ...(wallet.history || []).slice(0, 19)
    ];

    storage.set('coin_wallet', wallet);
    return wallet;
}

// ─── AI Coin Scoring (on task creation) ─────────────────────────────
export async function scoreTaskCoins(task, courses, allTodos) {
    const courseName = courses?.find(c => c.id === task.course)?.name || 'General';

    if (GROQ_API_KEY) {
        const existingTasksStr = (allTodos || [])
            .filter(t => t.course === task.course && t.id !== task.id && t.status !== 'completed')
            .map(t => t.title).join(', ') || 'None';

        const systemPrompt = `You are an intelligent academic task evaluator for a student productivity app. A student just created or updated a task. Analyze it deeply and return a fair, thoughtful coin reward. Consider ALL of these factors in your reasoning:

TASK DATA PROVIDED:
Title: ${task.title}
Description: ${task.description || 'none'}
Course/Subject: ${courseName}
Priority level set by student: ${task.priority || 'medium'}
Due date: ${task.dueDate || 'none'}
Subtasks count: ${(task.subtodos || []).length}
Student's existing tasks in same course: ${existingTasksStr}

RULES FOR YOUR JUDGMENT:
- Exams and major projects are inherently harder regardless of what priority the student set
- A detailed description signals the student understands the complexity — reward more
- Vague one-word descriptions signal either an easy task or poor planning — reward less
- STEM subjects (mathematics, programming, physics, engineering, data science, chemistry) have higher base difficulty than non-STEM
- If the student is already overloaded in a course (3+ pending tasks), this new task adds more cognitive load — bump coins slightly
- Due date proximity matters — a task due tomorrow that was just created means urgency — factor that in
- Never give the same coin amount twice in a row for similar tasks — vary it naturally

Return ONLY this JSON — no preamble, no explanation outside the JSON:
{
"taskType": "exam | major_project | minor_assignment | lab_report | reading | quiz | presentation | other",
"detectedDifficulty": "trivial | easy | medium | hard | extreme",
"difficultyReason": "one natural sentence explaining your judgment",
"baseCoins": number (trivial: 5-15, easy: 16-30, medium: 31-55, hard: 56-85, extreme: 86-150),
"aiPriorityScore": number (0-100),
"priorityReason": "one sentence on why this priority score",
"tip": "one short actionable tip for completing this task effectively"
}`;

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
                if (parsed.baseCoins) {
                    return {
                        baseCoins: parsed.baseCoins,
                        taskType: parsed.taskType || 'other',
                        detectedDifficulty: parsed.detectedDifficulty || 'medium',
                        difficultyReason: parsed.difficultyReason || 'Scored via AI.',
                        aiPriorityScore: parsed.aiPriorityScore || 50,
                        priorityReason: parsed.priorityReason || 'AI assigned priority.',
                        aiTip: parsed.tip || '',
                    };
                }
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

    return { 
        baseCoins, 
        taskType, 
        detectedDifficulty: 'medium', 
        difficultyReason: 'Scored locally based on task type and priority.',
        aiPriorityScore: 50,
        priorityReason: 'Local fallback priority.',
        aiTip: 'Break this down into smaller steps if needed.',
    };
}

// ─── Calculate Final Coins on Completion (AI-Powered) ───────────────
export async function calculateCompletionCoins(task, courses) {
    const baseCoins = task.coinReward?.baseCoins || task.baseCoins || 25;
    const courseName = courses?.find(c => c.id === task.course)?.name || 'General';
    const taskType = task.coinReward?.taskType || task.taskType || 'other';
    const detectedDifficulty = task.coinReward?.detectedDifficulty || task.detectedDifficulty || 'medium';
    const streakData = storage.get('study_streak') || { currentStreak: 1 };
    const streak = streakData.currentStreak || 1;
    const { multiplier: streakMultiplier } = getStreakMultiplier();

    // Calculate days early/late
    let daysEarly = 0;
    if (task.dueDate) {
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
        daysEarly = Math.floor((due - now) / (1000 * 60 * 60 * 24));
    }

    // Late-start penalty
    let latePenalty = 0;
    if (task.startedAt && task.dueDate) {
        const started = new Date(task.startedAt); started.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
        const daysLateStart = Math.floor((started - due) / (1000 * 60 * 60 * 24));
        if (daysLateStart > 0) {
            let pct = daysLateStart >= 4 ? 0.50 : daysLateStart === 3 ? 0.35 : daysLateStart === 2 ? 0.20 : 0.10;
            latePenalty = Math.round(baseCoins * pct);
        }
    }

    // Recurrence detection
    const completionCount = recordCompletion(courseName, taskType);
    const recurring = completionCount >= 3;
    const recurringDeduct = recurring ? Math.round(baseCoins * 0.15) : 0;

    // ─── Call AI for smart early bonus ───
    let earlyBonus = 0;
    let totalCoins = baseCoins;
    let reasoning = '';

    if (GROQ_API_KEY && daysEarly > 0) {
        const systemPrompt = `You are a reward engine for a student productivity app. A student just completed a task. Calculate the exact bonus coins to award using your own judgment based on ALL of these factors combined:

Task base coins: ${baseCoins}
Task type: ${taskType}
Priority level: ${task.priority || 'medium'}
AI Detected Difficulty: ${detectedDifficulty}
Days completed BEFORE due date: ${daysEarly}
Current study streak: ${streak} days
Was this task recurring in the same subject: ${recurring ? 'yes' : 'no'}

Rules:
- Completing 7+ days early on a high priority/extreme task should give a massive bonus — potentially doubling base coins
- Completing 1 day early on a low priority/trivial task gives a small bonus — maybe 10-15% extra
- Completing exactly on the due date gives no bonus — base coins only
- The earlier AND harder the task, the exponentially more bonus — not linear
- Think carefully and justify your number

Return ONLY this JSON — no other text:
{"bonusCoins":number,"totalCoins":number,"earlyBonus":number,"reasoning":"one sentence natural explanation shown to user"}`;

        try {
            const res = await fetch(GROQ_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Calculate the bonus now.' }],
                    temperature: 0.6, max_tokens: 200
                })
            });
            if (res.ok) {
                const data = await res.json();
                const text = data.choices?.[0]?.message?.content || '';
                const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleaned);
                earlyBonus = parsed.earlyBonus || parsed.bonusCoins || 0;
                reasoning = parsed.reasoning || '';
            }
        } catch (err) {
            console.warn('[CoinService] AI bonus calc failed:', err.message);
        }
    }

    // Fallback if AI didn't respond
    if (earlyBonus === 0 && daysEarly > 0) {
        if (daysEarly >= 7) earlyBonus = Math.round(baseCoins * 0.8);
        else if (daysEarly >= 3) earlyBonus = Math.round(baseCoins * 0.4);
        else if (daysEarly >= 1) earlyBonus = Math.round(baseCoins * 0.15);
        reasoning = `Completed ${daysEarly} day${daysEarly > 1 ? 's' : ''} early — nice work!`;
    }

    // Calculate total
    totalCoins = baseCoins + earlyBonus - latePenalty - recurringDeduct;
    // Apply streak multiplier to total
    totalCoins = Math.round(totalCoins * streakMultiplier);
    totalCoins = Math.max(5, totalCoins);

    const bonusNote = reasoning || (daysEarly < 0 ? 'Completed late.' : daysEarly === 0 ? 'Completed on time.' : `${daysEarly}d early!`);

    return {
        coins: totalCoins,
        baseCoins,
        earlyBonus,
        latePenalty,
        recurringDeduct,
        streakMultiplier,
        recurring,
        reasoning: bonusNote,
        daysEarly,
    };
}
