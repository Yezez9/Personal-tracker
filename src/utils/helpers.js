export function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hr12 = hr % 12 || 12;
    return `${hr12}:${m} ${ampm}`;
}

export function formatRelativeDate(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = d - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return formatDate(dateStr);
}

export function getDateGroup(dateStr) {
    if (!dateStr) return 'LATER';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'OVERDUE';
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'TOMORROW';
    if (diffDays <= 7) return 'THIS WEEK';
    return 'LATER';
}

export function isToday(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    return now.toDateString() === d.toDateString();
}

export function isSameDay(d1, d2) {
    return new Date(d1).toDateString() === new Date(d2).toDateString();
}

export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

export function getTimeSlots(start = 6, end = 22) {
    const slots = [];
    for (let h = start; h <= end; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return slots;
}

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function searchItems(items, query, fields) {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(item =>
        fields.some(f => {
            const val = item[f];
            return val && String(val).toLowerCase().includes(q);
        })
    );
}

export function getCountdownParts(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, expired: false, totalDays: days };
}

export const PRESET_COLORS = [
    '#6C63FF', '#FF6584', '#43D8A0', '#FF9F43', '#54A0FF',
    '#5F27CD', '#EE5A24', '#009432', '#0652DD', '#FDA7DF',
    '#ED4C67', '#12CBC4', '#A3CB38', '#D980FA', '#FFC312'
];

export const PRESET_EMOJIS = [
    '📚', '📐', '🧪', '💻', '🎨', '📊', '🌍', '🧬', '⚡', '🎵',
    '📝', '🔬', '💡', '🏗️', '🎯', '🧮', '📖', '🎓', '🔧', '🌿'
];

export const TAG_OPTIONS = ['exam', 'assignment', 'reading', 'project', 'lab', 'quiz', 'essay', 'presentation', 'homework', 'review'];
