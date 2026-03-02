// AI Service — Groq LLaMA 3.3 70B for AI Assistant + Gemini 2.0 Flash for utilities
// Groq: https://api.groq.com/openai/v1/chat/completions
// Gemini: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─── Core API calls ──────────────────────────────────────────────────
async function callGemini(prompt) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_KEY_HERE') return null;
    try {
        const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!res.ok) { console.warn('[Gemini] API error:', res.status); return null; }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err) {
        console.warn('[Gemini] Network error:', err.message);
        return null;
    }
}

async function callGroq(messages) {
    try {
        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                temperature: 1.0,
                max_tokens: 1000
            })
        });
        if (!res.ok) {
            console.warn('[Groq] API error:', res.status);
            return null;
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (err) {
        console.warn('[Groq] Network error:', err.message);
        return null;
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function getApiKey() {
    return GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_KEY_HERE' ? GEMINI_API_KEY : null;
}

// ─── Build Full Live Data JSON ───────────────────────────────────────
function buildFullDataJSON(context) {
    const { todos = [], schedule = [], courses = [], studySets = [], profile = {}, bookmarks = [], countdowns = [] } = context;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    return {
        currentDateTime: {
            date: todayStr,
            day: dayName,
            time: today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        },
        studentProfile: {
            name: profile?.name || 'Unknown',
            studentId: profile?.studentId || null,
            program: profile?.program || null,
            school: profile?.school || null,
        },
        courses: courses.map(c => ({
            name: c.name,
            code: c.code || null,
        })),
        tasks: {
            summary: {
                total: todos.length,
                pending: todos.filter(t => t.status === 'pending').length,
                inProgress: todos.filter(t => t.status === 'in_progress').length,
                completed: todos.filter(t => t.status === 'completed').length,
                overdue: todos.filter(t => t.dueDate < todayStr && t.status !== 'completed').length,
                dueToday: todos.filter(t => t.dueDate === todayStr && t.status !== 'completed').length,
            },
            all: todos.map(t => ({
                title: t.title,
                description: t.description || null,
                dueDate: t.dueDate || null,
                dueTime: t.dueTime || null,
                status: t.status,
                priority: t.priority,
                course: courses.find(c => c.id === t.courseId)?.name || null,
                aiPriorityScore: t.aiPriorityScore || null,
            }))
        },
        weeklySchedule: schedule.map(s => ({
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            courseName: courses.find(c => c.id === s.courseId)?.name || 'Class',
            room: s.room || null,
        })),
        todaysClasses: schedule.filter(s => s.day === dayName).map(s => ({
            time: `${s.startTime}–${s.endTime}`,
            course: courses.find(c => c.id === s.courseId)?.name || 'Class',
            room: s.room || null,
        })),
        studySets: studySets.map(s => ({
            title: s.title,
            totalCards: s.cards?.length || 0,
            masteredCards: s.cards?.filter(c => c.mastered).length || 0,
        })),
        countdowns: (countdowns || []).map(c => ({
            title: c.title,
            targetDate: c.date || c.targetDate,
        })),
        bookmarks: (bookmarks || []).slice(0, 20).map(b => ({
            title: b.title,
            url: b.url,
        })),
    };
}

// ─── Daily Briefing (uses Gemini for quick single-shot) ─────────────
export async function generateDailyBriefing(todos, schedule, profile) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    if (getApiKey()) {
        const context = buildFullDataJSON({ todos, schedule, profile });
        const prompt = `You are an AI academic assistant. Generate a brief, friendly daily briefing (2-4 sentences max). Be specific about their tasks and schedule. Use emoji sparingly.\n\nStudent data:\n${JSON.stringify(context, null, 2)}\n\nGenerate a personalized daily briefing:`;
        const result = await callGemini(prompt);
        if (result) return result;
    }

    // Local fallback
    const todayTasks = todos.filter(t => t.dueDate === todayStr && t.status !== 'completed');
    const overdueTasks = todos.filter(t => t.dueDate < todayStr && t.status !== 'completed');
    const upcomingTasks = todos.filter(t => {
        const diff = (new Date(t.dueDate) - today) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 3 && t.status !== 'completed';
    });
    const todayClasses = schedule.filter(s => s.day === dayName);
    const name = profile?.name || 'there';

    let briefing = `${getGreeting()}, ${name}! `;
    if (todayTasks.length > 0) {
        briefing += `You have ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today. `;
        const highPriority = todayTasks.filter(t => t.priority === 'high');
        if (highPriority.length > 0) briefing += `"${highPriority[0].title}" is high priority — tackle that first. `;
    } else {
        briefing += `No tasks due today — nice! `;
    }
    if (overdueTasks.length > 0) briefing += `⚠️ You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} that need attention. `;
    if (todayClasses.length > 0) briefing += `You have ${todayClasses.length} class${todayClasses.length > 1 ? 'es' : ''} today. `;
    if (upcomingTasks.length > 0) briefing += `${upcomingTasks.length} more deadline${upcomingTasks.length > 1 ? 's' : ''} coming up in the next 3 days.`;
    if (todayTasks.length === 0 && overdueTasks.length === 0 && todayClasses.length === 0) {
        briefing += `Looks like a light day. Great time to get ahead on upcoming work or review your study sets! 📖`;
    }
    return briefing;
}

// ─── Priority Scoring (stays local for speed) ───────────────────────
export function generatePriorityScore(task, allTodos) {
    let score = 50;
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) score += 40;
    else if (daysUntilDue === 0) score += 35;
    else if (daysUntilDue === 1) score += 25;
    else if (daysUntilDue <= 3) score += 15;
    else if (daysUntilDue <= 7) score += 5;
    else score -= 10;

    if (task.priority === 'high') score += 15;
    else if (task.priority === 'low') score -= 10;
    if (task.tags?.includes('exam')) score += 10;
    if (task.tags?.includes('assignment')) score += 5;

    const sameDayTasks = allTodos.filter(t => t.dueDate === task.dueDate && t.id !== task.id);
    if (sameDayTasks.length > 2) score += 5;
    score = Math.max(0, Math.min(100, score));

    let reason = '';
    if (daysUntilDue < 0) reason = 'This task is overdue and needs immediate attention.';
    else if (daysUntilDue === 0) reason = 'Due today — prioritize this.';
    else if (daysUntilDue === 1) reason = 'Due tomorrow. Start working on it now.';
    else if (task.priority === 'high') reason = `High priority task due in ${daysUntilDue} days.`;
    else reason = `Due in ${daysUntilDue} days. ${task.priority === 'low' ? 'Lower priority — handle when you can.' : 'Plan ahead.'}`;

    return { score, reason };
}

