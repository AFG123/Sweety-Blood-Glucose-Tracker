import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Reading, readingsApi } from '@/services/api';
import { SLOT_LABELS } from './ReadingModal';
import { Plus, Edit2, Trash2, Calendar, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface RecordsViewProps {
  readings: Reading[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onRefresh: () => void;
  onOpenModal: (slot?: string, reading?: Reading) => void;
}

const ALL_SLOTS: Array<Reading['slot']> = [
  'MORNING_FASTING',
  'AFTER_BREAKFAST',
  'AFTER_LUNCH',
  'AFTER_DINNER',
];

export function RecordsView({
  readings,
  selectedDate,
  onSelectDate,
  onRefresh,
  onOpenModal,
}: RecordsViewProps) {
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const todayIST = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // Filter readings for selectedDate
  const dailyReadings = readings.filter((r) => r.reading_date === selectedDate);
  const dailySlotsMap = new Map<Reading['slot'], Reading>(dailyReadings.map((r) => [r.slot, r]));

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this glucose reading?')) {
      return;
    }
    setDeletingId(id);
    try {
      await readingsApi.delete(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete reading');
    } finally {
      setDeletingId(null);
    }
  };

  const getGlucoseBadge = (val: number) => {
    if (val < 70) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          Low ({val} mg/dL)
        </span>
      );
    }
    if (val <= 140) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Normal ({val} mg/dL)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        High ({val} mg/dL)
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Date Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card border border-border rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Active Tracking Date</h2>
            <p className="text-xs text-muted-foreground">Select a date to view or record slots</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            max={todayIST}
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={() => onOpenModal()} size="sm" className="font-semibold shadow-sm">
            <Plus className="mr-1.5 h-4 w-4" /> Log Reading
          </Button>
        </div>
      </div>

      {/* 4 Daily Slot Cards */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Slots for {selectedDate}
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {dailyReadings.length} of 4 slots logged
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_SLOTS.map((slotKey) => {
            const reading = dailySlotsMap.get(slotKey);
            const isLogged = Boolean(reading);

            return (
              <Card
                key={slotKey}
                className={`transition-all duration-200 border ${
                  isLogged
                    ? 'border-primary/30 bg-primary/[0.02] shadow-sm'
                    : 'border-dashed border-border bg-card/60 hover:border-primary/40'
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">
                      {SLOT_LABELS[slotKey]}
                    </span>
                    {isLogged ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {isLogged && reading ? (
                    <div>
                      <div className="text-2xl font-black text-foreground tracking-tight">
                        {reading.value}{' '}
                        <span className="text-xs font-semibold text-muted-foreground">mg/dL</span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/50">
                        {getGlucoseBadge(reading.value)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => onOpenModal(slotKey, reading)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2.5 text-center">
                      <p className="text-xs text-muted-foreground mb-3">No record logged</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 border-dashed hover:border-primary hover:text-primary"
                        onClick={() => onOpenModal(slotKey)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Log Slot
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Complete Historical Readings Table */}
      <Card className="shadow-sm border-border">
        <CardHeader className="p-6 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold">Readings History</CardTitle>
              <CardDescription className="text-xs">
                All records sorted by date and slot order
              </CardDescription>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-secondary rounded-md text-secondary-foreground w-fit">
              {readings.length} Total Entries
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {readings.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">No readings logged yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Click "+ Log Reading" above to record your first blood glucose entry.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Slot</th>
                    <th className="py-3 px-6">Glucose Level</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {readings.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-foreground">
                        {r.reading_date}
                      </td>
                      <td className="py-3.5 px-6 text-muted-foreground font-medium">
                        {SLOT_LABELS[r.slot] || r.slot}
                      </td>
                      <td className="py-3.5 px-6">
                        {getGlucoseBadge(r.value)}
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => onOpenModal(r.slot, r)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
