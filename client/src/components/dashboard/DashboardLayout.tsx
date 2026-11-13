import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { readingsApi, Reading } from '@/services/api';
import { RecordsView } from './RecordsView';
import { AnalyticsView } from './AnalyticsView';
import { ReadingModal } from './ReadingModal';
import { Button } from '@/components/ui/button';
import {
  Activity,
  BarChart3,
  LogOut,
  Plus,
  HeartPulse,
  Menu,
  X,
} from 'lucide-react';

export function DashboardLayout() {
  const { user, logout } = useAuth();

  const getTodayIST = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  };

  const [activeSection, setActiveSection] = React.useState<'records' | 'analytics'>('records');
  const [selectedDate, setSelectedDate] = React.useState(getTodayIST());
  const [readings, setReadings] = React.useState<Reading[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalInitialReading, setModalInitialReading] = React.useState<Reading | null>(null);
  const [modalDefaultSlot, setModalDefaultSlot] = React.useState<string | undefined>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const fetchReadings = React.useCallback(async () => {
    try {
      const res = await readingsApi.getAll();
      setReadings(res.data?.readings || []);
    } catch (err) {
      console.error('Failed to load readings:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const handleOpenModal = (slot?: string, reading?: Reading) => {
    setModalDefaultSlot(slot);
    setModalInitialReading(reading || null);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & App Title */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <HeartPulse className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight text-foreground tracking-tight">Sweety</h1>
                <p className="text-[11px] font-medium text-muted-foreground">Glucose Tracker</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-6">
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Data Management
              </p>
              <button
                onClick={() => {
                  setActiveSection('records');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeSection === 'records'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Activity className="h-4 w-4" />
                <span>Glucose Records</span>
              </button>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Reports & Insights
              </p>
              <button
                onClick={() => {
                  setActiveSection('analytics');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeSection === 'analytics'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analytics & Reports</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-border bg-card/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Sign Out"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-base font-bold text-foreground">
              {activeSection === 'records' ? 'Daily Glucose Tracker' : 'Analytics & Statistical Reports'}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => handleOpenModal()}
              size="sm"
              className="font-semibold shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Log Reading
            </Button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {activeSection === 'records' ? (
              <RecordsView
                readings={readings}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onRefresh={fetchReadings}
                onOpenModal={handleOpenModal}
              />
            ) : (
              <AnalyticsView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modal for creating or editing readings */}
      <ReadingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchReadings}
        initialReading={modalInitialReading}
        defaultDate={selectedDate}
        defaultSlot={modalDefaultSlot}
      />
    </div>
  );
}
