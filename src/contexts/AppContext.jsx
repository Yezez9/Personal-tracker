import React, { createContext, useContext, useReducer, useEffect } from 'react';
import storage from '../utils/storage';
import { generateId } from '../utils/helpers';
import { generatePriorityScore } from '../utils/aiService';

const AppContext = createContext();

const initialState = {
    profile: storage.get('student_profile') || null,
    courses: storage.get('courses') || [],
    todos: storage.get('todos') || [],
    schedule: storage.get('schedule') || [],
    studySets: storage.get('study_sets') || [],
    bookmarks: storage.get('bookmarks') || [],
    countdowns: storage.get('countdowns') || [],
    notifications: storage.get('notifications') || [],
    chatHistory: storage.get('va_chat_history') || [],
    onboardingComplete: storage.get('onboarding_complete') || false,
    currentPage: 'dashboard',
};

function appReducer(state, action) {
    switch (action.type) {
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
            return { ...state, courses: [...state.courses, { ...action.payload, id: generateId() }] };
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
                ...action.payload,
            };
            const { score, reason } = generatePriorityScore(newTodo, state.todos);
            newTodo.aiPriorityScore = score;
            newTodo.aiPriorityReason = reason;
            return { ...state, todos: [...state.todos, newTodo] };
        }
        case 'UPDATE_TODO':
            return {
                ...state, todos: state.todos.map(t => {
                    if (t.id === action.payload.id) {
                        const updates = action.payload.updates || action.payload;
                        const updated = { ...t, ...updates, id: t.id };
                        const { score, reason } = generatePriorityScore(updated, state.todos);
                        updated.aiPriorityScore = score;
                        updated.aiPriorityReason = reason;
                        return updated;
                    }
                    return t;
                })
            };
        case 'DELETE_TODO':
            return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
        case 'TOGGLE_TODO_STATUS': {
            const statusCycle = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
            return {
                ...state, todos: state.todos.map(t => t.id === action.payload
                    ? { ...t, status: statusCycle[t.status] || 'pending' }
                    : t
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
            return { ...state, schedule: [...state.schedule, { ...action.payload, id: generateId() }] };
        case 'UPDATE_SCHEDULE':
            return { ...state, schedule: state.schedule.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
        case 'DELETE_SCHEDULE':
            return { ...state, schedule: state.schedule.filter(s => s.id !== action.payload) };

        // Study Sets
        case 'ADD_STUDY_SET':
            return { ...state, studySets: [...state.studySets, { id: generateId(), createdAt: new Date().toISOString(), ...action.payload }] };
        case 'UPDATE_STUDY_SET':
            return { ...state, studySets: state.studySets.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
        case 'DELETE_STUDY_SET':
            return { ...state, studySets: state.studySets.filter(s => s.id !== action.payload) };

        // Bookmarks
        case 'ADD_BOOKMARK':
            return { ...state, bookmarks: [...state.bookmarks, { id: generateId(), addedAt: new Date().toISOString(), ...action.payload }] };
        case 'UPDATE_BOOKMARK':
            return { ...state, bookmarks: state.bookmarks.map(b => b.id === action.payload.id ? { ...b, ...action.payload } : b) };
        case 'DELETE_BOOKMARK':
            return { ...state, bookmarks: state.bookmarks.filter(b => b.id !== action.payload) };

        // Countdowns
        case 'ADD_COUNTDOWN':
            return { ...state, countdowns: [...state.countdowns, { id: generateId(), ...action.payload }] };
        case 'DELETE_COUNTDOWN':
            return { ...state, countdowns: state.countdowns.filter(c => c.id !== action.payload) };

        // Notifications
        case 'ADD_NOTIFICATION':
            return { ...state, notifications: [{ id: generateId(), timestamp: new Date().toISOString(), read: false, ...action.payload }, ...state.notifications] };
        case 'DISMISS_NOTIFICATION':
            return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
        case 'CLEAR_NOTIFICATIONS':
            return { ...state, notifications: [] };

        // Chat
        case 'ADD_CHAT_MESSAGE':
            return { ...state, chatHistory: [...state.chatHistory, action.payload] };
        case 'CLEAR_CHAT':
            return { ...state, chatHistory: [] };

        // Data management
        case 'IMPORT_DATA':
            return { ...state, ...action.payload };
        case 'CLEAR_ALL_DATA':
            return { ...initialState, profile: null, onboardingComplete: false, courses: [], todos: [], schedule: [], studySets: [], bookmarks: [], countdowns: [], notifications: [], chatHistory: [] };

        default:
            return state;
    }
}

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Auto-save to localStorage on every state change
    useEffect(() => {
        storage.set('student_profile', state.profile);
        storage.set('courses', state.courses);
        storage.set('todos', state.todos);
        storage.set('schedule', state.schedule);
        storage.set('study_sets', state.studySets);
        storage.set('bookmarks', state.bookmarks);
        storage.set('countdowns', state.countdowns);
        storage.set('notifications', state.notifications);
        storage.set('va_chat_history', state.chatHistory);
        storage.set('onboarding_complete', state.onboardingComplete);
    }, [state]);

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
