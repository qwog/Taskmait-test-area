import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Flame, CheckCircle, Users, ArrowRight, Trophy, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../hooks/useApi';
import { Household, TaskCompletion, UserStats } from '../types';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Star; label: string; value: string | number; color: string }) {
  return (
    <div className="card p-5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-black mb-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [recentActivity, setRecentActivity] = useState<TaskCompletion[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [hh, st] = await Promise.all([
          api.get('/households'),
          api.get('/users/me/stats'),
        ]);
        setHouseholds(hh);
        setStats(st);

        // Get recent activity from first household if available
        if (hh.length > 0) {
          const activity = await api.get(`/tasks/household/${hh[0].id}/completions`);
          setRecentActivity(activity.slice(0, 10));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hey, {user?.username}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {stats?.todayCompletions === 0
              ? "Let's get some chores done today!"
              : `You've completed ${stats?.todayCompletions} task${stats?.todayCompletions === 1 ? '' : 's'} today. Keep it up!`}
          </p>
        </div>
        <div className="points-pill text-base gap-1.5 px-4 py-2">
          <Star className="w-4 h-4 fill-current" />
          {user?.total_points?.toLocaleString()}
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Star} label="Total Points" value={stats.totalPoints} color="bg-brand-500" />
          <StatCard icon={CheckCircle} label="Tasks Done" value={stats.totalCompletions} color="bg-emerald-500" />
          <StatCard icon={Flame} label="Best Streak" value={`${stats.longestStreak} days`} color="bg-orange-500" />
          <StatCard icon={Trophy} label="Today" value={stats.todayCompletions} color="bg-purple-500" />
        </div>
      )}

      {/* Households */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Your Households</h2>
          <Link to="/households" className="text-brand-500 text-sm font-semibold flex items-center gap-1 hover:underline">
            Manage <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {households.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-brand-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">No households yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Create or join a household to start tracking chores together!</p>
            <Link to="/households" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Household
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {households.map((h) => (
              <Link key={h.id} to={`/households/${h.id}`} className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-lg">
                    {h.name[0].toUpperCase()}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors mt-1" />
                </div>
                <h3 className="font-bold text-base">{h.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {h.member_count} member{h.member_count === 1 ? '' : 's'}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    #{h.invite_code}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Recent Activity</h2>
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {recentActivity.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: c.avatar_color }}
                >
                  {c.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    <span className="text-gray-600 dark:text-gray-400">{c.username}</span> completed{' '}
                    <span>{c.task_title}</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDistanceToNow(new Date(c.completed_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="points-pill shrink-0">
                  <Star className="w-3 h-3 fill-current" />
                  +{c.points_earned}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
