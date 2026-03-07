import { useState } from 'react';
import { CheckCircle, Clock, Flame, Star, Zap, Pencil, Trash2, RotateCcw, User } from 'lucide-react';
import { Task, Streak } from '../types';

const FREQ_LABELS: Record<string, { label: string; color: string }> = {
  daily: { label: 'Daily', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  weekly: { label: 'Weekly', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  monthly: { label: 'Monthly', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  yearly: { label: 'Yearly', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  once: { label: 'One-time', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
};

interface Props {
  task: Task;
  streak?: Streak;
  isCompleted: boolean;
  currentUserId: string;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, streak, isCompleted, currentUserId, onComplete, onEdit, onDelete }: Props) {
  const [completing, setCompleting] = useState(false);
  const freq = FREQ_LABELS[task.frequency] || FREQ_LABELS.once;

  // Check if deadline has passed today
  const isDeadlineSoon = (() => {
    if (!task.time_deadline) return false;
    const now = new Date();
    const [h, m] = task.time_deadline.split(':').map(Number);
    const deadline = new Date();
    deadline.setHours(h, m, 0, 0);
    const diffMs = deadline.getTime() - now.getTime();
    return diffMs > 0 && diffMs < 60 * 60 * 1000; // within 1 hour
  })();

  const deadlinePassed = (() => {
    if (!task.time_deadline) return false;
    const now = new Date();
    const [h, m] = task.time_deadline.split(':').map(Number);
    const deadline = new Date();
    deadline.setHours(h, m, 0, 0);
    return now > deadline;
  })();

  async function handleComplete() {
    if (completing || isCompleted) return;
    setCompleting(true);
    try {
      await onComplete(task.id);
    } finally {
      setCompleting(false);
    }
  }

  const isAssignedToMe = !task.assigned_to || task.assigned_to === currentUserId;

  return (
    <div className={`card p-5 transition-all duration-200 ${isCompleted ? 'opacity-60' : 'hover:shadow-md'} ${!isAssignedToMe ? 'border-dashed' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Complete button */}
        <button
          onClick={handleComplete}
          disabled={completing || isCompleted || !isAssignedToMe}
          className={`mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200
            ${isCompleted
              ? 'border-emerald-400 bg-emerald-400 text-white'
              : isAssignedToMe
                ? 'border-gray-300 dark:border-gray-600 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:scale-110 cursor-pointer'
                : 'border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50'
            }`}
        >
          {completing ? (
            <span className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          ) : isCompleted ? (
            <CheckCircle className="w-4 h-4" />
          ) : null}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`font-semibold text-base leading-tight ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onEdit(task)} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(task.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {/* Frequency badge */}
            <span className={`badge ${freq.color}`}>
              <RotateCcw className="w-2.5 h-2.5" />
              {freq.label}
            </span>

            {/* Points */}
            <span className="points-pill text-xs px-2 py-0.5">
              <Star className="w-2.5 h-2.5 fill-current" />
              {task.base_points} pts
            </span>

            {/* Time deadline */}
            {task.time_deadline && (
              <span className={`badge items-center gap-1 ${
                deadlinePassed
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  : isDeadlineSoon
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              }`}>
                <Clock className="w-2.5 h-2.5" />
                {task.time_deadline}
                {task.time_bonus_points > 0 && !deadlinePassed && (
                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 ml-0.5">
                    <Zap className="w-2.5 h-2.5" />+{task.time_bonus_points}
                  </span>
                )}
              </span>
            )}

            {/* Streak */}
            {streak && streak.current_streak > 1 && (
              <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                <Flame className="w-2.5 h-2.5" />
                {streak.current_streak} streak
              </span>
            )}

            {/* Assigned to */}
            {task.assigned_to_username && (
              <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                <User className="w-2.5 h-2.5" />
                {task.assigned_to_username}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
