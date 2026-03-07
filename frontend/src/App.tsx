import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import HouseholdPage from './pages/HouseholdPage';
import HouseholdsPage from './pages/HouseholdsPage';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="households" element={<HouseholdsPage />} />
        <Route path="households/:id" element={<HouseholdPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
