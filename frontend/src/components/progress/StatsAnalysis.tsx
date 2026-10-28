import React from 'react';
import { BarChart3, Scale, Target } from 'lucide-react';

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
};
const PRIORITY_KEYS = ['low', 'medium', 'high'] as const;

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

const EMPTY_PRIORITY: TasksByPriority = {
  low: { completed: 0, total: 0 },
  medium: { completed: 0, total: 0 },
  high: { completed: 0, total: 0 },
};

// Priority serves as a difficulty weight: a high-priority task is worth 3 lows.
const WEIGHTS: Record<(typeof PRIORITY_KEYS)[number], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const StatsAnalysis: React.FC<StatsAnalysisProps> = ({
  tasksByPriority,
  weightedProductivity,
}) => {
  // Every period renders both panels. A period with nothing due reports zeros
  // instead of collapsing into an empty state, so switching between Daily,
  // Weekly and Monthly keeps the same layout.
  const priority = tasksByPriority ?? EMPTY_PRIORITY;
  const weightedRate =
    weightedProductivity != null && !Number.isNaN(weightedProductivity) ? weightedProductivity : 0;

  // Derive how much each priority actually contributes to the weighted score.
  const priorityContribution: Record<(typeof PRIORITY_KEYS)[number], number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  let weightedPossible = 0;

  PRIORITY_KEYS.forEach((p) => {
    const stats = priority[p];
    weightedPossible += (stats.total || 0) * WEIGHTS[p];
    priorityContribution[p] = (stats.completed || 0) * WEIGHTS[p];
  });

  const contributionPercents: Record<(typeof PRIORITY_KEYS)[number], number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  if (weightedPossible > 0) {
    PRIORITY_KEYS.forEach((p) => {
      contributionPercents[p] = Math.round((priorityContribution[p] / weightedPossible) * 100);
    });
  }

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
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Scale className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200">Tasks by priority</h3>
          </div>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PRIORITY_KEYS.map((p) => {
              const { total, completed } = priority[p];
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div
                  key={p}
                  className="flex flex-col gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#3a3a3a] dark:bg-[#202020]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[p]}`} />
                      <span className="text-[11px] font-medium text-gray-800 dark:text-gray-100">
                        {PRIORITY_LABELS[p]}
                      </span>
                    </div>
                    <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                      {completed}/{total}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200">Weighted completion</h3>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.round(weightedRate)}%
            </span>
            <div className="flex-1">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                {PRIORITY_KEYS.map((p) => {
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
      </div>
    </div>
  );
};

export default StatsAnalysis;
