import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, LogIn, ArrowRight, Trophy, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../hooks/useApi';
import { Household } from '../types';

export default function HouseholdsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [formData, setFormData] = useState({ name: '', invite_code: '' });
  const [submitting, setSubmitting] = useState(false);

  async function loadHouseholds() {
    try {
      const data = await api.get('/households');
      setHouseholds(data);
    } catch {
      toast.error('Failed to load households');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHouseholds(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/households', { name: formData.name });
      toast.success(`"${formData.name}" created!`);
      setMode('idle');
      setFormData({ name: '', invite_code: '' });
      await loadHouseholds();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const hh = await api.post('/households/join', { invite_code: formData.invite_code });
      toast.success(`Joined "${hh.name}"!`);
      setMode('idle');
      setFormData({ name: '', invite_code: '' });
      await loadHouseholds();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid invite code');
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied!');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Households</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Manage your shared spaces</p>
        </div>
      </div>

      {/* Action buttons */}
      {mode === 'idle' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('create')}
            className="card p-6 flex flex-col items-center gap-3 hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800 transition-all group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors">
              <Plus className="w-7 h-7 text-brand-500" />
            </div>
            <div className="text-center">
              <p className="font-bold">Create Household</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start a new space for your home</p>
            </div>
          </button>

          <button
            onClick={() => setMode('join')}
            className="card p-6 flex flex-col items-center gap-3 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
              <LogIn className="w-7 h-7 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="font-bold">Join Household</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter an invite code to join</p>
            </div>
          </button>
        </div>
      )}

      {/* Create form */}
      {mode === 'create' && (
        <div className="card p-6 animate-slide-up">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-500" /> Create New Household
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Household Name</label>
              <input
                className="input"
                placeholder="e.g. The Smith House"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setMode('idle')} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join form */}
      {mode === 'join' && (
        <div className="card p-6 animate-slide-up">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" /> Join Household
          </h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Invite Code</label>
              <input
                className="input font-mono uppercase tracking-widest text-lg text-center"
                placeholder="ABC123"
                value={formData.invite_code}
                onChange={(e) => setFormData({ ...formData, invite_code: e.target.value.toUpperCase() })}
                required
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Ask a household member for their 6-character invite code</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setMode('idle')} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Joining...' : 'Join'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Households list */}
      {households.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Your Households ({households.length})
          </h2>
          <div className="space-y-3">
            {households.map((h) => (
              <div key={h.id} className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-xl shrink-0">
                    {h.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base">{h.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {h.member_count} member{h.member_count === 1 ? '' : 's'}
                      </span>
                      <button
                        onClick={() => copyCode(h.invite_code)}
                        className="text-xs font-mono text-gray-400 hover:text-brand-500 transition-colors flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> {h.invite_code}
                      </button>
                    </div>
                  </div>
                  <Link
                    to={`/households/${h.id}`}
                    className="btn-primary flex items-center gap-2 shrink-0"
                  >
                    Open <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {households.length === 0 && mode === 'idle' && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-5xl mb-4">🏠</p>
          <p className="font-semibold text-lg text-gray-600 dark:text-gray-400">No households yet</p>
          <p className="text-sm">Create one or join with an invite code to get started!</p>
        </div>
      )}
    </div>
  );
}
