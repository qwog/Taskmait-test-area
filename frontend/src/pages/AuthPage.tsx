import { useState } from 'react';
import { Trophy, Star, Flame, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const { login, register } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back! 🎉');
      } else {
        await register(form.username, form.email, form.password);
        toast.success('Account created! Let\'s get to work! 💪');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 gradient-bg p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/5 rounded-full" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Trophy className="w-7 h-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Choretastic</span>
          </div>
          <p className="text-white/70 text-sm">Gamified household chore tracker</p>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Make chores <br />
            <span className="text-yellow-300">actually fun.</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Earn points, build streaks, and compete with your household to see who can get the most done.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: Star, label: 'Earn points', desc: 'Every chore is worth points you set' },
              { icon: Flame, label: 'Build streaks', desc: 'Daily streaks multiply your rewards' },
              { icon: Zap, label: 'Speed bonus', desc: 'Finish before the deadline for extra points' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-white/70 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/50 text-xs">Your household. Your rules. Compete and win.</p>
      </div>

      {/* Right — Auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Choretastic</span>
          </div>

          <div className="card p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1">
                {mode === 'login' ? 'Welcome back!' : 'Create account'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {mode === 'login' ? 'Sign in to your account to continue' : 'Join Choretastic and start earning'}
              </p>
            </div>

            {/* Tab toggle */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-6">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    mode === m
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Username</label>
                  <input
                    className="input"
                    placeholder="coolgamer42"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    minLength={2}
                    maxLength={30}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn-primary w-full justify-center flex mt-6" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-brand-500 font-semibold hover:underline">
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
