import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import storage from '../utils/storage';
import { generateId } from '../utils/helpers';
import { scoreTaskCoins, calculateCompletionCoins, addCoins } from '../utils/coinService';
import { fireImmediateNotification } from '../utils/NotificationScheduler';
import {
    isSupabaseConfigured, getUserId, loadAllFromSupabase,
    upsertUserProfile, syncTask, syncRecurringTask, syncCourse, syncScheduleItem,
    syncCountdown, syncBookmark, syncShopPurchase
} from '../utils/supabaseService';

const AppContext = createContext();

// Local-first initial state (used as fallback if Supabase not configured)
const initialState = {
    profile: storage.get('student_profile') || null,
    courses: storage.get('courses') || [],
    todos: storage.get('todos') || [],
    schedule: storage.get('schedule') || [],
    recurringTasks: storage.get('recurring_tasks') || [],
    shopPurchases: storage.get('shop_purchases') || [],
    notifications: storage.get('notifications') || [],
    chatHistory: storage.get('va_chat_history') || [],
    onboardingComplete: storage.get('onboarding_complete') || false,
    currentPage: 'dashboard',
    _loading: isSupabaseConfigured(), // Set to true initially if Supabase is configured
    _cloudReady: false,    // Whether Supabase data has been loaded
};

function appReducer(state, action) {
    switch (action.type) {
        // ─── Hydrate from cloud ─────────────────────────────────
        case 'HYDRATE_FROM_CLOUD':
            return {
                ...state,
                ...action.payload,
                _loading: false,
                _cloudReady: true,
                onboardingComplete: action.payload.profile ? true : state.onboardingComplete,
            };
        case 'SET_LOADING':
            return { ...state, _loading: action.payload };

        // Navigation
        case 'SET_PAGE':
            return { ...state, currentPage: action.payload };

        // Profile
        case 'SET_PROFILE':
            return { ...state, profile: action.payload };

        // Onboarding
        case 'COMPLETE_ONBOARDING':
            return { ...state, onboardingComplete: true };

        // Courses
        case 'ADD_COURSE':
            return { ...state, courses: [...state.courses, { ...action.payload, id: action.payload.id || generateId() }] };
        case 'UPDATE_COURSE':
            return { ...state, courses: state.courses.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
        case 'DELETE_COURSE':
            return { ...state, courses: state.courses.filter(c => c.id !== action.payload) };

        // Todos
        case 'ADD_TODO': {
            const newTodo = {
                id: generateId(),
                createdAt: new Date().toISOString(),
                status: 'pending',
                subtodos: [],
                tags: [],
                aiPriorityScore: 0,
                aiPriorityReason: '',
                coinReward: null,
                coinsAwarded: false,
                startedAt: null,
                completedAt: null,
                ...action.payload,
                _isScoring: true,
            };
            return { ...state, todos: [...state.todos, newTodo] };
        }
        case 'UPDATE_TODO':
            return {
                ...state, todos: state.todos.map(t => {
                    if (t.id === action.payload.id) {
                        const updates = action.payload.updates || action.payload;
                        return { ...t, ...updates, id: t.id, _isScoring: true };
                    }
                    return t;
                })
            };
        case 'SCORE_TODO_RESULT':
            return {
                ...state, todos: state.todos.map(t => {
                    if (t.id === action.payload.id) {
                        return { 
                            ...t, 
                            ...action.payload.updates, 
                            _isScoring: false,
                            coinReward: action.payload.updates
                        };
                    }
                    return t;
                })
            };
        case 'DELETE_TODO':
            return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
        case 'TOGGLE_TODO_STATUS': {
            const statusCycle = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
            return {
                ...state, todos: state.todos.map(t => {
                    if (t.id !== action.payload) return t;
                    const newStatus = statusCycle[t.status] || 'pending';
                    const updates = { status: newStatus };
                    if (newStatus === 'in_progress' && !t.startedAt) {
                        updates.startedAt = new Date().toISOString();
                    }
                    if (newStatus === 'completed' && t.status !== 'completed') {
                        if (t.coinsAwarded) {
                            window.dispatchEvent(new CustomEvent('coinAlreadyClaimed', { detail: { taskTitle: t.title } }));
                        } else {
                            updates.completedAt = new Date().toISOString();
                            updates._pendingCoinAward = true;
                        }
                    }
                    return { ...t, ...updates };
                })
            };
        }
        case 'AWARD_COINS': {
            const { taskId } = action.payload;
            return {
                ...state, todos: state.todos.map(t =>
                    t.id === taskId ? { ...t, coinsAwarded: true, _pendingCoinAward: false } : t
                )
            };
        }
        case 'TOGGLE_SUBTODO': {
            const { todoId, subtodoId } = action.payload;
            return {
                ...state, todos: state.todos.map(t => {
                    if (t.id !== todoId) return t;
                    return { ...t, subtodos: t.subtodos.map(s => s.id === subtodoId ? { ...s, done: !s.done } : s) };
                })
            };
        }
        case 'RESCORE_ALL_TODOS':
            return {
                ...state, todos: state.todos.map(t => {
                    const { score, reason } = generatePriorityScore(t, state.todos);
                    return { ...t, aiPriorityScore: score, aiPriorityReason: reason };
                })
            };

        // Schedule
        case 'ADD_SCHEDULE':
            return { ...state, schedule: [...state.schedule, { ...action.payload, id: action.payload.id || generateId() }] };
        case 'UPDATE_SCHEDULE':
            return { ...state, schedule: state.schedule.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
        case 'DELETE_SCHEDULE':
            return { ...state, schedule: state.schedule.filter(s => s.id !== action.payload) };

        // Recurring Tasks
        case 'ADD_RECURRING_TASK':
            return { ...state, recurringTasks: [...state.recurringTasks, { id: generateId(), createdAt: new Date().toISOString(), currentStreak: 0, longestStreak: 0, lastCompletedDate: null, failedDays: 0, consecutiveFailedDays: 0, totalCompletions: 0, isCompletedToday: false, isActive: true, completionLog: [], ...action.payload }] };
        case 'UPDATE_RECURRING_TASK':
            return { ...state, recurringTasks: state.recurringTasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
        case 'DELETE_RECURRING_TASK':
            return { ...state, recurringTasks: state.recurringTasks.filter(t => t.id !== action.payload) };
        case 'COMPLETE_RECURRING_TASK': {
            const todayStr = new Date().toISOString().split('T')[0];
            return {
                ...state, recurringTasks: state.recurringTasks.map(t => {
                    if (t.id !== action.payload) return t;
                    if (t.isCompletedToday) return t;
                    const newStreak = (t.currentStreak || 0) + 1;
                    const newLog = [...(t.completionLog || []), todayStr].slice(-30);
                    return {
                        ...t,
                        isCompletedToday: true,
                        lastCompletedDate: todayStr,
                        currentStreak: newStreak,
                        longestStreak: Math.max(t.longestStreak || 0, newStreak),
                        consecutiveFailedDays: 0,
                        totalCompletions: (t.totalCompletions || 0) + 1,
                        completionLog: newLog,
                    };
                })
            };
        }
        case 'RESET_RECURRING_TASKS_DAILY': {
            const todayStr = new Date().toISOString().split('T')[0];
            return {
                ...state, recurringTasks: state.recurringTasks.map(t => {
                    if (!t.isActive) return t;
                    if (t.lastCompletedDate === todayStr) return t;
                    return { ...t, isCompletedToday: false };
                })
            };
        }

        // Notifications
        case 'ADD_NOTIFICATION':
            return { ...state, notifications: [{ id: generateId(), timestamp: new Date().toISOString(), read: false, ...action.payload }, ...state.notifications] };
        case 'DISMISS_NOTIFICATION':
            return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
        case 'CLEAR_NOTIFICATIONS':
            return { ...state, notifications: [] };

        // Shop Purchases
        case 'ADD_SHOP_PURCHASE':
            return { ...state, shopPurchases: [...state.shopPurchases, { id: generateId(), ...action.payload }] };
        case 'CONSUME_SHOP_ITEM': {
            // Consume the oldest unconsumed item of the given itemId
            let consumed = false;
            return {
                ...state,
                shopPurchases: state.shopPurchases.map(p => {
                    if (!consumed && p.itemId === action.payload && !p.consumed) {
                        consumed = true;
                        return { ...p, consumed: true, consumedAt: new Date().toISOString() };
                    }
                    return p;
                })
            };
        }

        // Chat
        case 'ADD_CHAT_MESSAGE':
            return { ...state, chatHistory: [...state.chatHistory, action.payload] };
        case 'CLEAR_CHAT':
            return { ...state, chatHistory: [] };

        // Data management
        case 'IMPORT_DATA':
            return { ...state, ...action.payload };
        case 'CLEAR_ALL_DATA':
            return { ...initialState, profile: null, onboardingComplete: false, courses: [], todos: [], schedule: [], recurringTasks: [], notifications: [], chatHistory: [], _loading: false, _cloudReady: state._cloudReady };

        default:
            return state;
    }
}

export function AppProvider({ children }) {
    const [state, rawDispatch] = useReducer(appReducer, initialState);
    const userId = getUserId();
    const cloudEnabled = isSupabaseConfigured();

    // ─── Cloud-syncing dispatch wrapper ──────────────────────────
    const dispatch = useCallback((action) => {
        rawDispatch(action);

        // Fire-and-forget sync to Supabase with 3-second retry
        if (cloudEnabled) {
            syncToSupabase(action, userId).catch(err => {
                console.warn('[Supabase] Initial sync failed, retrying in 3s...', err);
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Sync failed — will retry', type: 'warning' } }));
                setTimeout(() => {
                    syncToSupabase(action, userId).catch(retryErr => {
                        console.error('[Supabase] Retry sync failed:', retryErr);
                    });
                }, 3000);
            });
        }
    }, [cloudEnabled, userId]);

    // ─── Load data from Supabase on mount ───────────────────────
    useEffect(() => {
        if (!cloudEnabled) return;

        rawDispatch({ type: 'SET_LOADING', payload: true });

        // Safety timeout — never stay on loading screen more than 8 seconds
        const timeout = setTimeout(() => {
            rawDispatch({ type: 'SET_LOADING', payload: false });
        }, 8000);

        (async () => {
            try {
                const cloudData = await loadAllFromSupabase(userId);
                if (cloudData) {
                    rawDispatch({ type: 'HYDRATE_FROM_CLOUD', payload: cloudData });
                } else {
                    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Connection error — showing cached data', type: 'error' } }));
                    rawDispatch({ type: 'SET_LOADING', payload: false });
                }
            } catch (err) {
                console.error('[Supabase] Load failed, using local data:', err);
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Connection error — showing cached data', type: 'error' } }));
                rawDispatch({ type: 'SET_LOADING', payload: false });
            } finally {
                clearTimeout(timeout);
            }
        })();

        return () => clearTimeout(timeout);
    }, []);

    // ─── Auto-save to localStorage (always — as cache) ──────────
    useEffect(() => {
        storage.set('student_profile', state.profile);
        storage.set('courses', state.courses);
        storage.set('todos', state.todos);
        storage.set('schedule', state.schedule);
        storage.set('recurring_tasks', state.recurringTasks);
        storage.set('shop_purchases', state.shopPurchases);
        storage.set('notifications', state.notifications);
        storage.set('va_chat_history', state.chatHistory);
        storage.set('onboarding_complete', state.onboardingComplete);
    }, [state]);

    // ─── Async coin award processing ────────────────────────────
    useEffect(() => {
        const pending = state.todos.filter(t => t._pendingCoinAward && !t.coinsAwarded);
        pending.forEach(async (task) => {
            try {
                const result = await calculateCompletionCoins(task, state.courses);
                addCoins(result.coins, task.title, result.reasoning);
                window.dispatchEvent(new CustomEvent('coinEarned', { detail: result }));
                fireImmediateNotification('Task Completed! 🎉', `You earned +${result.coins} 🪙 for completing "${task.title}". Keep it up!`);
                dispatch({ type: 'AWARD_COINS', payload: { taskId: task.id, coinResult: result } });
            } catch (err) {
                console.warn('[CoinAward] Error:', err);
                const fallback = task.coinReward?.baseCoins || 25;
                addCoins(fallback, task.title, 'Completed!');
                window.dispatchEvent(new CustomEvent('coinEarned', { detail: { coins: fallback, baseCoins: fallback, earlyBonus: 0, latePenalty: 0, recurringDeduct: 0, streakMultiplier: 1, reasoning: 'Completed!' } }));
                fireImmediateNotification('Task Completed! 🎉', `You earned +${fallback} 🪙 for completing "${task.title}". Keep it up!`);
                dispatch({ type: 'AWARD_COINS', payload: { taskId: task.id } });
            }
        });
    }, [state.todos]);

    // ─── Async AI scoring processing ────────────────────────────
    useEffect(() => {
        const scoringTasks = state.todos.filter(t => t._isScoring);
        scoringTasks.forEach(async (task) => {
            try {
                const coinData = await scoreTaskCoins(task, state.courses, state.todos);
                dispatch({ 
                    type: 'SCORE_TODO_RESULT', 
                    payload: { 
                        id: task.id, 
                        updates: {
                            ...coinData,
                            aiPriorityScore: coinData.aiPriorityScore || 50,
                            aiPriorityReason: coinData.priorityReason || ''
                        } 
                    } 
                });
            } catch (err) {
                console.warn('[AIScoring] Error:', err);
                dispatch({ 
                    type: 'SCORE_TODO_RESULT', 
                    payload: { 
                        id: task.id, 
                        updates: { baseCoins: 25, taskType: 'other', detectedDifficulty: 'medium' } 
                    } 
                });
            }
        });
    }, [state.todos, state.courses]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be within AppProvider');
    return ctx;
}

// ─── Background Supabase sync (fire-and-forget) ─────────────────────
async function syncToSupabase(action, userId) {
    switch (action.type) {
        case 'SET_PROFILE':
            await upsertUserProfile(userId, action.payload);
            break;
        case 'ADD_COURSE':
            await syncCourse('add', { ...action.payload, id: action.payload.id }, userId);
            break;
        case 'UPDATE_COURSE':
            await syncCourse('update', action.payload, userId);
            break;
        case 'DELETE_COURSE':
            await syncCourse('delete', { id: action.payload }, userId);
            break;
        case 'ADD_TODO':
            await syncTask('add', action.payload, userId);
            break;
        case 'UPDATE_TODO':
            await syncTask('update', action.payload, userId);
            break;
        case 'DELETE_TODO':
            await syncTask('delete', { id: action.payload }, userId);
            break;
        case 'TOGGLE_TODO_STATUS':
            // Status updates are handled via UPDATE_TODO or AWARD_COINS
            break;
        case 'ADD_RECURRING_TASK':
            await syncRecurringTask('add', action.payload, userId);
            break;
        case 'UPDATE_RECURRING_TASK':
            await syncRecurringTask('update', action.payload, userId);
            break;
        case 'DELETE_RECURRING_TASK':
            await syncRecurringTask('delete', { id: action.payload }, userId);
            break;
        case 'COMPLETE_RECURRING_TASK':
            // We need the updated task — but we only have the ID. Sync full state later.
            break;
        case 'ADD_SCHEDULE':
            await syncScheduleItem('add', action.payload, userId);
            break;
        case 'UPDATE_SCHEDULE':
            await syncScheduleItem('update', action.payload, userId);
            break;
        case 'DELETE_SCHEDULE':
            await syncScheduleItem('delete', { id: action.payload }, userId);
            break;
        case 'ADD_COUNTDOWN':
            await syncCountdown('add', action.payload, userId);
            break;
        case 'UPDATE_COUNTDOWN':
            await syncCountdown('update', action.payload, userId);
            break;
        case 'DELETE_COUNTDOWN':
            await syncCountdown('delete', { id: action.payload }, userId);
            break;
        case 'ADD_BOOKMARK':
            await syncBookmark('add', action.payload, userId);
            break;
        case 'UPDATE_BOOKMARK':
            await syncBookmark('update', action.payload, userId);
            break;
        case 'DELETE_BOOKMARK':
            await syncBookmark('delete', { id: action.payload }, userId);
            break;
        case 'ADD_SHOP_PURCHASE':
            await syncShopPurchase('add', action.payload, userId);
            break;
        case 'CONSUME_STREAK_FREEZE':
            await syncShopPurchase('delete', { id: action.payload }, userId);
            break;
    }
}
