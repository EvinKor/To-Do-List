import React, { useEffect, useMemo, useState } from 'react';
import TaskListView from './TaskListView';
import Whiteboard from './components/Whiteboard/Whiteboard';
import LoginPage from './components/Auth/LoginPage';
import { Task, WhiteboardNote } from './hooks/types';
import { supabase } from './lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Seed data to showcase the views without a backend
const seedTasks: Task[] = [
  {
    id: 't1',
    title: 'Draft product brief',
    category: 'Product',
    type: 'task',
    color: 'blue',
    urgency: 'High',
    duration: '1h',
    date: new Date().toLocaleDateString('en-CA'),
    time: '10:00',
    status: 'active',
  },
  {
    id: 't2',
    title: '1:1 with design lead',
    category: 'Meeting',
    type: 'event',
    color: 'green',
    urgency: 'Normal',
    duration: '30m',
    date: new Date().toLocaleDateString('en-CA'),
    time: '15:30',
    status: 'todo',
  },
  {
    id: 't3',
    title: 'Plan Q1 roadmap',
    category: 'Deep Work',
    type: 'task',
    color: 'amber',
    urgency: 'Medium',
    duration: '2h',
    date: new Date(Date.now() + 86400000).toLocaleDateString('en-CA'),
    status: 'todo',
  },
];

const seedNotes: WhiteboardNote[] = [
  {
    id: 'b3e8a4d4-2c5e-4b2a-9f8c-1d3e5a7b9c0d',
    type: 'sticky',
    x: 200,
    y: 180,
    width: 260,
    height: 260,
    content: 'Welcome to the whiteboard!\nDrag, resize, and rotate me.',
    title: 'Welcome',
    color: 'yellow',
    rotation: -1.5,
    zIndex: 1,
    fontSize: 16,
    createdAt: Date.now(),
  },
  {
    id: 'c4f9b5e5-3d6f-5c3b-0a9d-2e4f6b8c0d1e',
    type: 'text',
    x: 640,
    y: 320,
    width: 420,
    height: 120,
    content: 'Try the text tool, or drop images in.',
    title: 'Tips',
    color: 'transparent',
    rotation: 0,
    zIndex: 2,
    fontSize: 18,
    createdAt: Date.now(),
  },
];

