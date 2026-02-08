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

  if (!hasPriority && !hasWeighted) return null;

  return (
    <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          In-depth statistics
        </h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Task breakdown by priority and weighted productivity for fairer scoring (high-priority tasks count more than low-priority ones).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasPriority && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Tasks by priority</h3>
            </div>
            <div className="space-y-3">
              {(['low', 'medium', 'high'] as const).map((p) => {
                const s = tasksByPriority![p];
                const total = s.total;
                const completed = s.completed;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div key={p} className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[p]}`}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-16">
                      {PRIORITY_LABELS[p]}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${PRIORITY_COLORS[p]} transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                      {completed}/{total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {weightedProductivity != null && !Number.isNaN(weightedProductivity) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Weighted productivity</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {Math.round(weightedProductivity)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Low=1×, Medium=2×, High=3×. Reflects priority-adjusted completion.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsAnalysis;
