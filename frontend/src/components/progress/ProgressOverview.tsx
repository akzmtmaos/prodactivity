import React, { useMemo, useState } from 'react';
import LevelLeague from './LevelLeague';
import StreaksCalendar from './StreaksCalendar';
import DailyBreakdownModal from './DailyBreakdownModal';
import { CalendarDays, Flame, List } from 'lucide-react';
import { parseDateKey } from '../../utils/productivityScore';

interface ProgressOverviewProps {
  userLevel: {
    currentLevel: number;
    currentXP: number;
    xpToNextLevel: number;
  };
  todaysProductivity: any;
  streakData: any[];
  currentStreak?: number;
  longestStreak?: number;
  refreshProductivity: () => void;
  getProductivityColor?: (status: string) => string;
  username?: string;
  avatar?: string | null;
}

const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  userLevel,
  todaysProductivity,
  streakData,
  longestStreak = 0,
  getProductivityColor
}) => {
  const [showTodayBreakdown, setShowTodayBreakdown] = useState(false);

  // The summary strip already reports the current streak, so this card counts
  // active days in the month instead of repeating the same number.
  const activeDaysThisMonth = useMemo(() => {
    const now = new Date();
    return streakData.filter((day) => {
      if (!day?.streak || !day?.date) return false;
      const date = parseDateKey(day.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  }, [streakData]);

  const defaultGetProductivityColor = (status: string) => {
    switch (status) {
      case 'Highly Productive':
        return 'text-green-600 dark:text-green-400';
      case 'Productive':
        return 'text-green-600 dark:text-green-300';
      case 'Moderately Productive':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Low Productive':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const status = todaysProductivity?.status ?? 'No Tasks';
  const rate = todaysProductivity?.completion_rate ?? 0;
  const barTone =
    rate >= 70 ? 'bg-green-500 dark:bg-green-400'
      : rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400'
        : rate > 0 ? 'bg-red-500 dark:bg-red-400'
          : 'bg-gray-300 dark:bg-[#3a3a3a]';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        {/* League + streak stats */}
        <section className="rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
          <div className="flex items-center justify-between border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Level league
            </span>
            <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
              Level {userLevel.currentLevel}
            </span>
          </div>
          <div className="px-3.5 py-3">
            <LevelLeague currentLevel={userLevel.currentLevel} />
          </div>
          <div className="grid grid-cols-2 border-t border-gray-200 dark:border-[#2f2f2f]">
            <div className="flex items-center gap-2 px-3.5 py-2.5">
              <CalendarDays size={14} className="flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{activeDaysThisMonth}</span>
              <span
                className="text-xs text-gray-500 dark:text-gray-400"
                title="Days with a completed task this month"
              >
                {activeDaysThisMonth === 1 ? 'active day' : 'active days'}
              </span>
            </div>
            <div className="flex items-center gap-2 border-l border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
              <Flame size={14} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
              <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{longestStreak}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">longest</span>
            </div>
          </div>
        </section>

        {/* Today's productivity */}
        <section className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
            <div className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Today's productivity
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTodayBreakdown(true)}
              className="flex h-7 flex-shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-[#333333] dark:bg-[#252525] dark:text-gray-300 dark:hover:bg-[#2d2d2d]"
              title="View today's breakdown"
            >
              <List size={12} />
              Breakdown
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-center px-3.5 py-3">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className={`text-sm font-medium ${(getProductivityColor || defaultGetProductivityColor)(status)}`}>
                {status}
              </span>
              <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{rate}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#262626]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barTone}`}
                style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              {todaysProductivity?.total_tasks
                ? `${todaysProductivity.completed_tasks} of ${todaysProductivity.total_tasks} tasks completed today`
                : 'No tasks scheduled for today'}
            </p>
          </div>
        </section>
      </div>

      {/* Streak calendar */}
      <section className="flex flex-col rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
          <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <CalendarDays size={13} className="text-gray-400 dark:text-gray-500" />
            Streak calendar
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="h-2 w-2 rounded-[2px] bg-green-500" />
            active day
          </span>
        </div>
        <div className="px-3.5 py-3">
          <StreaksCalendar streakData={streakData} todaysProductivity={todaysProductivity} />
        </div>
      </section>

      <DailyBreakdownModal
        isOpen={showTodayBreakdown}
        onClose={() => setShowTodayBreakdown(false)}
        date={new Date().toLocaleDateString('en-CA')}
        dailyPercentage={todaysProductivity?.completion_rate || 0}
        getProductivityColor={getProductivityColor || defaultGetProductivityColor}
      />
    </div>
  );
};

export default ProgressOverview;
