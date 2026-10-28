import React from 'react';

export interface DailyRatePoint {
  date: string;
  completion_rate: number;
  completed_tasks: number;
  total_tasks: number;
  status: string;
}

/** Tier colours for bars, matching ProductivityLegend. */
export function getRateBarClass(rate: number, hasTasks = true): string {
  if (!hasTasks) return 'bg-gray-300 dark:bg-[#3a3a3a]';
  if (rate >= 90) return 'bg-green-600 dark:bg-green-400';
  if (rate >= 70) return 'bg-green-500 dark:bg-green-300';
  if (rate >= 40) return 'bg-yellow-500 dark:bg-yellow-400';
  return 'bg-red-500 dark:bg-red-400';
}

/** Same tiers as text/stroke colours, for the completion ring and status text. */
export function getRateTextClass(rate: number, hasTasks = true): string {
  if (!hasTasks) return 'text-gray-400 dark:text-gray-500';
  if (rate >= 90) return 'text-green-600 dark:text-green-400';
  if (rate >= 70) return 'text-green-500 dark:text-green-300';
  if (rate >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/** "2026-10-07" -> "7" */
export function dayOfMonth(dateKey: string): string {
  return String(Number(dateKey.split('-')[2]));
}

/** "2026-10-07" -> "Wed" */
export function weekdayShort(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString(undefined, { weekday: 'short' });
}

interface DailyRateChartProps {
  days: DailyRatePoint[];
  /** Makes each bar clickable; receives the day's date and rate. */
  onSelectDay?: (date: string, rate: number) => void;
  selectedDate?: string | null;
  height?: number;
  /** Roughly how many x-axis labels to print across the chart. */
  maxTicks?: number;
}

const todayKey = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * One bar per day of the period, with a dashed line at the 70% "Productive"
 * threshold. Days with nothing due sit as a faint stub, and future days are
 * dimmed so a part-finished week does not read as a collapse.
 */
const DailyRateChart: React.FC<DailyRateChartProps> = ({
  days,
  onSelectDay,
  selectedDate,
  height = 128,
  maxTicks = 10,
}) => {
  if (days.length === 0) return null;

  const interactive = Boolean(onSelectDay);
  const tickEvery = Math.max(1, Math.ceil(days.length / maxTicks));
  const today = todayKey();

  return (
    <div className="flex gap-2">
      {/* Y axis */}
      <div
        className="flex w-7 flex-col justify-between text-right text-[10px] tabular-nums text-gray-400 dark:text-gray-500"
        style={{ height, paddingBottom: 0 }}
        aria-hidden
      >
        <span>100</span>
        <span>70</span>
        <span>0</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-200 dark:border-[#333333]" />
          <div className="absolute inset-x-0 border-t border-dashed border-amber-300/70 dark:border-amber-500/30" style={{ top: '30%' }} />
          <div className="absolute inset-x-0 bottom-0 border-t border-gray-200 dark:border-[#2f2f2f]" />

          <div className="absolute inset-0 flex items-end gap-[3px]">
            {days.map((day) => {
              const hasTasks = (day.total_tasks || 0) > 0;
              const rate = Math.max(0, Math.min(100, day.completion_rate || 0));
              const isFuture = day.date > today;
              const isSelected = selectedDate === day.date;
              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={!interactive}
                  onClick={() => onSelectDay?.(day.date, day.completion_rate)}
                  title={`${day.date} · ${hasTasks ? `${rate.toFixed(1)}% (${day.completed_tasks}/${day.total_tasks} tasks)` : 'nothing due'}${isFuture ? ' · upcoming' : ''}`}
                  aria-label={`${day.date}: ${hasTasks ? `${rate.toFixed(1)}% complete` : 'nothing due'}`}
                  className={`group flex h-full flex-1 flex-col justify-end rounded-sm focus:outline-none ${
                    interactive ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400' : 'cursor-default'
                  } ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
                >
                  <span
                    className={`w-full rounded-sm transition-all duration-300 ${getRateBarClass(rate, hasTasks)} ${
                      isFuture ? 'opacity-30' : hasTasks ? 'group-hover:opacity-80' : ''
                    } ${isSelected ? 'ring-1 ring-indigo-400' : ''}`}
                    style={{ height: `${hasTasks ? Math.max(rate, 2) : 1.5}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-1 flex gap-[3px]">
          {days.map((day, index) => (
            <span
              key={day.date}
              className={`flex-1 text-center text-[10px] tabular-nums ${
                day.date === today ? 'font-semibold text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {index % tickEvery === 0 ? dayOfMonth(day.date) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyRateChart;
