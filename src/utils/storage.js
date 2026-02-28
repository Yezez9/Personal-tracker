// Storage abstraction layer over localStorage
const storage = {
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Storage write failed:', e);
        }
    },
    remove(key) {
        localStorage.removeItem(key);
    },
    clear() {
        localStorage.clear();
    },
    exportAll() {
        const keys = [
            'student_profile', 'courses', 'todos', 'schedule',
            'study_sets', 'bookmarks', 'countdowns', 'va_chat_history',
            'app_settings', 'notifications'
        ];
        const data = {};
        keys.forEach(k => { data[k] = storage.get(k); });
        return data;
    },
    importAll(data) {
        Object.entries(data).forEach(([k, v]) => {
            if (v !== null) storage.set(k, v);
        });
    }
};

export default storage;
