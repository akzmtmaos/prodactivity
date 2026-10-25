import React from 'react';
import { BarChart3, Scale, Target } from 'lucide-react';

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
};

export interface TasksByPriority {
  low: { completed: number; total: number };
  medium: { completed: number; total: number };
  high: { completed: number; total: number };
}

interface StatsAnalysisProps {
  tasksByPriority?: TasksByPriority | null;
  weightedProductivity?: number | null;
  totalTasksCompleted?: number;
}

const StatsAnalysis: React.FC<StatsAnalysisProps> = ({
  tasksByPriority,
  weightedProductivity,
  totalTasksCompleted = 0,
}) => {
  const hasWeighted = weightedProductivity != null && !Number.isNaN(weightedProductivity);
  const hasPriority = tasksByPriority && (
    tasksByPriority.low.total > 0 ||
    tasksByPriority.medium.total > 0 ||
    tasksByPriority.high.total > 0
  );

  // Derive how much each priority actually contributes to the weighted score
  const weightMap: Record<'low' | 'medium' | 'high', number> = {
    low: 1,
    medium: 2,
    high: 3,
  };

  const priorityContribution: Record<'low' | 'medium' | 'high', number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  let weightedPossible = 0;
  if (hasPriority && tasksByPriority) {
    (['low', 'medium', 'high'] as const).forEach((p) => {
      const stats = tasksByPriority[p];
      const w = weightMap[p];
      const completedWeighted = (stats.completed || 0) * w;
      const totalWeighted = (stats.total || 0) * w;
      weightedPossible += totalWeighted;
      priorityContribution[p] = completedWeighted;
    });
  }

  const contributionPercents: Record<'low' | 'medium' | 'high', number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  if (weightedPossible > 0) {
    (['low', 'medium', 'high'] as const).forEach((p) => {
      contributionPercents[p] = Math.round(
        (priorityContribution[p] / weightedPossible) * 100
      );
    });
  }

  // The card is shown for every period, even with nothing due, so switching
  // between Daily, Weekly and Monthly doesn't make it appear and disappear.

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <BarChart3 size={13} className="text-gray-400 dark:text-gray-500" />
          Priority breakdown
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Low 1× · Medium 2× · High 3×
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 px-3.5 py-3 md:grid-cols-2">
        {!hasPriority && (
          <div className="md:col-span-2 flex items-center gap-2 rounded-md border border-dashed border-gray-200 px-3 py-2.5 dark:border-[#333333]">
            <Target size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              No tasks were due in this period, so there is nothing to break down yet.
            </p>
          </div>
        )}

        {hasPriority && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200">Tasks by priority</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
              {(['low', 'medium', 'high'] as const).map((p) => {
                const s = tasksByPriority![p];
                const total = s.total;
                const completed = s.completed;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div
                    key={p}
                    className="rounded-md border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#202020] px-3 py-2 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[p]}`} />
                        <span className="text-[11px] font-medium text-gray-800 dark:text-gray-100">
                          {PRIORITY_LABELS[p]}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                        {completed}/{total}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${PRIORITY_COLORS[p]} transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasWeighted && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200">
                Weighted completion
              </h3>
            </div>
            <div className="flex items-end justify-between gap-3">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {Math.round(weightedProductivity)}%
              </span>
              <div className="flex-1">
                <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                  {(['low', 'medium', 'high'] as const).map((p) => {
                    const pct = contributionPercents[p];
                    if (!pct) return null;
                    return (
                      <div
                        key={p}
                        className={`${PRIORITY_COLORS[p]} h-full`}
                        style={{ width: `${pct}%` }}
                        title={`${PRIORITY_LABELS[p]} contributes ${pct}% of weighted score`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Bar segments show how much each priority contributes to the weighted score
              (Low=1×, Medium=2×, High=3×).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsAnalysis;