// ─── Natural Language Task Parsing (Gemini) ─────────────────────────
export async function parseNaturalLanguageTask(input, courses) {
    if (getApiKey()) {
        const courseList = courses?.map(c => `${c.name} (id: ${c.id}, code: ${c.code})`).join(', ') || 'None';
        const prompt = `Parse this natural language task input into structured data. Respond ONLY with valid JSON, no markdown formatting.\n\nInput: "${input}"\nAvailable courses: ${courseList}\nToday's date: ${new Date().toISOString().split('T')[0]}\n\nRespond with exactly this JSON format:\n{"title": "cleaned task title", "course": "course id if mentioned or empty string", "dueDate": "YYYY-MM-DD or empty string", "dueTime": "HH:MM or empty string", "priority": "high/medium/low", "tags": ["relevant", "tags"]}`;

        const result = await callGemini(prompt);
        if (result) {
            try {
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleaned);
                return {
                    title: parsed.title || input,
                    course: parsed.course || '',
                    dueDate: parsed.dueDate || '',
                    dueTime: parsed.dueTime || '',
                    priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
                    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                };
            } catch (e) {
                console.warn('[Gemini] Parse failed, using local fallback');
            }
        }
    }
    return parseNaturalLanguageTaskLocal(input, courses);
}

function parseNaturalLanguageTaskLocal(input, courses) {
    const result = { title: input, course: '', dueDate: '', dueTime: '', priority: 'medium', tags: [] };

    if (/\b(high priority|urgent|important|asap)\b/i.test(input)) {
        result.priority = 'high';
        result.title = result.title.replace(/\b(high priority|urgent|important|asap)\b/gi, '').trim();
    } else if (/\b(low priority|whenever|no rush)\b/i.test(input)) {
        result.priority = 'low';
        result.title = result.title.replace(/\b(low priority|whenever|no rush)\b/gi, '').trim();
    }

    const today = new Date();
    const dayPatterns = {
        'today': 0, 'tonight': 0, 'tomorrow': 1,
        'monday': null, 'tuesday': null, 'wednesday': null,
        'thursday': null, 'friday': null, 'saturday': null, 'sunday': null,
    };
    for (const [dayWord, offset] of Object.entries(dayPatterns)) {
        const regex = new RegExp(`\\b(by |on |due |before )?${dayWord}\\b`, 'i');
        if (regex.test(input)) {
            if (offset !== null) {
                const d = new Date(today); d.setDate(d.getDate() + offset);
                result.dueDate = d.toISOString().split('T')[0];
            } else {
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const targetDay = dayNames.indexOf(dayWord);
                const currentDay = today.getDay();
                let daysAhead = targetDay - currentDay;
                if (daysAhead <= 0) daysAhead += 7;
                const d = new Date(today); d.setDate(d.getDate() + daysAhead);
                result.dueDate = d.toISOString().split('T')[0];
            }
            result.title = result.title.replace(new RegExp(`\\b(by |on |due |before )?${dayWord}\\b`, 'gi'), '').trim();
            break;
        }
    }

    const timeMatch = input.match(/\b(\d{1,2})(:\d{2})?\s*(am|pm)\b/i);
    if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const min = timeMatch[2] ? timeMatch[2].slice(1) : '00';
        const ampm = timeMatch[3].toLowerCase();
        if (ampm === 'pm' && hour !== 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        result.dueTime = `${hour.toString().padStart(2, '0')}:${min}`;
        result.title = result.title.replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi, '').trim();
    }

    if (courses?.length) {
        for (const course of courses) {
            const codeRegex = new RegExp(`\\b${course.code}\\b`, 'i');
            const nameRegex = new RegExp(`\\b${course.name}\\b`, 'i');
            if (codeRegex.test(input) || nameRegex.test(input)) {
                result.course = course.id;
                result.title = result.title.replace(codeRegex, '').replace(nameRegex, '').trim();
                break;
            }
        }
    }

    const tagPatterns = { exam: /\bexam\b/i, assignment: /\b(assignment|homework|hw)\b/i, reading: /\breading\b/i, project: /\bproject\b/i, quiz: /\bquiz\b/i, essay: /\bessay\b/i, lab: /\blab\b/i };
    for (const [tag, regex] of Object.entries(tagPatterns)) {
        if (regex.test(input)) result.tags.push(tag);
    }

    result.title = result.title.replace(/\b(submit|add|create|do|finish|complete|for|it's|its|,)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (!result.title) result.title = input.slice(0, 50);
    return result;
}

// ─── Flashcard Generation (Gemini) ──────────────────────────────────
export async function generateFlashcards(topic, count = 10) {
    if (getApiKey()) {
        const prompt = `Generate exactly ${count} flashcards about "${topic}" for a student. Respond ONLY with valid JSON, no markdown formatting. Format:\n[{"front": "question", "back": "concise answer"}, ...]\n\nMake the questions vary in type: definitions, examples, comparisons, applications. Keep answers clear and educational.`;

        const result = await callGemini(prompt);
        if (result) {
            try {
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const cards = JSON.parse(cleaned);
                if (Array.isArray(cards)) {
                    return cards.slice(0, count).map((c, i) => ({
                        id: crypto.randomUUID ? crypto.randomUUID() : `card-${Date.now()}-${i}`,
                        front: c.front || '', back: c.back || '', mastered: false
                    }));
                }
            } catch (e) {
                console.warn('[Gemini] Flashcard parse failed, using local fallback');
            }
        }
    }

    const templates = [
        { front: `Define ${topic}`, back: `${topic} is a fundamental concept in this field of study.` },
        { front: `What are the key components of ${topic}?`, back: `The key components include core principles, applications, and foundations.` },
        { front: `Why is ${topic} important?`, back: `It forms the basis for more advanced concepts in this area.` },
        { front: `Give an example of ${topic}`, back: `[Add a specific example from your course notes]` },
        { front: `How does ${topic} relate to previous concepts?`, back: `It builds upon foundational ideas covered earlier.` },
        { front: `Common misconceptions about ${topic}?`, back: `A common mistake is confusing ${topic} with related but distinct concepts.` },
        { front: `Summarize ${topic} in one sentence`, back: `Write your own concise summary here.` },
        { front: `What is the formula/rule for ${topic}?`, back: `Refer to your textbook for the specific formula.` },
        { front: `Compare and contrast: ${topic}`, back: `List similarities and differences with related concepts.` },
        { front: `What would happen without ${topic}?`, back: `Consider the implications of removing this concept.` },
    ];
    return templates.slice(0, count).map((t, i) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `card-${Date.now()}-${i}`,
        front: t.front, back: t.back, mastered: false
    }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ─── VA Chat Response — Groq LLaMA 3.3 70B ─────────────────────────
// Fully conversational, free-thinking AI. No scripted responses.
// Uses OpenAI chat completions format with full conversation history.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateVAResponse(message, context) {
    // Build fresh live data snapshot every single call
    const fullData = buildFullDataJSON(context);
    const chatHistory = context.chatHistory || [];

    // System prompt — injected with live data on every call
    const systemPrompt = `You are a real AI assistant inside TaskTrack, a student organizer app. When the user sends a message, first think about what they are asking and what information from their data is relevant, then give a natural, intelligent response. Think freely — you are not a chatbot with commands. You can answer anything, have a real conversation, give opinions, help with studying, explain concepts, or just chat. You happen to also have access to this student's personal data:

${JSON.stringify(fullData, null, 2)}

Use this data when relevant (e.g. if they ask about their name, tasks, schedule, courses), but ignore it when not relevant (e.g. if they want to chat, ask a general knowledge question, or need help with a concept). Be conversational, warm, and smart. Use markdown formatting — **bold** for emphasis, bullet points, etc. Keep responses concise but thorough.`;

    // Build messages array: system + full conversation history + current message
    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    // Add full conversation history so AI remembers everything
    chatHistory.forEach(m => {
        messages.push({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
        });
    });

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Groq with LLaMA 3.3 70B
    const result = await callGroq(messages);
    if (result) {
        return { responseType: 'chat', message: result };
    }

    // Final fallback — only if Groq is completely down
    return {
        responseType: 'chat',
        message: `I'm having trouble connecting right now. Try again in a moment! 🔄`
    };
}
