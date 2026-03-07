import { useState } from 'react';
import { Star, Flame, CheckCircle, Calendar, Pencil, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../hooks/useApi';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#84cc16', '#a855f7',
];

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: user?.username || '', avatar_color: user?.avatar_color || '#6366f1' });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/me', form);
      await refreshUser();
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  if (!user) return null;

  const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 max-w-xl animate-slide-up">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-5 mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg transition-all duration-200"
            style={{ backgroundColor: editing ? form.avatar_color : user.avatar_color }}
          >
            {(editing ? form.username : user.username)[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.username}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            <div className="flex items-center gap-1 text-amber-500 mt-1">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold">{user.total_points.toLocaleString()} total points</span>
            </div>
          </div>
        </div>

        {!editing ? (
          <div className="flex gap-3">
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 flex-1">
              <Pencil className="w-4 h-4" /> Edit Profile
            </button>
            <button onClick={handleLogout} className="btn-ghost text-red-500 dark:text-red-400 flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Username</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required minLength={2} maxLength={30}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Avatar Color</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, avatar_color: color })}
                    className={`w-full aspect-square rounded-xl transition-all duration-150 ${
                      form.avatar_color === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Star, label: 'Total Points', value: user.total_points.toLocaleString(), color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/30' },
          { icon: Calendar, label: 'Member Since', value: joinedDate, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/30' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-lg font-black">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="card p-5 bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 border-brand-200 dark:border-brand-900">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" /> How to Earn More Points
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            Complete tasks before the time deadline for a speed bonus
          </li>
          <li className="flex items-start gap-2">
            <Flame className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            Build daily streaks — each day adds +5 streak bonus points (up to +100)
          </li>
          <li className="flex items-start gap-2">
            <Star className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            Ask your household to assign high-value tasks to you
          </li>
        </ul>
      </div>
    </div>
  );
}
