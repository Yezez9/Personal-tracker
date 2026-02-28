// AI Service — Google Gemini 2.0 Flash integration with local fallbacks
// API: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
// Free API key from https://aistudio.google.com

import storage from './storage';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─── Core Gemini call ────────────────────────────────────────────────
async function callGemini(prompt) {
    const apiKey = storage.get('gemini_api_key');
    if (!apiKey) return null;

    try {
        const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!res.ok) {
            console.warn('[Gemini] API error:', res.status);
            return null;
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err) {
        console.warn('[Gemini] Network error:', err.message);
        return null;
    }
}

function getApiKey() {
    return storage.get('gemini_api_key');
}

// ─── Helpers ──────────────────────────────────────────────────────────
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function buildContextSummary(context) {
    const { todos = [], schedule = [], courses = [], studySets = [], profile = {} } = context;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    const pending = todos.filter(t => t.status !== 'completed');
    const overdue = pending.filter(t => t.dueDate < todayStr);
    const todayTasks = pending.filter(t => t.dueDate === todayStr);
    const todayClasses = schedule.filter(s => s.day === dayName);

    let summary = `Student: ${profile?.name || 'Unknown'}, ${profile?.program || ''} at ${profile?.school || ''}\n`;
    summary += `Date: ${todayStr} (${dayName})\n`;
    summary += `Courses: ${courses.map(c => c.name).join(', ') || 'None'}\n`;
    summary += `Pending tasks (${pending.length}): ${pending.slice(0, 8).map(t => `"${t.title}" (due ${t.dueDate}, priority ${t.priority})`).join('; ') || 'None'}\n`;
    summary += `Overdue: ${overdue.length}. Due today: ${todayTasks.length}.\n`;
    summary += `Today's classes: ${todayClasses.map(c => `${c.startTime}-${c.endTime} ${courses.find(co => co.id === c.courseId)?.name || 'Class'}`).join(', ') || 'None'}\n`;
    summary += `Study sets: ${studySets.length}\n`;
    return summary;
}

// ─── Daily Briefing ──────────────────────────────────────────────────
export async function generateDailyBriefing(todos, schedule, profile) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    // Try Gemini first
    if (getApiKey()) {
        const context = buildContextSummary({ todos, schedule, profile });
        const prompt = `You are an AI academic assistant for a student. Generate a brief, friendly daily briefing (2-4 sentences max). Be specific about their tasks and schedule. Use emoji sparingly.\n\nContext:\n${context}\n\nGenerate a personalized daily briefing:`;
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

// ─── Priority Scoring (stays local for speed — called on every task add/update) ──
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

// ─── Natural Language Task Parsing ───────────────────────────────────
export async function parseNaturalLanguageTask(input, courses) {
    // Try Gemini for smart parsing
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

    // Local fallback
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

// ─── Flashcard Generation ────────────────────────────────────────────
export async function generateFlashcards(topic, count = 10) {
    // Try Gemini
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
                        front: c.front || '',
                        back: c.back || '',
                        mastered: false
                    }));
                }
            } catch (e) {
                console.warn('[Gemini] Flashcard parse failed, using local fallback');
            }
        }
    }

    // Local fallback
    const templates = [
        { front: `Define ${topic}`, back: `${topic} is a fundamental concept in this field of study. Review your course materials for the specific definition.` },
        { front: `What are the key components of ${topic}?`, back: `The key components typically include core principles, applications, and theoretical foundations. Add your specific notes here.` },
        { front: `Why is ${topic} important?`, back: `Understanding ${topic} is essential because it forms the basis for more advanced concepts in this area.` },
        { front: `Give an example of ${topic}`, back: `[Add a specific example from your course notes here]` },
        { front: `How does ${topic} relate to previous concepts?`, back: `${topic} builds upon foundational ideas covered earlier in the course.` },
        { front: `What are common misconceptions about ${topic}?`, back: `A common mistake is confusing ${topic} with related but distinct concepts.` },
        { front: `Summarize ${topic} in one sentence`, back: `Write your own concise summary here for better retention.` },
        { front: `What is the formula/rule for ${topic}?`, back: `Refer to your textbook for the specific formula or rule.` },
        { front: `Compare and contrast: ${topic}`, back: `List similarities and differences with related concepts.` },
        { front: `What would happen without ${topic}?`, back: `Consider the implications of removing this concept from the system.` },
    ];
    return templates.slice(0, count).map((t, i) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `card-${Date.now()}-${i}`,
        front: t.front, back: t.back, mastered: false
    }));
}

