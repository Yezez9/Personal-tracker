import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { getDaysInMonth, getFirstDayOfMonth, MONTHS, DAYS_SHORT, isSameDay, formatTime } from '../utils/helpers';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView() {
    const { state } = useApp();
    const { todos, schedule, courses } = state;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

    const getTasksForDate = (date) => {
        const ds = date.toISOString().split('T')[0];
        return todos.filter(t => t.dueDate === ds);
    };
    const getScheduleForDay = (dayName) => schedule.filter(s => s.day === dayName);

    const selectedDayName = selectedDate?.toLocaleDateString('en-US', { weekday: 'long' });
    const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];
    const selectedClasses = selectedDayName ? getScheduleForDay(selectedDayName) : [];

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(new Date(year, month, d));

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold dark:text-txt-dark">Calendar</h1>
                <button onClick={goToday} className="btn-ghost text-xs">Today</button>
            </div>

            <div className="flex gap-4 flex-col lg:flex-row">
                <div className="flex-1 bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-border-dark">
                        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><ChevronLeft size={18} className="dark:text-gray-400" /></button>
                        <h3 className="text-sm font-semibold dark:text-txt-dark">{MONTHS[month]} {year}</h3>
                        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><ChevronRight size={18} className="dark:text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-7 border-b border-gray-50 dark:border-border-dark/50">
                        {DAYS_SHORT.map(d => <div key={d} className="p-2 text-center text-[10px] font-semibold text-gray-400">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7">
                        {calendarDays.map((date, i) => {
                            if (!date) return <div key={`e-${i}`} className="p-2 min-h-[80px] border-b border-r border-gray-50 dark:border-border-dark/20" />;
                            const isT = isSameDay(date, today);
                            const isSelected = selectedDate && isSameDay(date, selectedDate);
                            const tasks = getTasksForDate(date);
                            return (
                                <div key={i} onClick={() => setSelectedDate(date)}
                                    className={`p-1.5 min-h-[80px] border-b border-r border-gray-50 dark:border-border-dark/20 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${isSelected ? 'bg-primary-light/5 dark:bg-primary-dark/5' : ''}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${isT ? 'bg-primary-light dark:bg-primary-dark text-white' : 'text-gray-600 dark:text-gray-400'}`}>{date.getDate()}</div>
                                    <div className="space-y-0.5">
                                        {tasks.slice(0, 2).map(t => {
                                            const c = courses.find(c2 => c2.id === t.course);
                                            return <div key={t.id} className="text-[9px] px-1 py-0.5 rounded truncate font-medium" style={{ backgroundColor: `${c?.color || '#6C63FF'}20`, color: c?.color || '#6C63FF' }}>{t.title}</div>;
                                        })}
                                        {tasks.length > 2 && <p className="text-[9px] text-gray-400 pl-1">+{tasks.length - 2}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {selectedDate && (
                    <div className="w-full lg:w-80 bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark p-5 animate-slide-in self-start">
                        <h3 className="text-sm font-semibold dark:text-txt-dark mb-3">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                        {selectedClasses.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-xs font-bold text-gray-400 mb-2">CLASSES</h4>
                                {selectedClasses.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(cls => {
                                    const course = courses.find(c => c.id === cls.courseId);
                                    return <div key={cls.id} className="flex items-center gap-2 py-1.5"><div className="w-1 h-6 rounded-full" style={{ backgroundColor: cls.color || course?.color }} /><div><p className="text-xs font-medium dark:text-gray-300">{course?.name}</p><p className="text-[10px] text-gray-400">{formatTime(cls.startTime)}–{formatTime(cls.endTime)}</p></div></div>;
                                })}
                            </div>
                        )}
                        {selectedTasks.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 mb-2">TASKS</h4>
                                {selectedTasks.map(t => <div key={t.id} className="flex items-center gap-2 py-1"><div className={`w-2 h-2 rounded-full ${t.status === 'completed' ? 'bg-green-500' : t.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} /><span className={`text-xs ${t.status === 'completed' ? 'line-through text-gray-400' : 'dark:text-gray-300'}`}>{t.title}</span></div>)}
                            </div>
                        )}
                        {selectedTasks.length === 0 && selectedClasses.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nothing planned</p>}
                    </div>
                )}
            </div>
            {courses.length > 0 && (
                <div className="flex flex-wrap gap-3">{courses.map(c => <div key={c.id} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} /><span className="text-[10px] text-gray-400">{c.name}</span></div>)}</div>
            )}
        </div>
    );
}
