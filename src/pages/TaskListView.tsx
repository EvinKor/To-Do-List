import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Task } from '../hooks/types';
import NewTaskModal from './NewTaskModal';

interface TaskListViewProps {
    toggleTheme: () => void;
    isDarkMode: boolean;
    tasks: Task[];
    onToggleTaskStatus: (taskId: string) => void;
    onAddTask: (task: Task) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    userId: string; // Add userId prop to link tasks to the logged-in user
}

const TaskListView: React.FC<TaskListViewProps> = ({ toggleTheme, tasks, onToggleTaskStatus, onAddTask, onEditTask, onDeleteTask, userId }) => {
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<Date | undefined>(undefined);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [numColumns, setNumColumns] = useState(2);

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<{
        status: 'all' | 'active' | 'completed';
        type: 'all' | 'task' | 'event';
        urgency: 'all' | 'High' | 'Medium' | 'Low' | 'Normal';
        timeframe: 'all' | 'past' | 'today' | 'upcoming';
    }>({
        status: 'all',
        type: 'all',
        urgency: 'all',
        timeframe: 'all',
    });
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateColumns = () => {
            if (window.innerWidth < 768) setNumColumns(1);
            else if (window.innerWidth < 1280) setNumColumns(2);
            else setNumColumns(2);
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    // Filter click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        if (isFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterOpen]);

    const toggleGroup = (group: string) => {
        const newSet = new Set(collapsedGroups);
        if (newSet.has(group)) {
            newSet.delete(group);
        } else {
            newSet.add(group);
        }
        setCollapsedGroups(newSet);
    };

    const filteredTasks = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        return tasks.filter(task => {
            // Status Filter
            if (filters.status === 'active' && task.status === 'completed') return false;
            if (filters.status === 'completed' && task.status !== 'completed') return false;

            // Type Filter
            if (filters.type !== 'all' && task.type !== filters.type) return false;

            // Urgency Filter
            if (filters.urgency !== 'all' && task.urgency !== filters.urgency) return false;

            // Timeframe Filter
            if (filters.timeframe === 'past') {
                if (task.date >= todayStr) return false;
            } else if (filters.timeframe === 'today') {
                if (task.date !== todayStr) return false;
            } else if (filters.timeframe === 'upcoming') {
                if (task.date <= todayStr) return false;
            }

            return true;
        });
    }, [tasks, filters]);

    const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

    const handleAddNew = () => {
        setEditingTask(null);
        setSelectedDateForNewTask(undefined);
        setIsTaskModalOpen(true);
    };

    const handleAddNewForDate = (date: Date) => {
        setEditingTask(null);
        setSelectedDateForNewTask(date);
        setIsTaskModalOpen(true);
    };

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setSelectedDateForNewTask(undefined);
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = async (task: Task) => {
        if (editingTask) {
            await onEditTask(task); // Update task logic
        } else {
            await onAddTask(task); // Add new task logic
        }
        setIsTaskModalOpen(false);
    };

    const handleDelete = async (taskId: string) => {
        await onDeleteTask(taskId); // Delete task logic
    };

    // --- DnD Handlers ---
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
        setDraggedTaskId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDateDrop = (e: React.DragEvent, dateStr: string) => {
        e.preventDefault();
        if (draggedTaskId) {
            const task = tasks.find(t => t.id === draggedTaskId);
            if (task && task.date !== dateStr) {
                onEditTask({ ...task, date: dateStr });
            }
        }
        setDraggedTaskId(null);
    };

    const getUrgencyStyles = (urgency: string) => {
        switch (urgency) {
            case 'High': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
            case 'Medium': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
            case 'Low': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
            default: return 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        }
    };

    const getTaskStyles = (task: Task) => {
        if (task.color) {
            const colors: any = {
                blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-700/50' },
                red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-200 dark:border-red-700/50' },
                green: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-700/50' },
                amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-700/50' },
                violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500', border: 'border-violet-200 dark:border-violet-700/50' },
                pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', dot: 'bg-pink-500', border: 'border-pink-200 dark:border-pink-700/50' },
                cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500', border: 'border-cyan-200 dark:border-cyan-700/50' },
                slate: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500', border: 'border-slate-200 dark:border-slate-700' },
            };
            return colors[task.color] || colors.slate;
        }
        return { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600', dot: 'bg-slate-500', border: 'border-slate-200' };
    };

    const getDayColumnStyle = (index: number) => {
        const styles = [
            // Monday - Beige/Yellow
            'bg-[#FDF6D8] dark:bg-yellow-900/30 border-[#F5E6A3] dark:border-yellow-900/40 backdrop-blur-sm',
            // Tuesday - Blue
            'bg-[#E3F1FC] dark:bg-blue-900/30 border-[#C8E4FA] dark:border-blue-900/40 backdrop-blur-sm',
            // Wednesday - Green
            'bg-[#E8F5E9] dark:bg-green-900/30 border-[#C8E6C9] dark:border-green-900/40 backdrop-blur-sm',
            // Thursday - Purple
            'bg-[#F3E5F5] dark:bg-purple-900/30 border-[#E1BEE7] dark:border-purple-900/40 backdrop-blur-sm',
            // Friday - Pink
            'bg-[#FCE4EC] dark:bg-pink-900/30 border-[#F8BBD0] dark:border-pink-900/40 backdrop-blur-sm',
            // Saturday - Orange
            'bg-[#FFF3E0] dark:bg-orange-900/30 border-[#FFE0B2] dark:border-orange-900/40 backdrop-blur-sm',
            // Sunday - Cyan
            'bg-[#E0F7FA] dark:bg-cyan-900/30 border-[#B2EBF2] dark:border-cyan-900/40 backdrop-blur-sm',
        ];
        return styles[index % styles.length];
    };

    const fireConfetti = (x: number, y: number) => {
        const xRatio = x / window.innerWidth;
        const yRatio = y / window.innerHeight;

        confetti({
            particleCount: 80,
            spread: 60,
            origin: { x: xRatio, y: yRatio },
            colors: ['#017a6c', '#00c2cc', '#FFD700', '#FF69B4'],
            disableForReducedMotion: true,
            zIndex: 100,
            scalar: 0.8,
        });
    };

    const sortAndGroupTasks = useMemo(() => {
        const today = new Date();
        // Normalize today to start of day local time for string comparison purposes
        const todayStr = today.toLocaleDateString('en-CA');

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

        // Sort tasks by Date then Time (USING FILTERED TASKS)
        const sorted = [...filteredTasks].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            if (a.time && b.time) return a.time.localeCompare(b.time);
            if (a.time) return -1;
            if (b.time) return 1;
            return 0;
        });

        const groups: { [key: string]: Task[] } = {};
        const order: string[] = [];

        sorted.forEach(task => {
            let label = '';

            if (task.date === todayStr) label = 'Today';
            else if (task.date === tomorrowStr) label = 'Tomorrow';
            else {
                const [y, m, d] = task.date.split('-').map(Number);
                const localDate = new Date(y, m - 1, d);
                label = localDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            }

            if (!groups[label]) {
                groups[label] = [];
                order.push(label);
            }
            groups[label].push(task);
        });

        return { groups, order };
    }, [filteredTasks]);

    const boardGroups = useMemo(() => {
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-CA');
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

        const groups: { id: string; label: string; dateStr: string; tasks: Task[]; isOverdue?: boolean; index: number }[] = [];
        let indexCounter = 0;

        // 1. Today & Tomorrow (Present unless hidden by filter)
        const datesToShow = new Set<string>();
        if (filters.timeframe === 'all' || filters.timeframe === 'today' || filters.timeframe === 'upcoming') {
            if (filters.timeframe !== 'upcoming') datesToShow.add(todayStr);
            if (filters.timeframe !== 'today') datesToShow.add(tomorrowStr);
        }

        // 2. Add ALL dates from filteredTasks (Past, Present, Future)
        filteredTasks.forEach(t => {
            datesToShow.add(t.date);
        });

        const sortedDates = Array.from(datesToShow).sort();

        sortedDates.forEach(dateStr => {
            const dateTasks = filteredTasks.filter(t => t.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

            let label = '';
            const isOverdue = dateStr < todayStr;

            if (dateStr === todayStr) label = 'Today';
            else if (dateStr === tomorrowStr) label = 'Tomorrow';
            else {
                const [y, m, d] = dateStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                label = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            }

            groups.push({
                id: dateStr,
                label,
                dateStr,
                tasks: dateTasks,
                isOverdue,
                index: indexCounter++
            });
        });

        return groups;
    }, [filteredTasks, filters.timeframe]);

    const distributedGroups = useMemo(() => {
        const cols: typeof boardGroups[] = Array.from({ length: numColumns }, () => []);
        boardGroups.forEach((group, i) => {
            cols[i % numColumns].push(group);
        });
        return cols;
    }, [boardGroups, numColumns]);

    const renderListCard = (task: Task) => {
        const styles = getTaskStyles(task);
        const urgencyClass = getUrgencyStyles(task.urgency);
        const isActive = task.status === 'active';
        const isCompleted = task.status === 'completed';
        const isEvent = task.type === 'event';

        return (
            <div
                key={task.id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                className={`group relative border rounded-2xl p-4 transition-all duration-200 cursor-grab active:cursor-grabbing
        ${styles.bg}
        ${isActive ? 'border-primary shadow-md shadow-primary/5' : `${styles.border} hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/30`}
        ${isCompleted ? 'opacity-60' : ''}
      `}
            >
                <div className="flex items-center gap-4">
                    {!isEvent ? (
                        <button
                            onClick={(e) => {
                                if (!isCompleted) fireConfetti(e.clientX, e.clientY);
                                onToggleTaskStatus(task.id);
                            }}
                            className={`shrink-0 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center
              ${isCompleted
                                    ? 'bg-primary border-primary text-white'
                                    : isActive
                                        ? 'border-primary text-primary'
                                        : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-primary'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[16px] font-bold ${isCompleted ? 'scale-100' : 'scale-0'}`}>check</span>
                        </button>
                    ) : (
                        <div className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-[20px]">event</span>
                        </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-base font-bold truncate transition-colors ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                    {task.title}
                                </h4>
                                {isEvent && (
                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">
                                        Event
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {task.time && (
                                    <span className={`flex items-center gap-1 ${isCompleted ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                                        {task.time}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wide flex items-center gap-1.5 ${urgencyClass} ${isCompleted ? 'opacity-50' : ''}`}>
                                <span className={`material-symbols-outlined text-[16px] ${task.urgency !== 'Normal' ? 'filled' : ''}`}>flag</span>
                                {task.urgency}
                            </span>

                            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(task)}
                                    className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <NewTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleSaveTask}
                initialTask={editingTask}
                initialDate={selectedDateForNewTask}
                onDelete={onDeleteTask}
            />
            <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50 dark:bg-transparent">
                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    <div className="px-6 pt-5 pb-0 flex flex-col sm:flex-row items-center justify-end gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleAddNew}
                                className="h-10 px-5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-dark flex items-center justify-center gap-2 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span>Add Event</span>
                            </button>

                            <div className="relative" ref={filterRef}>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${isFilterOpen || activeFilterCount > 0
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-slate-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-transparent hover:border-slate-200 dark:hover:border-gray-700'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                    Filter
                                    {activeFilterCount > 0 && (
                                        <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1E1E1E] rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 z-50 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-900 dark:text-white">Filters</h3>
                                            {activeFilterCount > 0 && (
                                                <button
                                                    onClick={() => setFilters({ status: 'all', type: 'all', urgency: 'all', timeframe: 'all' })}
                                                    className="text-xs text-primary font-bold hover:underline"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {/* Timeframe */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['all', 'past', 'today', 'upcoming'].map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => setFilters({ ...filters, timeframe: t as any })}
                                                            className={`py-1.5 text-xs font-bold rounded-lg border transition-all capitalize ${filters.timeframe === t
                                                                ? 'bg-primary/10 border-primary text-primary'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</label>
                                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                                    {['all', 'active', 'completed'].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setFilters({ ...filters, status: s as any })}
                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${filters.status === s
                                                                ? 'bg-white dark:bg-surface-dark shadow-sm text-slate-900 dark:text-white'
                                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                                }`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Type */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</label>
                                                <div className="flex gap-2">
                                                    {['all', 'task', 'event'].map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => setFilters({ ...filters, type: t as any })}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all capitalize ${filters.type === t
                                                                ? 'bg-primary/10 border-primary text-primary'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Urgency */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Urgency</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['all', 'High', 'Medium', 'Low', 'Normal'].map(u => (
                                                        <button
                                                            key={u}
                                                            onClick={() => setFilters({ ...filters, urgency: u as any })}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${filters.urgency === u
                                                                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            {u}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-6">
                        {/* BOARD VIEW (MASONRY LAYOUT - Left to Right Order) */}
                        <div className="h-full">
                            <div className="flex gap-6 pb-20 items-start">
                                {distributedGroups.map((colGroups, colIndex) => (
                                    <div key={colIndex} className="flex-1 flex flex-col gap-6">
                                        {colGroups.map((group) => {
                                            const colStyle = group.isOverdue
                                                ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'
                                                : getDayColumnStyle(group.index);

                                            return (
                                                <div
                                                    key={group.id}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDateDrop(e, group.dateStr)}
                                                    className={`w-full h-fit rounded-[2rem] p-5 border ${colStyle} transition-all shadow-sm flex flex-col`}
                                                >
                                                    <h3 className={`text-xl font-bold mb-4 px-2 ${group.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-100'}`}>
                                                        {group.label}
                                                    </h3>

                                                    <div className={`space-y-3 ${draggedTaskId ? 'min-h-[100px] bg-black/5 dark:bg-white/5 rounded-xl transition-all' : ''}`}>
                                                        {group.tasks.length === 0 && !draggedTaskId && (
                                                            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                                                                No tasks
                                                            </div>
                                                        )}
                                                        {group.tasks.map(task => renderListCard(task))}
                                                    </div>

                                                    {!group.isOverdue && (
                                                        <button
                                                            onClick={() => {
                                                                const [y, m, d] = group.dateStr.split('-').map(Number);
                                                                const dateObj = new Date(y, m - 1, d);
                                                                handleAddNewForDate(dateObj);
                                                            }}
                                                            className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 w-full -ml-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">add</span>
                                                            New Task
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </>
    );
};

export default TaskListView;
