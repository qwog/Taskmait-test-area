import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Copy, ChevronDown, Flame, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Household, Task, TaskCompletion, Streak, CompletionResult, TaskFrequency } from '../types';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import Leaderboard from '../components/Leaderboard';
import PointsPopup from '../components/PointsPopup';

type FilterFreq = 'all' | TaskFrequency;

export default function HouseholdPage() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [household, setHousehold] = useState<Household | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [filterFreq, setFilterFreq] = useState<FilterFreq>('all');
  const [activeTab, setActiveTab] = useState<'tasks' | 'activity'>('tasks');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [hh, ts, ac, sk] = await Promise.all([
        api.get(`/households/${id}`),
        api.get(`/tasks/household/${id}`),
        api.get(`/tasks/household/${id}/completions`),
        api.get(`/tasks/household/${id}/streaks`),
      ]);
      setHousehold(hh);
      setTasks(ts);
      setCompletions(ac);
      setStreaks(sk);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('403')) navigate('/households');
      else toast.error('Failed to load household');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Determine which tasks are completed in the current period
  const completedTaskIds = new Set(
    completions
      .filter((c) => {
        const task = tasks.find((t) => t.id === c.task_id);
        if (!task || c.user_id !== user?.id) return false;
        const now = new Date();
        const completedAt = new Date(c.completed_at);
        switch (task.frequency) {
          case 'daily': return completedAt.toDateString() === now.toDateString();
          case 'weekly': {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            return completedAt >= startOfWeek;
          }
          case 'monthly': return completedAt.getMonth() === now.getMonth() && completedAt.getFullYear() === now.getFullYear();
          case 'yearly': return completedAt.getFullYear() === now.getFullYear();
          default: return false;
        }
      })
      .map((c) => c.task_id)
  );

  async function handleComplete(taskId: string) {
    try {
      const result = await api.post(`/tasks/${taskId}/complete`, {});
      setCompletionResult(result);
      await loadData();
      await refreshUser();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete task');
    }
  }

  async function handleSaveTask(data: Partial<Task>) {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, data);
        toast.success('Task updated!');
      } else {
        await api.post(`/tasks/household/${id}`, data);
        toast.success('Task created!');
      }
      setEditingTask(null);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save task');
      throw err;
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      await loadData();
    } catch {
      toast.error('Failed to delete task');
    }
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(household?.invite_code || '');
    toast.success('Invite code copied!');
  }

  const filteredTasks = tasks.filter((t) => filterFreq === 'all' || t.frequency === filterFreq);
  const pendingTasks = filteredTasks.filter((t) => !completedTaskIds.has(t.id));
  const doneTasks = filteredTasks.filter((t) => completedTaskIds.has(t.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!household) return null;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{household.name}</h1>
          <button
            onClick={copyInviteCode}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors mt-1"
          >
            <Copy className="w-3.5 h-3.5" />
            Invite code: <span className="font-mono font-bold">{household.invite_code}</span>
          </button>
        </div>
        <button onClick={() => { setEditingTask(null); setShowTaskForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Members pill row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="w-4 h-4 text-gray-400" />
        {household.members?.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: m.avatar_color }}>
              {m.username[0].toUpperCase()}
            </div>
            <span className="text-xs font-medium">{m.username}</span>
            {m.id === user?.id && <span className="text-xs text-brand-500">(you)</span>}
          </div>
        ))}
      </div>

      {/* Streaks bar */}
      {streaks.filter((s) => s.current_streak > 1).length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {streaks.filter((s) => s.current_streak > 1).map((s) => (
            <div key={`${s.user_id}-${s.task_id}`} className="shrink-0 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-xs font-bold text-orange-700 dark:text-orange-400">{s.current_streak} day streak</p>
                <p className="text-xs text-orange-600/70 dark:text-orange-500/70">{s.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab nav */}
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        {(['tasks', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tab === 'tasks' ? `Tasks (${tasks.length})` : 'Activity'}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="space-y-5">
          {/* Filter bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {(['all', 'daily', 'weekly', 'monthly', 'yearly', 'once'] as FilterFreq[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterFreq(f)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  filterFreq === f
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                To Do ({pendingTasks.length})
              </h3>
              {pendingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  streak={streaks.find((s) => s.task_id === task.id)}
                  isCompleted={false}
                  currentUserId={user?.id || ''}
                  onComplete={handleComplete}
                  onEdit={(t) => { setEditingTask(t); setShowTaskForm(true); }}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          )}

          {/* Done tasks */}
          {doneTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                <ChevronDown className="w-4 h-4" /> Completed ({doneTasks.length})
              </h3>
              {doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  streak={streaks.find((s) => s.task_id === task.id)}
                  isCompleted={true}
                  currentUserId={user?.id || ''}
                  onComplete={handleComplete}
                  onEdit={(t) => { setEditingTask(t); setShowTaskForm(true); }}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          )}

          {filteredTasks.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-4xl mb-3">🧹</p>
              <h3 className="font-bold text-lg mb-1">No tasks yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Add your first task to get started!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Leaderboard members={household.members || []} currentUserId={user?.id || ''} />

          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold">Recent Completions</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
              {completions.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: c.avatar_color }}>
                    {c.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.task_title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{c.username} · {new Date(c.completed_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400 shrink-0">+{c.points_earned}</span>
                </div>
              ))}
              {completions.length === 0 && (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No completions yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task form modal */}
      {showTaskForm && (
        <TaskFormModal
          task={editingTask}
          members={household.members || []}
          onSave={handleSaveTask}
          onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
        />
      )}

      {/* Points popup */}
      <PointsPopup result={completionResult} onDone={() => setCompletionResult(null)} />
    </div>
  );
}
