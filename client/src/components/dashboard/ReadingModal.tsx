import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readingsApi, Reading } from '@/services/api';
import { X, Loader2 } from 'lucide-react';

export const SLOT_LABELS: Record<string, string> = {
  MORNING_FASTING: 'Morning (Fasting)',
  AFTER_BREAKFAST: 'After Breakfast',
  AFTER_LUNCH: 'After Lunch',
  AFTER_DINNER: 'After Dinner',
};

interface ReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialReading?: Reading | null;
  defaultDate?: string;
  defaultSlot?: string;
}

export function ReadingModal({
  isOpen,
  onClose,
  onSuccess,
  initialReading,
  defaultDate,
  defaultSlot,
}: ReadingModalProps) {
  const isEditing = Boolean(initialReading);

  const getTodayIST = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  };

  const todayIST = getTodayIST();

  const [date, setDate] = React.useState(defaultDate || todayIST);
  const [slot, setSlot] = React.useState(defaultSlot || 'MORNING_FASTING');
  const [value, setValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialReading) {
      setDate(initialReading.reading_date);
      setSlot(initialReading.slot);
      setValue(String(initialReading.value));
    } else {
      setDate(defaultDate || todayIST);
      setSlot(defaultSlot || 'MORNING_FASTING');
      setValue('');
    }
    setError(null);
  }, [initialReading, defaultDate, defaultSlot, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 40 || numValue > 600) {
      setError('Glucose value must be a whole number between 40 and 600 mg/dL');
      return;
    }

    if (date > todayIST) {
      setError('Reading date cannot be in the future (IST)');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && initialReading) {
        await readingsApi.update(initialReading.id, {
          reading_date: date,
          slot,
          value: numValue,
        });
      } else {
        await readingsApi.create({
          reading_date: date,
          slot,
          value: numValue,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save glucose reading');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isEditing ? 'Edit Glucose Reading' : 'Log Glucose Reading'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter your blood glucose level in mg/dL
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reading-date">Date</Label>
            <Input
              id="reading-date"
              type="date"
              max={todayIST}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-[11px] text-muted-foreground">Cannot select future dates (IST)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reading-slot">Reading Slot</Label>
            <select
              id="reading-slot"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {Object.entries(SLOT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reading-value">Glucose Level (mg/dL)</Label>
            <Input
              id="reading-value"
              type="number"
              min={40}
              max={600}
              step={1}
              placeholder="e.g. 105"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-[11px] text-muted-foreground">Whole integer between 40 and 600 mg/dL</p>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Reading'
              ) : (
                'Save Reading'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
