import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { reportsApi, ReportResponse } from '@/services/api';
import { SLOT_LABELS } from './ReadingModal';
import { TrendingUp, TrendingDown, Activity, BarChart2, Calendar, Loader2 } from 'lucide-react';

interface AnalyticsViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

type ReportTab = 'daily' | 'month_to_date' | 'monthly';

export function AnalyticsView({ selectedDate, onSelectDate }: AnalyticsViewProps) {
  const [activeTab, setActiveTab] = React.useState<ReportTab>('daily');
  const [report, setReport] = React.useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const todayIST = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const fetchReport = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let res;
      if (activeTab === 'daily') {
        res = await reportsApi.getDaily(selectedDate);
      } else if (activeTab === 'month_to_date') {
        res = await reportsApi.getMonthToDate(selectedDate);
      } else {
        res = await reportsApi.getMonthly(selectedDate);
      }
      setReport(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedDate]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = report?.summary;

  return (
    <div className="space-y-8">
      {/* Analytics Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-card border border-border rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-foreground">Statistical Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated metrics for selected calendar intervals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interval Selector Tabs */}
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1 text-xs">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'daily'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setActiveTab('month_to_date')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'month_to_date'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month-to-Date
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Previous Month
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              max={todayIST}
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Date Range Description Banner */}
      {report && (
        <div className="px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary flex items-center justify-between">
          <span className="font-semibold">
            {activeTab === 'daily' && `Daily report for ${report.start_date}`}
            {activeTab === 'month_to_date' &&
              `Month-to-Date: ${report.start_date} through ${report.end_date}`}
            {activeTab === 'monthly' &&
              `Entire previous calendar month: ${report.start_date} to ${report.end_date}`}
          </span>
          <span className="font-medium text-muted-foreground">
            {summary?.total_readings || 0} recorded readings
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Calculating analytics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Highest Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Highest Level
                </span>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <div className="text-2xl font-black text-foreground">
                {summary?.highest !== null && summary?.highest !== undefined ? (
                  <>
                    {summary.highest}{' '}
                    <span className="text-xs font-semibold text-muted-foreground">mg/dL</span>
                  </>
                ) : (
                  <span className="text-muted-foreground font-normal">--</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Peak recorded value</p>
            </CardContent>
          </Card>

          {/* Lowest Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Lowest Level
                </span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <div className="text-2xl font-black text-foreground">
                {summary?.lowest !== null && summary?.lowest !== undefined ? (
                  <>
                    {summary.lowest}{' '}
                    <span className="text-xs font-semibold text-muted-foreground">mg/dL</span>
                  </>
                ) : (
                  <span className="text-muted-foreground font-normal">--</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Minimum recorded value</p>
            </CardContent>
          </Card>

          {/* Average Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Average Level
                </span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <div className="text-2xl font-black text-foreground">
                {summary?.average !== null && summary?.average !== undefined ? (
                  <>
                    {summary.average.toFixed(1)}{' '}
                    <span className="text-xs font-semibold text-muted-foreground">mg/dL</span>
                  </>
                ) : (
                  <span className="text-muted-foreground font-normal">--</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Mean glucose level</p>
            </CardContent>
          </Card>

          {/* Total Readings Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Readings
                </span>
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <BarChart2 className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <div className="text-2xl font-black text-foreground">
                {summary?.total_readings || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Logged in this timeframe</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* For Daily Report: Show Detailed Slot Readings Breakdown */}
      {activeTab === 'daily' && report && (
        <Card className="shadow-sm border-border">
          <CardHeader className="p-6 border-b border-border/60">
            <CardTitle className="text-base font-bold">Daily Slot Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Individual glucose logs recorded on {report.start_date}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!report.readings || report.readings.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                No readings recorded on this date.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {report.readings.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3.5 px-6 hover:bg-muted/20"
                  >
                    <span className="font-semibold text-sm text-foreground">
                      {SLOT_LABELS[item.slot] || item.slot}
                    </span>
                    <span className="font-black text-sm text-foreground">
                      {item.value} <span className="text-xs text-muted-foreground font-normal">mg/dL</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
