import { AuthProvider, useAuth } from './context/AuthContext';
import { Auth } from './components/ui/auth-form-1';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="text-3xl animate-bounce mb-2">🍬</div>
          <p className="text-sm font-medium text-muted-foreground">Loading Sweety...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4">
        <Auth />
      </div>
    );
  }

  return <DashboardLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
