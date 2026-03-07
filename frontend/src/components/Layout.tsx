import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, User, LogOut, Star, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
      isActive
        ? 'bg-brand-500 text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-4 gap-2 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 py-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Choretastic</span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 flex flex-col gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <Home className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink to="/households" className={navLinkClass}>
            <Users className="w-4 h-4" /> Households
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            <User className="w-4 h-4" /> Profile
          </NavLink>
        </nav>

        {/* User Info */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: user?.avatar_color }}
            >
              {user?.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user?.username}</p>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-xs font-bold">{user?.total_points?.toLocaleString()} pts</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="btn-ghost text-xs flex-1 justify-center">
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button onClick={handleLogout} className="btn-ghost text-red-500 dark:text-red-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold">Choretastic</span>
        </div>
        <div className="flex items-center gap-1 text-amber-500">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span className="text-sm font-bold">{user?.total_points?.toLocaleString()}</span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-around px-2 z-40">
        <NavLink to="/" end className={({ isActive }) =>
          `flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${isActive ? 'text-brand-500' : 'text-gray-500 dark:text-gray-400'}`}>
          <Home className="w-5 h-5" /><span className="text-xs">Home</span>
        </NavLink>
        <NavLink to="/households" className={({ isActive }) =>
          `flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${isActive ? 'text-brand-500' : 'text-gray-500 dark:text-gray-400'}`}>
          <Users className="w-5 h-5" /><span className="text-xs">Groups</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) =>
          `flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${isActive ? 'text-brand-500' : 'text-gray-500 dark:text-gray-400'}`}>
          <User className="w-5 h-5" /><span className="text-xs">Profile</span>
        </NavLink>
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-64 mt-14 md:mt-0 mb-16 md:mb-0 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
