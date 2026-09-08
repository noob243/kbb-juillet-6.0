import React, { FC, useState } from 'react';
import PageContainer from '../components/PageContainer';
import TaskModal from '../components/modals/TaskModal';
import { CalendarIcon, CheckSquareIcon, FolderIcon, EditIcon, ChartIcon, BellIcon, MapPinIcon } from '../components/Icons';
import { Task, Case, Avocat, Event } from '../types';
import { playAlarmSound, stopAllAlarmSounds } from '../utils/audio';

interface AgendaPageProps {
  tasks: Task[];
  cases: Case[];
  lawyers: string[];
  avocats?: Avocat[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask?: (task: Task) => void;
  events?: Event[];
}

const FRENCH_MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const AgendaPage: FC<AgendaPageProps> = ({ tasks, cases, lawyers, avocats = [], onAddTask, onUpdateTask, events = [] }) => {
    const downloadFile = (file: { name: string, content?: string }) => {
        if (!file.content) return;
        const link = document.createElement('a');
        link.href = file.content;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
    const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [selectedFilterDate, setSelectedFilterDate] = useState<string | null>(null);
    const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
    const [selectedEventForModal, setSelectedEventForModal] = useState<Event | null>(null);
    const [prefilledStartDate, setPrefilledStartDate] = useState<string | null>(null);
    const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);

    const [editReminderEnabled, setEditReminderEnabled] = useState(false);
    const [editReminderDate, setEditReminderDate] = useState('');
    const [editReminderTime, setEditReminderTime] = useState('09:00');
    const [editReminderSound, setEditReminderSound] = useState<'digital' | 'bell' | 'marimba' | 'classic'>('digital');
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const stopPreviewRef = React.useRef<(() => void) | null>(null);

    const handleOpenTaskDetails = (task: Task) => {
        setSelectedTaskForModal(task);
        setEditReminderEnabled(!!task.reminderEnabled);
        setEditReminderDate(task.reminderDate || task.dueDate || today);
        setEditReminderTime(task.reminderTime || '09:00');
        setEditReminderSound(task.reminderSound || 'digital');
        setIsPlayingPreview(false);
    };

    const handleCloseTaskModal = () => {
        setSelectedTaskForModal(null);
        stopAllAlarmSounds();
        setIsPlayingPreview(false);
    };

    const handleSoundPreview = () => {
        if (isPlayingPreview) {
            if (stopPreviewRef.current) stopPreviewRef.current();
            stopAllAlarmSounds();
            setIsPlayingPreview(false);
        } else {
            setIsPlayingPreview(true);
            const stop = playAlarmSound(editReminderSound);
            stopPreviewRef.current = stop;
            setTimeout(() => {
                if (stopPreviewRef.current === stop) {
                    stop();
                    setIsPlayingPreview(false);
                }
            }, 4000);
        }
    };

    const handleSaveReminderFromModal = () => {
        if (!selectedTaskForModal || !onUpdateTask) return;
        
        const updatedTask: Task = {
            ...selectedTaskForModal,
            reminderEnabled: editReminderEnabled,
            reminderDate: editReminderEnabled ? editReminderDate : undefined,
            reminderTime: editReminderEnabled ? editReminderTime : undefined,
            reminderSound: editReminderEnabled ? editReminderSound : undefined,
            reminderTriggered: false,
        };
        
        onUpdateTask(updatedTask);
        setSelectedTaskForModal(updatedTask);
    };

    const toggleRow = (taskId: string) => {
        setExpandedTaskIds(prev => 
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const today = new Date().toISOString().split('T')[0];

    const isOverdue = (task: Task) => {
        return task.status !== 'Effectué' && task.dueDate < today;
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Effectué': return 'bg-green-100 text-green-800';
            case 'Non effectué': return 'bg-red-100 text-red-800';
            case 'Effectué à moitié': return 'bg-yellow-101 text-yellow-801';
            default: return 'bg-gray-101 text-gray-801';
        }
    };

    // Calendar indicators and navigation logic
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => {
        const day = new Date(y, m, 1).getDay();
        return day === 0 ? 6 : day - 1; // Monday to Sunday French index conversion
    };

    const daysInCurrMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const cells: { dateStr: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Prior month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        const m = month === 0 ? 11 : month - 1;
        const y = month === 0 ? year - 1 : year;
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({
            dateStr,
            day: d,
            isCurrentMonth: false,
            isToday: dateStr === today
        });
    }

    // This month days
    for (let d = 1; d <= daysInCurrMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({
            dateStr,
            day: d,
            isCurrentMonth: true,
            isToday: dateStr === today
        });
    }

    // Post month days
    const totalCells = 42;
    const remaining = totalCells - cells.length;
    for (let n = 1; n <= remaining; n++) {
        const m = month === 11 ? 0 : month + 1;
        const y = month === 11 ? year + 1 : year;
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
        cells.push({
            dateStr,
            day: n,
            isCurrentMonth: false,
            isToday: dateStr === today
        });
    }

    const getTasksForDate = (dateStr: string) => {
        return tasks.filter(task => {
            const start = task.startDate || task.dueDate;
            const end = task.endDate || task.dueDate;
            return dateStr >= start && dateStr <= end;
        });
    };

    const getEventsForDate = (dateStr: string) => {
        return events.filter(event => event.date === dateStr);
    };

    const isTaskActiveOnDate = (task: Task, dateStr: string) => {
        const start = task.startDate || task.dueDate;
        const end = task.endDate || task.dueDate;
        return dateStr >= start && dateStr <= end;
    };

    const baseTasks = showOnlyOverdue 
        ? tasks.filter(task => isOverdue(task))
        : tasks;

    const finalTasks = selectedFilterDate
        ? baseTasks.filter(task => isTaskActiveOnDate(task, selectedFilterDate))
        : baseTasks;

    const finalEvents = selectedFilterDate
        ? events.filter(event => event.date === selectedFilterDate)
        : events;

    const handlePrevMonth = () => {
        setCalendarDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCalendarDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCalendarDate(new Date());
    };

    const handleOpenWithPrefilled = (dateStr: string) => {
        setPrefilledStartDate(dateStr);
        setIsModalOpen(true);
    };

    const completedTasksCount = tasks.filter(t => t.status === 'Effectué').length;
    const overdueTasksCount = tasks.filter(t => isOverdue(t)).length;
    const upcomingTasksCount = tasks.filter(t => t.status !== 'Effectué' && !isOverdue(t)).length;

    return (
        <>
            <PageContainer 
                title="Agenda & Calendrier" 
                buttonLabel="Ajouter une Tâche" 
                onButtonClick={() => {
                    setPrefilledStartDate(null);
                    setIsModalOpen(true);
                }}
            >
                {/* Cartes récapitulatives de volume de travail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Tâches terminées */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Tâches Terminées</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-extrabold text-slate-800">{completedTasksCount}</span>
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                    {tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0}% du total
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl border border-green-100/50">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Tâches en retard */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Tâches en Retard</span>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-extrabold ${overdueTasksCount > 0 ? 'text-red-650' : 'text-slate-800'}`}>{overdueTasksCount}</span>
                                {overdueTasksCount > 0 && (
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 animate-pulse">
                                        À traiter
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={`p-3 rounded-xl border ${overdueTasksCount > 0 ? 'bg-red-50 text-red-600 border-red-100/50' : 'bg-slate-50 text-slate-400 border-gray-200/50'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Tâches à venir */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Tâches à Venir</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-extrabold text-slate-800">{upcomingTasksCount}</span>
                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                    En attente
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>

                    {/* Événements */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Événements Cabinet</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-extrabold text-slate-800">{events.length}</span>
                                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                    Enregistrés
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-605 rounded-xl border border-purple-100/50">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.243.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.18 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.773-.567-.374-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* View switcher and metadata */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
                        <button 
                            type="button"
                            onClick={() => setActiveView('calendar')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${activeView === 'calendar' ? 'bg-white shadow-sm text-indigo-750' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Vue Calendrier
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveView('list')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${activeView === 'list' ? 'bg-white shadow-sm text-indigo-750' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            Vue Liste (Tâches: {tasks.length} | Événements: {events.length})
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-xl border border-gray-200 w-fit text-xs">
                            <button 
                                type="button"
                                onClick={() => setShowOnlyOverdue(false)}
                                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${!showOnlyOverdue ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-gray-500'}`}
                            >
                                Toutes
                            </button>
                            <button 
                                type="button"
                                onClick={() => setShowOnlyOverdue(true)}
                                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${showOnlyOverdue ? 'bg-red-50 shadow-sm text-red-600 border border-red-100 font-bold' : 'text-gray-500'}`}
                            >
                                Retards ({tasks.filter(t => isOverdue(t)).length})
                            </button>
                        </div>
                        
                        <div className="text-xs text-gray-500 font-medium">
                            Aujourd'hui : <span className="font-bold text-gray-700">{new Date().toLocaleDateString('fr-FR')}</span>
                        </div>
                    </div>
                </div>

                {/* Selected Date Notification banner */}
                {selectedFilterDate && (
                    <div className="mb-4 bg-indigo-50 border border-indigo-150 rounded-xl p-3 flex justify-between items-center text-sm text-indigo-900">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 8.293A1 1 0 013 7.586V4z" />
                            </svg>
                            <span>
                                Filtre appliqué : Tâches planifiées le <strong>{new Date(selectedFilterDate).toLocaleDateString('fr-FR')}</strong>
                            </span>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setSelectedFilterDate(null)}
                            className="text-xs font-bold text-indigo-650 bg-white hover:bg-slate-50 border border-indigo-200 rounded-lg px-2.5 py-1 transition shadow-2xs"
                        >
                            Désactiver le filtre
                        </button>
                    </div>
                )}

                {/* Conditional Switch render */}
                {activeView === 'calendar' ? (
                    <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
                        {/* Month bar */}
                        <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border-b border-gray-150">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-650" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {FRENCH_MONTHS[month]} {year}
                            </h3>
                            <div className="flex items-center space-x-2">
                                <button 
                                    type="button"
                                    onClick={handleToday}
                                    className="bg-white hover:bg-gray-100 text-gray-800 font-bold px-3 py-1.5 rounded-lg border border-gray-250 text-xs transition duration-200"
                                >
                                    Aujourd'hui
                                </button>
                                <div className="inline-flex rounded-lg border border-gray-255 bg-white shadow-2xs">
                                    <button 
                                        type="button"
                                        onClick={handlePrevMonth}
                                        className="p-1.5 hover:bg-gray-50 border-r border-gray-255 rounded-l-lg text-gray-600 hover:text-gray-900 transition"
                                        title="Mois précédent"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleNextMonth}
                                        className="p-1.5 hover:bg-gray-50 rounded-r-lg text-gray-600 hover:text-gray-900 transition"
                                        title="Mois suivant"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Weekday indicator labels */}
                        <div className="grid grid-cols-7 bg-slate-100 text-center border-b border-gray-150">
                            {WEEKDAYS.map(day => (
                                <div key={day} className="py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* 42 grid blocks */}
                        <div className="grid grid-cols-7 bg-gray-200 gap-px">
                            {cells.map(cell => {
                                const dayTasks = getTasksForDate(cell.dateStr);
                                const dayEvents = getEventsForDate(cell.dateStr);
                                const cellItems = [
                                    ...dayEvents.map(e => ({ id: `event-${e.id}`, name: e.name, type: 'event', item: e })),
                                    ...dayTasks.map(t => ({ id: `task-${t.id}`, name: t.name, type: 'task', item: t }))
                                ];
                                const isFocused = selectedFilterDate === cell.dateStr;

                                return (
                                    <div 
                                        key={cell.dateStr}
                                        onClick={() => {
                                            setSelectedFilterDate(cell.dateStr);
                                            setActiveView('list');
                                        }}
                                        className={`min-h-[105px] md:min-h-[125px] p-2 bg-white flex flex-col justify-between hover:bg-indigo-50/20 cursor-pointer transition group relative ${
                                            !cell.isCurrentMonth ? 'bg-slate-50/50 text-gray-300' : 'text-gray-800'
                                        } ${cell.isToday ? 'bg-indigo-50/30' : ''} ${isFocused ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/25' : ''}`}
                                    >
                                        {/* Day number metadata */}
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[11px] font-bold w-5.5 h-5.5 flex items-center justify-center rounded-full ${
                                                cell.isToday 
                                                    ? 'bg-[#15447c] text-white font-extrabold shadow-sm' 
                                                    : !cell.isCurrentMonth ? 'text-gray-400 font-medium' : 'text-gray-700'
                                            }`}>
                                                {cell.day}
                                            </span>
                                            
                                            <div className="flex gap-1 font-mono">
                                                {dayTasks.length > 0 && (
                                                    <span className="text-[8px] font-black bg-indigo-50 text-indigo-605 px-1 py-0.2 rounded border border-indigo-100" title={`${dayTasks.length} Tâche(s)`}>
                                                        T: {dayTasks.length}
                                                    </span>
                                                )}
                                                {dayEvents.length > 0 && (
                                                    <span className="text-[8px] font-black bg-purple-50 text-purple-650 px-1 py-0.2 rounded border border-purple-100" title={`${dayEvents.length} Événement(s)`}>
                                                        E: {dayEvents.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Items List for the cell */}
                                        <div className="flex-1 mt-2 space-y-1.5 overflow-hidden">
                                            {cellItems.slice(0, 3).map(item => {
                                                if (item.type === 'event') {
                                                    const ev = item.item as Event;
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEventForModal(ev);
                                                            }}
                                                            className="text-[9.5px] font-bold leading-tight px-1.5 py-0.6 rounded-md border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 truncate transition-all shadow-3xs hover:scale-[1.02] flex items-center"
                                                            title={`[Événement] ${ev.name} - ${ev.lieu}`}
                                                        >
                                                            <CalendarIcon className="w-2.5 h-2.5 mr-0.5 text-purple-650 shrink-0" />
                                                            <span className="truncate">{ev.name}</span>
                                                        </div>
                                                    );
                                                } else {
                                                    const task = item.item as Task;
                                                    let badgeColor = 'bg-red-50 text-red-700 border-red-150 hover:bg-red-100';
                                                    if (task.status === 'Effectué') {
                                                        badgeColor = 'bg-green-50 text-green-700 border-green-150 hover:bg-green-100';
                                                    } else if (task.status === 'Effectué à moitié') {
                                                        badgeColor = 'bg-yellow-50 text-yellow-750 border-yellow-150 hover:bg-yellow-101';
                                                    }
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenTaskDetails(task);
                                                            }}
                                                            className={`text-[9.5px] font-bold leading-tight px-1.5 py-0.6 rounded-md border truncate transition-all shadow-3xs hover:scale-[1.02] flex items-center ${badgeColor}`}
                                                            title={`[Tâche] ${task.name}`}
                                                        >
                                                            <CheckSquareIcon className="w-2.5 h-2.5 mr-0.5 text-indigo-650 shrink-0" />
                                                            <span className="truncate">{task.name}</span>
                                                        </div>
                                                    );
                                                }
                                            })}
                                            {cellItems.length > 3 && (
                                                <div className="text-[8.5px] font-black text-indigo-650 text-center uppercase tracking-wide pt-0.5">
                                                    + {cellItems.length - 3} de plus
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-305">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="p-4 w-12 text-center"></th>
                                    <th className="p-4 font-bold">Tâche</th>
                                    <th className="p-4 font-bold">Dossier</th>
                                    <th className="p-4 font-bold">Échéance</th>
                                    <th className="p-4 font-bold">Responsable</th>
                                    <th className="p-4 font-bold">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {finalTasks.length > 0 ? (
                                    finalTasks.map(task => {
                                        const relatedCase = cases.find(c => c.id === task.caseId);
                                        const late = isOverdue(task);
                                        const isHighlighted = selectedFilterDate && isTaskActiveOnDate(task, selectedFilterDate);
                                        const isExpanded = expandedTaskIds.includes(task.id);

                                        return (
                                            <React.Fragment key={task.id}>
                                                <tr className={`transition-colors border-b border-gray-100 ${
                                                    isHighlighted 
                                                        ? 'bg-indigo-50/50 hover:bg-indigo-50' 
                                                        : late 
                                                            ? 'bg-red-50/40 hover:bg-red-50' 
                                                            : 'hover:bg-gray-50'
                                                } ${isExpanded ? 'bg-indigo-50/10' : ''}`}>
                                                    <td className="p-4 align-middle text-center w-12">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleRow(task.id);
                                                            }}
                                                            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-gray-600 hover:text-indigo-650 transition flex items-center justify-center mx-auto"
                                                            title={isExpanded ? "Masquer les détails" : "Afficher les détails"}
                                                        >
                                                            <svg 
                                                                className={`w-4.5 h-4.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-650' : 'text-gray-400'}`} 
                                                                fill="none" 
                                                                viewBox="0 0 24 24" 
                                                                stroke="currentColor"
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-850 flex items-center">
                                                                {task.name}
                                                                {late && (
                                                                    <span className="ml-2 px-1.5 py-0.5 bg-red-650 text-[10px] text-white rounded-md font-extrabold uppercase tracking-tighter shadow-3xs">
                                                                        Retard
                                                                    </span>
                                                                )}
                                                                {isHighlighted && (
                                                                    <span className="ml-2 px-1.5 py-0.5 bg-indigo-600 text-[10px] text-white rounded-md font-extrabold uppercase tracking-tighter shadow-3xs">
                                                                        Filtré
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-400 font-medium">
                                                                {task.procedureLinked && (
                                                                    <span className="flex items-center gap-1" title={`Procédure : ${task.procedureLinked}`}>
                                                                        <FolderIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                        <span>Procédure : <strong className="text-gray-650 font-semibold">{task.procedureLinked}</strong></span>
                                                                    </span>
                                                                )}
                                                                {task.notes && (
                                                                    <span className="flex items-center gap-1 text-slate-500" title="Contient des notes">
                                                                        <EditIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                        <span>Notes</span>
                                                                    </span>
                                                                )}
                                                                {task.rapport && (
                                                                    <span className="flex items-center gap-1 text-indigo-550" title="Contient un rapport">
                                                                        <ChartIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                                        <span>Rapport</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 align-middle">
                                                        {relatedCase ? (
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-gray-800">{relatedCase.name}</span>
                                                                <span className="text-xs text-gray-400 font-medium">{relatedCase.client}</span>
                                                            </div>
                                                        ) : 'Aucun dossier'}
                                                    </td>
                                                    <td className="p-4 text-sm align-middle">
                                                        <div className="flex flex-col text-xs space-y-0.5">
                                                            {task.startDate && (
                                                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                                                    du {new Date(task.startDate).toLocaleDateString('fr-FR')}
                                                                </span>
                                                            )}
                                                            <span className={`font-semibold text-sm ${late ? 'text-red-600 font-bold' : 'text-gray-750'}`}>
                                                                au {new Date(task.endDate || task.dueDate).toLocaleDateString('fr-FR')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-650 align-middle">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-800">{task.lawyer || 'S/A'}</span>
                                                            {task.associatedLawyers && task.associatedLawyers.length > 0 && (
                                                                <span className="text-[10px] text-indigo-600 font-bold">
                                                                    +{task.associatedLawyers.length} collaborateur{task.associatedLawyers.length > 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusClass(task.status)}`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr key={`${task.id}-expanded`} className="bg-slate-50/60 shadow-inner">
                                                        <td colSpan={6} className="p-0 border-b border-gray-150">
                                                            <div className="p-5 bg-slate-50 border-l-4 border-indigo-600 flex flex-col gap-5 text-gray-800">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                    {/* Section 1: Informations Générales */}
                                                                    <div className="space-y-3">
                                                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block border-b border-gray-200 pb-1">
                                                                            Informations Générales
                                                                        </span>
                                                                        <div className="space-y-2 text-xs">
                                                                            <div className="flex justify-between items-center py-0.5">
                                                                                <span className="text-gray-500 font-medium">Tâche :</span>
                                                                                <span className="font-bold text-gray-805">{task.name}</span>
                                                                            </div>
                                                                            {task.procedureLinked && (
                                                                                <div className="flex justify-between items-start py-0.5">
                                                                                    <span className="text-gray-500 font-medium shrink-0">Procédure :</span>
                                                                                    <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-right max-w-[200px] truncate">
                                                                                        {task.procedureLinked}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex justify-between items-center py-0.5">
                                                                                <span className="text-gray-500 font-medium">Statut de la tâche :</span>
                                                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusClass(task.status)}`}>
                                                                                    {task.status}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center py-1 mt-2 border-t border-gray-150 pt-2">
                                                                                <div className="flex flex-col text-left">
                                                                                    <span className="text-[10px] text-gray-500 font-medium">Alerte Rappel :</span>
                                                                                    <span className="text-2xs font-extrabold text-gray-800 flex items-center gap-1 mt-0.5">
                                                                                        {task.reminderEnabled ? (
                                                                                            <span className="text-indigo-700 flex items-center gap-1"><BellIcon className="w-3.5 h-3.5 text-indigo-700 shrink-0" /> Actif ({task.reminderDate ? new Date(task.reminderDate).toLocaleDateString('fr-FR') : ''} à {task.reminderTime})</span>
                                                                                        ) : (
                                                                                            <span className="text-gray-400 flex items-center gap-1"><BellIcon className="w-3.5 h-3.5 text-gray-300 shrink-0" /> Désactivé</span>
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                                <button 
                                                                                    onClick={() => handleOpenTaskDetails(task)}
                                                                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-200 transition active:scale-95 cursor-pointer"
                                                                                >
                                                                                    Régler / Tester
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Section 2: Planification & Dates */}
                                                                    <div className="space-y-3">
                                                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block border-b border-gray-200 pb-1">
                                                                            Dates & Échéances
                                                                        </span>
                                                                        <div className="space-y-2 text-xs">
                                                                            <div className="flex justify-between items-center py-0.5">
                                                                                <span className="text-gray-500 font-medium">Début programmé :</span>
                                                                                <span className="font-semibold text-gray-800">
                                                                                    {task.startDate ? new Date(task.startDate).toLocaleDateString('fr-FR') : 'Non défini'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center py-0.5">
                                                                                <span className="text-gray-500 font-medium">Échéance finale :</span>
                                                                                <span className={`font-bold ${late ? 'text-red-600' : 'text-gray-800'}`}>
                                                                                    {new Date(task.endDate || task.dueDate).toLocaleDateString('fr-FR')}
                                                                                </span>
                                                                            </div>
                                                                            {late && (
                                                                                <div className="flex justify-between items-center py-0.5">
                                                                                    <span className="text-gray-500 font-medium">Alerte :</span>
                                                                                    <span className="text-[10px] font-extrabold text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-105">
                                                                                        En retard
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Section 3: Responsables & Collaborateurs */}
                                                                    <div className="space-y-3">
                                                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block border-b border-gray-200 pb-1">
                                                                            Responsabilités
                                                                        </span>
                                                                        <div className="space-y-2 text-xs">
                                                                            <div className="flex justify-between items-center py-0.5">
                                                                                <span className="text-gray-500 font-medium">Responsable principal :</span>
                                                                                <span className="font-bold text-gray-800">{task.lawyer || 'S/A'}</span>
                                                                            </div>
                                                                            {task.associatedLawyers && task.associatedLawyers.length > 0 && (
                                                                                <div>
                                                                                    <span className="text-gray-500 font-medium block mb-1">Collaborateurs associés :</span>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {task.associatedLawyers.map(lawyer => (
                                                                                            <span key={lawyer} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-705 border border-indigo-150 font-bold rounded-lg text-[10px]">
                                                                                                {lawyer}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Row 2: Notes, Rapports et Pièces Jointes */}
                                                                {(task.notes || task.rapport || (task.attachments && task.attachments.length > 0)) && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border-t border-gray-150 pt-4">
                                                                        {task.notes && (
                                                                            <div className="space-y-1.5">
                                                                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                                                                    Notes & Remarques
                                                                                </span>
                                                                                <div className="p-3 bg-white border border-gray-150 rounded-xl text-xs text-gray-700 font-medium italic leading-relaxed">
                                                                                    {task.notes}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {task.rapport && (
                                                                            <div className="space-y-1.5">
                                                                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                                                                    Rapport / Compte-rendu
                                                                                </span>
                                                                                <div className="p-3 bg-white border border-gray-150 rounded-xl text-xs text-gray-800 leading-relaxed font-normal whitespace-pre-line bg-indigo-50/10">
                                                                                    {task.rapport}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {task.attachments && task.attachments.length > 0 && (
                                                                            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                                                                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                                                                    Pièces jointes ({task.attachments.length})
                                                                                </span>
                                                                                <div className="flex flex-wrap gap-1.5 p-3 bg-white border border-gray-150 rounded-xl">
                                                                                    {task.attachments.map((file, idx) => (
                                                                                        <button 
                                                                                            key={idx}
                                                                                            onClick={() => downloadFile(file)}
                                                                                            className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-905 border border-slate-200 text-[11px] font-bold px-2 py-1 rounded-lg transition"
                                                                                        >
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                                            <span className="max-w-[120px] truncate" title={file.name}>{file.name}</span>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="bg-gray-50 p-4 rounded-full">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-305" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-400 font-medium">
                                                    {selectedFilterDate 
                                                        ? "Aucune tâche programmée pour ce jour spécifique." 
                                                        : showOnlyOverdue 
                                                            ? "Félicitations ! Aucune tâche n'est en retard." 
                                                            : "Aucune tâche enregistrée."
                                                    }
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Section 2: Liste des Événements */}
                    <div className="mt-8 bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
                        <div className="p-4 bg-purple-50/50 border-b border-gray-150 flex items-center justify-between">
                            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.243.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.18 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.773-.567-.374-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </span>
                                Événements du Cabinet ({finalEvents.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-205">
                                    <tr className="text-xs text-gray-500 uppercase tracking-wider">
                                        <th className="p-4 font-bold">Événement</th>
                                        <th className="p-4 font-bold">Type</th>
                                        <th className="p-4 font-bold">Date</th>
                                        <th className="p-4 font-bold">Lieu</th>
                                        <th className="p-4 font-bold">Détails & Participants</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {finalEvents.length > 0 ? (
                                        finalEvents.map(ev => (
                                            <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 align-middle">
                                                    <span className="font-bold text-gray-850 hover:text-purple-700 cursor-pointer block" onClick={() => setSelectedEventForModal(ev)}>
                                                        {ev.name}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-lg border border-purple-100 uppercase font-mono">
                                                        {ev.type}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle text-xs text-gray-750 font-semibold">
                                                    {new Date(ev.date).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="p-4 align-middle text-xs text-slate-600">
                                                    {ev.lieu || 'Non spécifié'}
                                                </td>
                                                <td className="p-4 align-middle text-xs text-gray-500">
                                                    {ev.membresKBB && (
                                                        <div className="text-[11px]">
                                                            <span className="font-semibold text-gray-700">Membres :</span> {ev.membresKBB}
                                                        </div>
                                                    )}
                                                    {ev.publicCible && (
                                                        <div className="text-[11px] mt-0.5">
                                                            <span className="font-semibold text-gray-700">Public :</span> {ev.publicCible}
                                                        </div>
                                                    )}
                                                    {!ev.membresKBB && !ev.publicCible && (
                                                        <span className="italic text-gray-400">Aucun détail supplémentaire</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <div className="bg-purple-50 p-4 rounded-full">
                                                        <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-gray-400 font-medium text-xs">
                                                        {selectedFilterDate 
                                                            ? "Aucun événement planifié pour cette journée." 
                                                            : "Aucun événement enregistré."
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    </div>
                )}
            </PageContainer>

            {/* Creation Modal */}
            <TaskModal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setPrefilledStartDate(null);
                }} 
                onSave={onAddTask} 
                cases={cases} 
                lawyers={lawyers} 
                avocats={avocats} 
            />

            {/* Task Detail overlay modal for direct interactive calendars click */}
            {selectedTaskForModal && (() => {
                const relatedCase = cases.find(c => c.id === selectedTaskForModal.caseId);
                return (
                    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-3xs">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100 animate-scaleIn">
                            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </span>
                                    Détails de la Tâche
                                </h3>
                                <button 
                                    onClick={handleCloseTaskModal} 
                                    className="text-gray-400 hover:text-gray-650 font-bold text-xl transition"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div>
                                    <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Nom de la Tâche :</span>
                                    <p className="font-bold text-gray-900 text-base leading-tight">{selectedTaskForModal.name}</p>
                                </div>

                                {relatedCase && (
                                    <div>
                                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Dossier lié :</span>
                                        <div className="p-2.5 bg-slate-50 border border-gray-150 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                            <span className="font-semibold text-gray-800 text-xs">{relatedCase.name}</span>
                                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100">
                                                Client: {relatedCase.client}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-gray-150 p-3 rounded-xl">
                                    <div>
                                        <span className="text-3xs font-black text-slate-400 uppercase tracking-wider block mb-0.5">Début :</span>
                                        <p className="font-bold text-gray-800 text-xs">{selectedTaskForModal.startDate ? new Date(selectedTaskForModal.startDate).toLocaleDateString('fr-FR') : 'Non configuré'}</p>
                                    </div>
                                    <div>
                                        <span className="text-3xs font-black text-slate-400 uppercase tracking-wider block mb-0.5">Date fin (Échéance) :</span>
                                        <p className={`font-bold text-xs ${isOverdue(selectedTaskForModal) ? 'text-red-750' : 'text-gray-800'}`}>{new Date(selectedTaskForModal.endDate || selectedTaskForModal.dueDate).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Responsable principal :</span>
                                        <p className="font-bold text-gray-800">{selectedTaskForModal.lawyer || 'S/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Statut :</span>
                                        <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusClass(selectedTaskForModal.status)}`}>
                                            {selectedTaskForModal.status}
                                        </span>
                                    </div>
                                </div>

                                {selectedTaskForModal.associatedLawyers && selectedTaskForModal.associatedLawyers.length > 0 && (
                                    <div>
                                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Collaborateurs associés :</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedTaskForModal.associatedLawyers.map(l => (
                                                <span key={l} className="px-2 py-0.5 bg-indigo-50 text-indigo-755 text-xs font-bold rounded-lg border border-indigo-100">
                                                    {l}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedTaskForModal.procedureLinked && (
                                    <div>
                                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Procédure rattachée :</span>
                                        <span className="inline-block px-2.5 py-0.5 bg-[#15447c]/5 text-[#15447c] font-bold text-xs rounded-lg border border-[#15447c]/15">
                                            {selectedTaskForModal.procedureLinked}
                                        </span>
                                    </div>
                                )}

                                {selectedTaskForModal.notes && (
                                    <div>
                                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Notes :</span>
                                        <p className="text-gray-600 bg-slate-50 p-2.5 rounded border border-gray-100 italic text-xs leading-relaxed">{selectedTaskForModal.notes}</p>
                                    </div>
                                )}

                                {selectedTaskForModal.rapport && (
                                    <div>
                                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Rapport d'audience / Compte-rendu :</span>
                                        <div className="text-gray-800 bg-indigo-50/20 border border-indigo-150 p-3 rounded-xl font-medium whitespace-pre-wrap text-xs max-h-40 overflow-y-auto leading-relaxed">
                                            {selectedTaskForModal.rapport}
                                        </div>
                                    </div>
                                )}

                                {selectedTaskForModal.attachments && selectedTaskForModal.attachments.length > 0 && (
                                    <div>
                                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Pièces jointes ({selectedTaskForModal.attachments.length}) :</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedTaskForModal.attachments.map((file, idx) => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => downloadFile(file)}
                                                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-indigo-900 border border-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-2xs transition"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    <span className="max-w-[150px] truncate">{file.name}</span>
                                                    {file.size && <span className="text-[10px] text-gray-400 font-bold">({file.size})</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Gestion de l'alarme / rappel section */}
                                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 space-y-3 mt-4 text-left">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-2xs font-black uppercase text-slate-500 tracking-wide flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Rappel de cette Tâche
                                        </h4>
                                        <button 
                                            type="button"
                                            onClick={handleSaveReminderFromModal}
                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-3xs font-black uppercase tracking-wider transition shadow-2xs"
                                        >
                                            Enregistrer le rappel
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-white text-gray-850 p-2.5 rounded-xl border border-gray-150">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input 
                                                type="checkbox"
                                                checked={editReminderEnabled}
                                                onChange={(e) => setEditReminderEnabled(e.target.checked)}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <div>
                                                <span className="block text-xs font-bold text-gray-800">Activer le rappel</span>
                                                <span className="block text-[10px] text-slate-500 font-medium">Déclencher une alarme sonore</span>
                                            </div>
                                        </label>
                                        <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full font-black ${editReminderEnabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400'}`}>
                                            {editReminderEnabled ? 'Activé' : 'Désactivé'}
                                        </span>
                                    </div>

                                    {editReminderEnabled && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                            <div>
                                                <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1">Date</label>
                                                <input 
                                                    type="date" 
                                                    value={editReminderDate} 
                                                    onChange={(e) => setEditReminderDate(e.target.value)} 
                                                    className="w-full p-2 bg-white border border-gray-350 rounded-lg text-2xs font-bold" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1">Heure</label>
                                                <input 
                                                    type="time" 
                                                    value={editReminderTime} 
                                                    onChange={(e) => setEditReminderTime(e.target.value)} 
                                                    className="w-full p-2 bg-white border border-gray-350 rounded-lg text-2xs font-bold" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1">Sonnerie</label>
                                                <div className="flex gap-1">
                                                    <select 
                                                        value={editReminderSound} 
                                                        onChange={(e: any) => setEditReminderSound(e.target.value)} 
                                                        className="flex-1 p-2 bg-white border border-gray-350 rounded-lg text-3xs font-black"
                                                    >
                                                        <option value="digital">📟 Bip-bip</option>
                                                        <option value="bell">🔔 Cloche</option>
                                                        <option value="marimba">🎼 Marimba</option>
                                                        <option value="classic">☎️ Téléphone</option>
                                                    </select>
                                                    <button 
                                                        type="button"
                                                        onClick={handleSoundPreview}
                                                        className={`p-2 rounded-lg text-xs transition flex justify-center items-center ${isPlayingPreview ? 'bg-red-50 text-red-650 hover:bg-red-100 border border-red-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}
                                                        title={isPlayingPreview ? "Arrêter" : "Tester"}
                                                    >
                                                        {isPlayingPreview ? (
                                                            <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                                                        ) : (
                                                            <svg className="w-3.5 h-3.5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between gap-4">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setSelectedFilterDate(selectedTaskForModal.startDate || selectedTaskForModal.dueDate);
                                        setActiveView('list');
                                        handleCloseTaskModal();
                                    }}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition shadow-2xs"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Voir dans la liste détaillée
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleCloseTaskModal} 
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg text-xs transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Event Detail overlay modal */}
            {selectedEventForModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-3xs">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100 animate-scaleIn">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                            <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                                <span className="p-1.5 bg-purple-50 text-purple-650 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                Détails de l'Événement
                            </h3>
                            <button 
                                onClick={() => setSelectedEventForModal(null)} 
                                className="text-gray-400 hover:text-gray-650 font-bold text-xl transition"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Nom de l'Événement :</span>
                                <p className="font-bold text-gray-900 text-base leading-tight">{selectedEventForModal.name}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Type d'événement :</span>
                                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-purple-50 text-purple-700 border border-purple-100 font-mono">
                                        {selectedEventForModal.type}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Date de l'événement :</span>
                                    <p className="font-bold text-gray-800 mt-1">{new Date(selectedEventForModal.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                            </div>

                            {selectedEventForModal.lieu && (
                                <div>
                                    <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Lieu :</span>
                                    <p className="font-semibold text-gray-800 bg-gray-50 p-2.5 border border-gray-150 rounded-xl flex items-center gap-1.5">
                                        <MapPinIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0 inline-block -mt-0.5 mr-1" /> {selectedEventForModal.lieu}
                                    </p>
                                </div>
                            )}

                            {selectedEventForModal.membresKBB && (
                                <div>
                                    <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Membres du cabinet impliqués :</span>
                                    <p className="text-gray-800 bg-slate-50 p-2.5 rounded border border-gray-100 text-xs font-semibold">{selectedEventForModal.membresKBB}</p>
                                </div>
                            )}

                            {selectedEventForModal.publicCible && (
                                <div>
                                    <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Public cible / Client :</span>
                                    <p className="text-gray-750 bg-purple-50/20 p-2.5 rounded border border-purple-100/50 text-xs italic leading-relaxed">{selectedEventForModal.publicCible}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => {
                                    setSelectedFilterDate(selectedEventForModal.date);
                                    setActiveView('list');
                                    setSelectedEventForModal(null);
                                }}
                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition shadow-2xs mr-auto"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Voir dans la liste détaillée
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setSelectedEventForModal(null)} 
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg text-xs transition"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AgendaPage;
