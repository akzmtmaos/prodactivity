import React from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Clock, Gauge } from 'lucide-react';
import { formatMinutes, type ProductivityScore } from '../../utils/productivityScore';

interface ProductivityScoreCardProps {
  insights: ProductivityScore | null;
  loading?: boolean;
  view: 'daily' | 'weekly' | 'monthly';
}

const VIEW_NOUN: Record<'daily' | 'weekly' | 'monthly', string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

const BAR_TONES: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-emerald-500 dark:bg-emerald-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  red: 'bg-rose-500 dark:bg-rose-400',
};

const TEXT_TONES: Record<'green' | 'amber' | 'red', string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-rose-600 dark:text-rose-400',
};

function formatMonthDay(key: string): string {
  const date = new Date(`${key}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPeriodLabel(insights: ProductivityScore | null): string {
  if (!insights) return '';
  const { view, period } = insights;

  if (view === 'daily') return formatMonthDay(period.start);
  if (view === 'monthly') {
    return new Date(`${period.start}T00:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
  return `${formatMonthDay(period.start)} – ${formatMonthDay(period.end)}`;
}

function sparklinePath(insights: ProductivityScore, width: number, height: number): string {
  const points = insights.trend;
  if (points.length === 0) return '';

  const padding = 3;
  const step = width / Math.max(1, points.length - 1);
  const y = (rate: number) => height - padding - rate * (height - padding * 2);

  let path = '';
  let penDown = false;

  points.forEach((point, index) => {
    if (point.rate === null) {
      penDown = false;
      return;
    }
    const x = index * step;
    path += `${penDown ? ' L' : ' M'}${x.toFixed(1)} ${y(point.rate).toFixed(1)}`;
    penDown = true;
  });

  return path.trim();
}

function ratedPoints(insights: ProductivityScore): Array<{ x: number; y: number }> {
  const width = 132;
  const height = 34;
  const padding = 3;
  const step = width / Math.max(1, insights.trend.length - 1);

  return insights.trend.reduce<Array<{ x: number; y: number }>>((points, point, index) => {
    if (point.rate !== null) {
      points.push({
        x: index * step,
        y: height - padding - point.rate * (height - padding * 2),
      });
    }
    return points;
  }, []);
}

const ProductivityScoreCard: React.FC<ProductivityScoreCardProps> = ({ insights, loading, view }) => {
  const noun = VIEW_NOUN[view];

  if (loading && !insights) {
    return (
      <section className="mb-4 rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
        <div className="flex items-center gap-2 border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
          <Gauge size={13} className="text-gray-400 dark:text-gray-500" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Productivity score
          </span>
        </div>
        <div className="space-y-2 px-3.5 py-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <div className="h-2.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-[#262626]" />
              <div className="h-1.5 flex-1 animate-pulse rounded-full bg-gray-100 dark:bg-[#262626]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!insights) return null;

  // Nothing due and nothing studied means there is no score to give.
  const noActivity = insights.totalTasks === 0 && insights.focusMinutes === 0;
  const path = sparklinePath(insights, 132, 34);
  const points = ratedPoints(insights);
  // A line needs two points; for sparse history the dots carry the information.
  const showLine = points.length >= 2;
  const showDots = points.length <= 12;
  const delta = insights.deltaPct;

  return (
    <section className="mb-4 rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <Gauge size={13} className="text-gray-400 dark:text-gray-500" />
          Productivity score
        </span>
        <span className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
          <span className="tabular-nums">{formatPeriodLabel(insights)}</span>
          {insights.overdueTasks > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
              title={`${insights.overdueTasks} task${insights.overdueTasks === 1 ? '' : 's'} past their due date`}
            >
              <AlertTriangle size={10} />
              {insights.overdueTasks} overdue
            </span>
          )}
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        {/* Score + trend */}
        <div className="border-b border-gray-200 px-3.5 py-3 lg:border-b-0 lg:border-r dark:border-[#2f2f2f]">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums leading-none text-gray-900 dark:text-white">
              {noActivity ? '—' : insights.score}
            </span>
            {!noActivity && <span className="text-[11px] text-gray-400 dark:text-gray-500">/ 100</span>}
            <span className={`ml-auto text-xs font-medium ${noActivity ? 'text-gray-400 dark:text-gray-500' : TEXT_TONES[insights.band.tone]}`}>
              {noActivity ? 'Nothing logged' : insights.band.label}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            {insights.completionIncluded
              ? `${insights.completedTasks} of ${insights.totalTasks} tasks due this ${noun}`
              : noActivity
                ? `No tasks or focus sessions this ${noun} yet`
                : `No tasks due this ${noun}`}
          </p>

          <div className="mt-2 flex items-end justify-between gap-3">
            <svg
              viewBox="0 0 132 34"
              className="h-[34px] w-[132px] flex-shrink-0"
              role="img"
              aria-label={`Completion trend for the last ${insights.trend.length} days`}
            >
              <line
                x1="0"
                y1="31"
                x2="132"
                y2="31"
                className="stroke-gray-200 dark:stroke-[#333333]"
                strokeWidth="1"
              />
              {showLine && (
                <path
                  d={path}
                  fill="none"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="stroke-indigo-500 dark:stroke-indigo-400"
                />
              )}
              {showDots &&
                points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="1.8"
                    className="fill-indigo-500 dark:fill-indigo-400"
                  />
                ))}
              {!showDots && points.length > 0 && (
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="2"
                  className="fill-indigo-500 dark:fill-indigo-400"
                />
              )}
            </svg>
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                trend
              </span>
              <span className="text-[11px] tabular-nums text-gray-600 dark:text-gray-300">
                {insights.trend.length}d
              </span>
            </div>
          </div>

          {delta !== null && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              {delta >= 0 ? (
                <ArrowUpRight size={12} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownRight size={12} className="text-rose-600 dark:text-rose-400" />
              )}
              <span className="tabular-nums text-gray-600 dark:text-gray-300">
                {delta > 0 ? '+' : ''}
                {delta} pts
              </span>
              <span className="text-gray-400 dark:text-gray-500">vs previous {noun}</span>
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="px-3.5 py-3">
          <div className="space-y-2.5">
            {insights.components.map((component) => {
              const excluded = component.key === 'completion' && !insights.completionIncluded;
              const tone =
                excluded
                  ? 'bg-gray-300 dark:bg-[#3a3a3a]'
                  : component.ratio >= 0.7
                    ? BAR_TONES.green
                    : component.ratio >= 0.4
                      ? BAR_TONES.amber
                      : BAR_TONES.red;

              const detail =
                component.key === 'completion'
                  ? insights.completionIncluded
                    ? `${insights.completedTasks}/${insights.totalTasks} tasks · ${Math.round(insights.weightedRate)}% weighted`
                    : 'nothing due'
                  : component.key === 'focus'
                    ? `${formatMinutes(insights.focusMinutes)} of ${formatMinutes(insights.focusTargetMinutes)} goal`
                    : component.key === 'consistency'
                      ? `${Math.round(component.ratio * 7)} of 7 days active`
                      : insights.overdueTasks === 0
                        ? 'nothing past due'
                        : `${insights.overdueTasks} past due`;

              return (
                <div key={component.key} className="flex items-center gap-3">
                  <div className="w-[10.5rem] min-w-0 flex-shrink-0">
                    <div className="text-[11px] font-medium leading-tight text-gray-800 dark:text-gray-100">
                      {component.label}
                    </div>
                    <div className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">{detail}</div>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-[#262626]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${tone}`}
                      style={{ width: `${Math.round(component.ratio * 100)}%` }}
                    />
                  </div>
                  <span className="w-11 flex-shrink-0 text-right text-[11px] tabular-nums text-gray-600 dark:text-gray-300">
                    {component.points}/{component.weight}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 border-t border-gray-100 pt-2 text-[10px] leading-relaxed text-gray-400 dark:border-[#2b2b2b] dark:text-gray-500">
            Completion is weighted by priority (low 1× · medium 2× · high 3×) and smoothed so a single
            ticked box can&apos;t read as 100%.
            {insights.lowConfidence && insights.completionIncluded ? ' Few tasks this period — read with care.' : ''}
          </p>
        </div>
      </div>

      {/* Footer: goal, subjects, highlights */}
      <div className="grid grid-cols-1 divide-y divide-gray-200 border-t border-gray-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-[#2f2f2f] dark:border-[#2f2f2f]">
        <div className="px-3.5 py-2.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Weekly focus goal
          </span>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white">
              {formatMinutes(insights.weeklyMinutes)}
            </span>
            <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
              of {formatMinutes(insights.weeklyTargetMinutes)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-[#262626]">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500 dark:bg-indigo-400"
              style={{
                width: `${Math.min(100, Math.round((insights.weeklyMinutes / Math.max(1, insights.weeklyTargetMinutes)) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="px-3.5 py-2.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Focus by subject
          </span>
          {insights.subjects.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {insights.subjects.slice(0, 3).map((subject) => (
                <li key={subject.name} className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] text-gray-700 dark:text-gray-300">
                    {subject.name}
                  </span>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                    {formatMinutes(subject.minutes)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              No labelled sessions this {noun}
            </p>
          )}
        </div>

        <div className="px-3.5 py-2.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Highlights
          </span>
          {insights.bestDay || insights.worstDay ? (
            <ul className="mt-1 space-y-0.5">
              {insights.bestDay && (
                <li className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-gray-700 dark:text-gray-300">Best day</span>
                  <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                    {formatMonthDay(insights.bestDay.date)} · {Math.round((insights.bestDay.rate || 0) * 100)}%
                  </span>
                </li>
              )}
              {insights.worstDay && insights.worstDay.date !== insights.bestDay?.date && (
                <li className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-gray-700 dark:text-gray-300">Roughest day</span>
                  <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                    {formatMonthDay(insights.worstDay.date)} ·{' '}
                    {Math.round((insights.worstDay.rate || 0) * 100)}%
                  </span>
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              <Clock size={11} />
              Nothing to compare yet
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductivityScoreCard;
