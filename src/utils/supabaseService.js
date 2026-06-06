// Supabase Cloud Database Service — REST API (no npm package needed)
// User must set these in .env or directly here after creating a Supabase project
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

// ─── User ID Management ────────────────────────────────────────────
export function getUserId() {
    let userId = localStorage.getItem('tasktrack_user_id');
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('tasktrack_user_id', userId);
    }
    return userId;
}

// ─── Check if Supabase is configured ────────────────────────────────
export function isSupabaseConfigured() {
    return !!(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('YOUR_'));
}

// ─── Core fetch helper ──────────────────────────────────────────────
async function supaFetch(path, options = {}) {
    if (!isSupabaseConfigured()) return null;

    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation',
        ...options.headers,
    };

    try {
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const err = await res.text();
            console.error(`[Supabase] ${options.method || 'GET'} ${path} failed:`, res.status, err);
            return null;
        }
        const text = await res.text();
        return text ? JSON.parse(text) : [];
    } catch (err) {
        console.error('[Supabase] Network error:', err);
        return null;
    }
}

// ─── Generic CRUD ───────────────────────────────────────────────────
async function fetchAll(table, userId) {
    return await supaFetch(`${table}?user_id=eq.${userId}&order=created_at.desc`);
}

async function insertRow(table, data) {
    return await supaFetch(table, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

async function updateRow(table, id, data) {
    return await supaFetch(`${table}?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

async function deleteRow(table, id) {
    return await supaFetch(`${table}?id=eq.${id}`, {
        method: 'DELETE',
    });
}

// ─── User Profile ───────────────────────────────────────────────────
export async function fetchUserProfile(userId) {
    const rows = await supaFetch(`users?id=eq.${userId}`);
    return rows?.[0] || null;
}

export async function upsertUserProfile(userId, profile) {
    const existing = await fetchUserProfile(userId);
    const data = {
        id: userId,
        name: profile.name,
        program: profile.program || profile.major,
        school: profile.school,
        avatar: profile.avatar,
        coins: profile.coins || 0,
        streak: profile.streak || 0,
        last_opened: new Date().toISOString().split('T')[0],
        notification_preferences: profile.notificationPreferences || {
            master: true, morning: true, deadline: true, recurring: true, streak: true
        }
    };
    if (existing) {
        return await updateRow('users', userId, data);
    } else {
        return await supaFetch('users', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Prefer': 'return=representation' },
        });
    }
}

// ─── Tasks ──────────────────────────────────────────────────────────
export async function fetchTasks(userId) {
    return await fetchAll('tasks', userId) || [];
}

export async function syncTask(action, task, userId) {
    const row = {
        user_id: userId,
        id: task.id,
        title: task.title,
        description: task.description || '',
        course_id: task.course || null,
        due_date: task.dueDate || null,
        due_time: task.dueTime || null,
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        ai_priority_score: task.aiPriorityScore || 0,
        coins_awarded: task.coinsAwarded || false,
        completed_at: task.completedAt || null,
        started_at: task.startedAt || null,
        base_coins: task.coinReward?.baseCoins || task.baseCoins || 0,
        total_coins: task.coinReward?.totalCoins || 0,
        task_type: task.taskType || 'other',
        detected_difficulty: task.detectedDifficulty || 'medium',
        ai_tip: task.aiTip || '',
        difficulty_reason: task.difficultyReason || '',
    };

    switch (action) {
        case 'add': return await insertRow('tasks', row);
        case 'update': return await updateRow('tasks', task.id, row);
        case 'delete': return await deleteRow('tasks', task.id);
    }
}

// ─── Recurring Tasks ────────────────────────────────────────────────
export async function fetchRecurringTasks(userId) {
    return await fetchAll('recurring_tasks', userId) || [];
}

export async function syncRecurringTask(action, task, userId) {
    const row = {
        user_id: userId,
        id: task.id,
        title: task.title,
        description: task.description || '',
        difficulty: task.difficulty || 'medium',
        base_coins: task.baseCoins || 25,
        penalty_coins: task.penaltyCoins || 10,
        current_streak: task.currentStreak || 0,
        longest_streak: task.longestStreak || 0,
        last_completed_date: task.lastCompletedDate || null,
        consecutive_failed_days: task.consecutiveFailedDays || 0,
        total_completions: task.totalCompletions || 0,
        is_active: task.isActive !== false,
    };

    switch (action) {
        case 'add': return await insertRow('recurring_tasks', row);
        case 'update': return await updateRow('recurring_tasks', task.id, row);
        case 'delete': return await deleteRow('recurring_tasks', task.id);
    }
}

// ─── Courses ────────────────────────────────────────────────────────
export async function fetchCourses(userId) {
    return await fetchAll('courses', userId) || [];
}

export async function syncCourse(action, course, userId) {
    const row = {
        user_id: userId,
        id: course.id,
        name: course.name,
        code: course.code || '',
        color: course.color || '#6C63FF',
        icon: course.icon || '📚',
        professor: course.professor || '',
    };

    switch (action) {
        case 'add': return await insertRow('courses', row);
        case 'update': return await updateRow('courses', course.id, row);
        case 'delete': return await deleteRow('courses', course.id);
    }
}

// ─── Schedule ───────────────────────────────────────────────────────
export async function fetchSchedule(userId) {
    // Schedule uses a generic approach — stored as JSON in a single row
    // or as individual rows. We'll use individual rows with a 'schedule' table.
    return await fetchAll('schedule', userId) || [];
}

export async function syncScheduleItem(action, item, userId) {
    const row = {
        user_id: userId,
        id: item.id,
        course_id: item.courseId || null,
        day: item.day,
        start_time: item.startTime,
        end_time: item.endTime,
        room: item.room || '',
        color: item.color || '',
    };

    switch (action) {
        case 'add': return await insertRow('schedule', row);
        case 'update': return await updateRow('schedule', item.id, row);
        case 'delete': return await deleteRow('schedule', item.id);
    }
}

// ─── Countdowns ──────────────────────────────────────────────────────
export async function fetchCountdowns(userId) {
    return await fetchAll('countdowns', userId) || [];
}

export async function syncCountdown(action, item, userId) {
    const row = {
        user_id: userId,
        id: item.id,
        title: item.title,
        target_date: item.date,
        icon: item.icon || '🎯',
        color: item.color || '#6C63FF',
    };

    switch (action) {
        case 'add': return await insertRow('countdowns', row);
        case 'update': return await updateRow('countdowns', item.id, row);
        case 'delete': return await deleteRow('countdowns', item.id);
    }
}

// ─── Bookmarks ───────────────────────────────────────────────────────
export async function fetchBookmarks(userId) {
    return await fetchAll('bookmarks', userId) || [];
}

export async function syncBookmark(action, item, userId) {
    const row = {
        user_id: userId,
        id: item.id,
        url: item.url,
        title: item.title,
        description: item.description || '',
        course_id: item.courseId || null,
    };

    switch (action) {
        case 'add': return await insertRow('bookmarks', row);
        case 'update': return await updateRow('bookmarks', item.id, row);
        case 'delete': return await deleteRow('bookmarks', item.id);
    }
}

// ─── Shop Purchases ──────────────────────────────────────────────────
export async function fetchShopPurchases(userId) {
    return await fetchAll('shop_purchases', userId) || [];
}

export async function syncShopPurchase(action, item, userId) {
    // For shop purchases, item is just { id, itemId } or we might delete by id
    const row = {
        user_id: userId,
        id: item.id,
        item_id: item.itemId,
    };

    switch (action) {
        case 'add': return await insertRow('shop_purchases', row);
        case 'delete': return await deleteRow('shop_purchases', item.id);
    }
}

// ─── Load All Data ──────────────────────────────────────────────────
export async function loadAllFromSupabase(userId) {
    if (!isSupabaseConfigured()) return null;

    try {
        const [profile, tasks, recurringTasks, courses, schedule, countdowns, bookmarks, shopPurchases] = await Promise.all([
            fetchUserProfile(userId),
            fetchTasks(userId),
            fetchRecurringTasks(userId),
            fetchCourses(userId),
            fetchSchedule(userId),
            fetchCountdowns(userId),
            fetchBookmarks(userId),
            fetchShopPurchases(userId),
        ]);

        // Transform Supabase snake_case → app camelCase
        const transformedTasks = (tasks || []).map(t => ({
            id: t.id, title: t.title, description: t.description,
            course: t.course_id, dueDate: t.due_date, dueTime: t.due_time,
            priority: t.priority, status: t.status,
            aiPriorityScore: t.ai_priority_score, coinsAwarded: t.coins_awarded,
            completedAt: t.completed_at, startedAt: t.started_at,
            coinReward: { baseCoins: t.base_coins, totalCoins: t.total_coins },
            taskType: t.task_type || 'other',
            detectedDifficulty: t.detected_difficulty || 'medium',
            aiTip: t.ai_tip || '',
            difficultyReason: t.difficulty_reason || '',
            createdAt: t.created_at, subtodos: [], tags: [],
            aiPriorityReason: '', _pendingCoinAward: false,
        }));

        const transformedRecurring = (recurringTasks || []).map(t => ({
            id: t.id, title: t.title, description: t.description,
            difficulty: t.difficulty, baseCoins: t.base_coins,
            penaltyCoins: t.penalty_coins, currentStreak: t.current_streak,
            longestStreak: t.longest_streak, lastCompletedDate: t.last_completed_date,
            consecutiveFailedDays: t.consecutive_failed_days,
            totalCompletions: t.total_completions, isActive: t.is_active,
            createdAt: t.created_at, isCompletedToday: false,
            failedDays: 0, completionLog: [], frequency: 'daily',
        }));

        const transformedCourses = (courses || []).map(c => ({
            id: c.id, name: c.name, code: c.code,
            color: c.color, icon: c.icon, professor: c.professor,
        }));

        const transformedSchedule = (schedule || []).map(s => ({
            id: s.id, courseId: s.course_id, day: s.day,
            startTime: s.start_time, endTime: s.end_time,
            room: s.room, color: s.color,
        }));

        const transformedCountdowns = (countdowns || []).map(c => ({
            id: c.id, title: c.title, date: c.target_date,
            icon: c.icon, color: c.color,
        }));

        const transformedBookmarks = (bookmarks || []).map(b => ({
            id: b.id, url: b.url, title: b.title,
            description: b.description, courseId: b.course_id,
        }));

        const transformedShopPurchases = (shopPurchases || []).map(s => ({
            id: s.id, itemId: s.item_id, purchasedAt: s.purchased_at,
        }));

        const transformedProfile = profile ? {
            name: profile.name, major: profile.program, program: profile.program,
            school: profile.school, avatar: profile.avatar,
            coins: profile.coins, streak: profile.streak, lastOpened: profile.last_opened,
            notificationPreferences: profile.notification_preferences || {
                master: true, morning: true, deadline: true, recurring: true, streak: true
            }
        } : null;

        return {
            profile: transformedProfile,
            todos: transformedTasks,
            recurringTasks: transformedRecurring,
            courses: transformedCourses,
            schedule: transformedSchedule,
            countdowns: transformedCountdowns,
            bookmarks: transformedBookmarks,
            shopPurchases: transformedShopPurchases,
        };
    } catch (err) {
        console.error('[Supabase] Failed to load all data:', err);
        return null;
    }
}
