import { useState, useEffect } from 'react';
import { X, Star, Clock, Zap, RotateCcw, User } from 'lucide-react';
import { Task, HouseholdMember, TaskFrequency } from '../types';

interface Props {
  task?: Task | null;
  members: HouseholdMember[];
  onSave: (data: Partial<Task>) => Promise<void>;
  onClose: () => void;
}

const FREQUENCIES: { value: TaskFrequency; label: string; emoji: string }[] = [
  { value: 'daily', label: 'Daily', emoji: '📅' },
  { value: 'weekly', label: 'Weekly', emoji: '📆' },
  { value: 'monthly', label: 'Monthly', emoji: '🗓️' },
  { value: 'yearly', label: 'Yearly', emoji: '📇' },
  { value: 'once', label: 'One-time', emoji: '✅' },
];

export default function TaskFormModal({ task, members, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    base_points: 10,
    frequency: 'daily' as TaskFrequency,
    time_deadline: '',
    time_bonus_points: 0,
    assigned_to: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        base_points: task.base_points,
        frequency: task.frequency,
        time_deadline: task.time_deadline || '',
        time_bonus_points: task.time_bonus_points,
        assigned_to: task.assigned_to || '',
      });
    }
  }, [task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        time_deadline: form.time_deadline || null,
        assigned_to: form.assigned_to || null,
        time_bonus_points: form.time_deadline ? form.time_bonus_points : 0,
      } as Partial<Task>);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-lg font-bold">{task ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Task Title *</label>
            <input
              className="input"
              placeholder="e.g. Vacuum living room"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Description</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Optional details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Points */}
          <div>
            <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" /> Base Points
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1} max={500} step={5}
                value={form.base_points}
                onChange={(e) => setForm({ ...form, base_points: Number(e.target.value) })}
                className="flex-1 accent-brand-500"
              />
              <div className="points-pill w-20 justify-center text-base font-black">
                {form.base_points}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 (Quick)</span>
              <span>250 (Hard)</span>
              <span>500 (Epic)</span>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-brand-500" /> Frequency *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {FREQUENCIES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, frequency: value })}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    form.frequency === value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Deadline */}
          <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Speed Challenge (Optional)</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Complete by time for bonus points
              </label>
              <input
                type="time"
                className="input text-sm"
                value={form.time_deadline}
                onChange={(e) => setForm({ ...form, time_deadline: e.target.value })}
              />
            </div>
            {form.time_deadline && (
              <div>
                <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
                  Bonus Points for finishing on time
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5} max={200} step={5}
                    value={form.time_bonus_points}
                    onChange={(e) => setForm({ ...form, time_bonus_points: Number(e.target.value) })}
                    className="flex-1 accent-amber-500"
                  />
                  <div className="points-pill w-16 justify-center font-black">
                    +{form.time_bonus_points}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Assign to */}
          {members.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-500" /> Assign To (optional)
              </label>
              <select
                className="input"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              >
                <option value="">Anyone can complete</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.username}</option>
                ))}
              </select>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