// ─── VA Chat Response ────────────────────────────────────────────────
export async function generateVAResponse(message, context) {
    const msg = message.toLowerCase();
    const { todos = [], schedule = [], courses = [], studySets = [], profile = {} } = context;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    // Detect action intents locally for task creation and flashcard generation
    // so we can handle structured responses (dispatching actions to state)
    if (msg.includes('add a task') || msg.includes('create a task') || msg.includes('new task') || msg.includes('remind me to')) {
        const parsed = await parseNaturalLanguageTask(message, courses);
        return {
            responseType: 'createTask',
            message: `Got it! I'll create this task:\n\n📝 **${parsed.title}**\n📅 Due: ${parsed.dueDate || 'Not set'}\n⏰ Time: ${parsed.dueTime || 'Not set'}\n🔴 Priority: ${parsed.priority}\n${parsed.course ? `📁 Course: ${courses.find(c => c.id === parsed.course)?.name || ''}` : ''}`,
            data: parsed
        };
    }

    if (msg.includes('flashcard') || msg.includes('study set') || msg.includes('generate cards')) {
        const topicMatch = message.match(/(?:about|on|for|cards?(?:\s+for)?)\s+(.+?)(?:\s+for|\s*$)/i);
        const topic = topicMatch ? topicMatch[1].trim() : 'this topic';
        const countMatch = message.match(/(\d+)\s*(?:flashcard|card)/i);
        const count = countMatch ? parseInt(countMatch[1]) : 5;
        const cards = await generateFlashcards(topic, count);
        return {
            responseType: 'createFlashcards',
            message: `Generated ${cards.length} flashcards about "${topic}"! 🃏 They've been added to your study sets.`,
            data: { topic, cards }
        };
    }

    // For all other messages, try Gemini for a natural conversation
    if (getApiKey()) {
        const contextSummary = buildContextSummary(context);
        const prompt = `You are FolderlyAI, a friendly, concise academic assistant inside a student organizer app. You have access to the student's data below. Respond helpfully in 2-5 sentences. Use bold (**text**) for emphasis and emoji sparingly. Be actionable and specific based on their data.\n\nStudent Data:\n${contextSummary}\n\nStudent says: "${message}"\n\nRespond naturally:`;

        const result = await callGemini(prompt);
        if (result) return { responseType: 'chat', message: result };
    }

    // ─── Local fallback for specific intents ──────────────────────────
    if (msg.includes('what should i') || msg.includes('work on') || msg.includes('prioritize') || msg.includes('focus on')) {
        const pending = todos.filter(t => t.status !== 'completed').sort((a, b) => (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0));
        if (pending.length === 0) return { responseType: 'chat', message: "You're all caught up! 🎉 No pending tasks. Maybe review some study sets or get ahead on future readings?" };
        const top3 = pending.slice(0, 3);
        let reply = "Here's what I'd focus on today:\n\n";
        top3.forEach((t, i) => { reply += `${i + 1}. **${t.title}** — due ${t.dueDate === todayStr ? 'today' : t.dueDate} (priority score: ${t.aiPriorityScore || '—'})\n`; });
        reply += `\nStart with #1 and work your way down. You've got this! 💪`;
        return { responseType: 'priorityList', message: reply };
    }

    if (msg.includes('class') || msg.includes('schedule') || msg.includes('lecture')) {
        if (msg.includes('tomorrow')) {
            const tmrDay = new Date(today); tmrDay.setDate(tmrDay.getDate() + 1);
            const tmrName = tmrDay.toLocaleDateString('en-US', { weekday: 'long' });
            const tmrClasses = schedule.filter(s => s.day === tmrName);
            if (tmrClasses.length === 0) return { responseType: 'chat', message: `No classes tomorrow (${tmrName}). Sleep in! 😴` };
            let reply = `Tomorrow (${tmrName}) you have:\n\n`;
            tmrClasses.forEach(c => { reply += `• ${c.startTime}–${c.endTime} — ${courses.find(co => co.id === c.courseId)?.name || 'Class'} (${c.room || 'TBD'})\n`; });
            return { responseType: 'chat', message: reply };
        }
        const todayClasses = schedule.filter(s => s.day === dayName);
        if (todayClasses.length === 0) return { responseType: 'chat', message: `No classes today (${dayName})! Free day to catch up on tasks.` };
        let reply = `Today's classes:\n\n`;
        todayClasses.forEach(c => { reply += `• ${c.startTime}–${c.endTime} — ${courses.find(co => co.id === c.courseId)?.name || 'Class'} (${c.room || 'TBD'})\n`; });
        return { responseType: 'chat', message: reply };
    }

    if (msg.includes('how am i') || msg.includes('stress') || msg.includes('doing this week') || msg.includes('how\'s my week')) {
        const overdue = todos.filter(t => t.dueDate < todayStr && t.status !== 'completed');
        const completed = todos.filter(t => t.status === 'completed');
        const upcoming = todos.filter(t => { const d = (new Date(t.dueDate) - today) / (1000 * 60 * 60 * 24); return d >= 0 && d <= 7 && t.status !== 'completed'; });
        let reply = '';
        if (overdue.length > 0) reply += `Honest check: you have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. That's not ideal, but it's fixable. `;
        reply += `You've completed ${completed.length} task${completed.length !== 1 ? 's' : ''} total. `;
        if (upcoming.length > 0) reply += `${upcoming.length} more due this week. `;
        if (overdue.length > 3) reply += `\n\nReal talk: you're behind. Pick the 2 most important overdue tasks and knock them out today. Don't try to do everything at once.`;
        else if (overdue.length > 0) reply += `\n\nYou're slightly behind, but totally recoverable. Handle the overdue items first, then tackle what's coming up.`;
        else reply += `\n\nYou're in good shape! Keep the momentum going. 🚀`;
        return { responseType: 'chat', message: reply };
    }

    if (msg.includes('don\'t feel') || msg.includes('dont feel') || msg.includes('motivated') || msg.includes('tired') || msg.includes('don\'t want to') || msg.includes('cant focus') || msg.includes('lazy')) {
        const motivations = [
            "I hear you. Here's what works: set a 25-minute timer, work on just ONE thing, then take a 5 min break. Don't try to be motivated — just start. Motivation follows action, not the other way around.",
            "Honestly? You don't need to feel like it. You just need to show up for 15 minutes. After 15 minutes, if you still hate it, stop. But most of the time, you'll keep going once you start.",
            "Take a 10-minute walk, drink some water, and come back. Then pick the smallest, easiest task on your list and just do that one thing. Small wins build momentum.",
            "Even the most productive students have days like this. The difference is they do a little bit anyway. Pick one task — just one — and give it 20 minutes. You'll feel better after.",
        ];
        return { responseType: 'chat', message: motivations[Math.floor(Math.random() * motivations.length)] };
    }

    if (msg.includes('summarize') || msg.includes('summary')) {
        const textToSummarize = message.replace(/summarize|summary|this|for me|please/gi, '').trim();
        if (textToSummarize.length < 20) return { responseType: 'chat', message: "Paste the text you'd like me to summarize and I'll break it down for you." };
        const sentences = textToSummarize.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 5);
        let summary = "**Key Points:**\n\n";
        sentences.forEach(s => { summary += `• ${s.trim()}\n`; });
        return { responseType: 'chat', message: summary };
    }

    // Generic
    return { responseType: 'chat', message: "I can help you with:\n\n• **Prioritize tasks** — \"What should I work on first?\"\n• **Add tasks** — \"Add a task to submit my essay by Friday\"\n• **Check schedule** — \"Do I have class tomorrow?\"\n• **Generate flashcards** — \"Generate 5 flashcards about photosynthesis\"\n• **Weekly check-in** — \"How am I doing this week?\"\n• **Summarize notes** — Paste text and say \"Summarize this\"\n\nWhat do you need?" };
}
