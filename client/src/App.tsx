import { AuthProvider, useAuth } from './context/AuthContext';
import { Auth } from './components/ui/auth-form-1';
import { Button } from './components/ui/button';

function MainApp() {
  const { user, loading, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🍬</span>
          <span className="text-xl font-bold tracking-tight">Sweety</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Signed in as <strong className="text-foreground">{user.name}</strong> ({user.email})
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto mt-8">
        <div className="p-8 bg-white border border-border rounded-xl shadow-sm text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Successful! 🎉</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            You are securely authenticated via HttpOnly cookies and CSRF tokens. Ready for the dashboard components.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