const views = ['tasks', 'whiteboard'] as const;
type View = (typeof views)[number];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  /* const [tasks, setTasks] = useState<Task[]>(seedTasks); */
  const [tasks, setTasks] = useState<Task[]>([]);
  /* const [notes, setNotes] = useState<WhiteboardNote[]>(seedNotes); */
  const [notes, setNotes] = useState<WhiteboardNote[]>([]);
  const [activeView, setActiveView] = useState<View>('whiteboard');

  // Keep the document class in sync so Tailwind dark styles work
  // --- Auth State ---
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync dark mode
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((v) => !v);

  // Handlers moved to bottom


  const todayStr = new Date().toLocaleDateString('en-CA');
  const upcomingCount = useMemo(() => tasks.filter((t) => t.date >= todayStr && t.status !== 'completed').length, [tasks, todayStr]);

  // --- Task Persistence ---
  const [taskListId, setTaskListId] = useState<string | null>(null);

  // 1. Ensure Task List Exists
  useEffect(() => {
    const ensureTaskList = async () => {
      console.log('ensureTaskList: Checking for user', userId);
      if (!userId) return;

      const { data, error } = await supabase
        .from('task_lists')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        console.log('ensureTaskList: Found list', data.id);
        setTaskListId(data.id);
      } else {
        console.log('ensureTaskList: Creating new list...');
        // Create default list
        const { data: newList, error: createError } = await supabase
          .from('task_lists')
          .insert({ user_id: userId, title: 'My Tasks' })
          .select()
          .single();

        if (newList) {
          console.log('ensureTaskList: Created list', newList.id);
          setTaskListId(newList.id);
        }
        if (createError) console.error('Error creating task list:', createError);
      }
    };

    if (userId) {
      ensureTaskList();
    }
  }, [userId]);

  // 2. Fetch Tasks
  // 2. Fetch Tasks
  useEffect(() => {
    const fetchTasks = async () => {
      console.log('fetchTasks: Triggered', { userId });
      if (!userId) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      if (data) {
        console.log('fetchTasks: Data received', data.length);
        const mappedTasks: Task[] = data.map((t: any) => ({
          id: t.id,
          title: t.title,
          category: t.category || 'Deep Work',
          type: t.type,
          color: t.color,
          urgency: t.urgency,
          duration: t.duration || '1h',
          date: t.date,
          time: t.time,
          status: t.status,
          progress: t.progress || 0
        }));
        setTasks(mappedTasks);
      }
    };

    fetchTasks();
  }, [userId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return <LoginPage onLoginSuccess={() => { }} />;
  }

  // 3. Handlers
  // 3. Handlers
  const handleAddTask = async (task: Task) => {
    if (!userId) return;

    // Optimistic UI update
    setTasks((prev) => [...prev, task]);

    const { error } = await supabase.from('tasks').insert({
      id: task.id,
      // list_id removed per new schema
      user_id: userId,
      title: task.title,
      category: task.category || 'Deep Work', // Required field
      date: task.date,
      time: task.time,
      status: task.status,
      type: task.type,
      urgency: task.urgency,
      color: task.color,
      duration: task.duration || '1h'
    });

    if (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleEditTask = async (updated: Task) => {
    if (!userId) return;

    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    const { error } = await supabase.from('tasks').update({
      title: updated.title,
      category: updated.category,
      date: updated.date,
      time: updated.time,
      status: updated.status,
      type: updated.type,
      urgency: updated.urgency,
      color: updated.color,
      duration: updated.duration
    }).eq('id', updated.id);

    if (error) console.error('Error updating task:', error);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!userId) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) console.error('Error deleting task:', error);
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'todo' : 'completed';

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    const { error } = await supabase.from('tasks').update({
      status: newStatus
    }).eq('id', taskId);

    if (error) console.error('Error toggling task status:', error);
  };

  return (
    <div className={`h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-50 overflow-hidden`}>
      <header className="sticky top-0 z-20 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="mx-auto w-full max-w-[1440px] px-6 h-20 flex items-center justify-between gap-8">
          {/* Logo & Branding */}
          <div className="flex items-center gap-4 group cursor-default min-w-0">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative size-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xl font-bold shadow-sm">
                <span className="bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent text-[24px]">P</span>
              </div>
            </div>
            <div className="hidden sm:block overflow-hidden">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                To-do List
              </h1>
            </div>
          </div>

          {/* Center Navigation - Pill View Switcher */}
          <nav className="flex items-center bg-slate-100/80 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-inner">
            {views.map((v) => {
              const isActive = activeView === v;
              return (
                <button
                  key={v}
                  onClick={() => setActiveView(v)}
                  className={`
                    relative px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2
                    ${isActive
                      ? 'text-white shadow-lg scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-xl animate-in fade-in zoom-in-95 duration-300"></div>
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">
                      {v === 'tasks' ? 'inventory' : 'dashboard_customize'}
                    </span>
                    {v === 'tasks' ? `Tasks (${upcomingCount})` : 'Whiteboard'}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={async () => await supabase.auth.signOut()}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Sign Out
            </button>
            <button
              onClick={toggleTheme}
              className="size-11 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-300"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full overflow-hidden flex flex-col">
        {activeView === 'tasks' ? (
          <div className="mx-auto max-w-6xl w-full px-4 pb-12 pt-4">
            <TaskListView
              toggleTheme={toggleTheme}
              isDarkMode={isDarkMode}
              tasks={tasks}
              onToggleTaskStatus={handleToggleTaskStatus}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              userId={userId || ''}
            />
          </div>
        ) : (
          <Whiteboard
            toggleTheme={toggleTheme}
            isDarkMode={isDarkMode}
            notes={notes}
            setNotes={setNotes}
            userId={userId}
          />
        )}
      </main>
    </div>
  );
}
