/**
 * Shared productivity maths for the Progress page.
 *
 * Two rules live here so every surface agrees on them:
 *  1. A period's rate is completed ÷ total for that period. Never an average of
 *     daily percentages — that lets a 1-task Monday outweigh a 20-task Tuesday.
 *  2. The productivity score blends weighted completion, focus time,
 *     consistency and overdue work, and exposes how each part scored so the
 *     number can be explained rather than trusted blindly.
 */

export type PeriodView = 'daily' | 'weekly' | 'monthly';
export type PriorityKey = 'low' | 'medium' | 'high';

export const PRIORITY_WEIGHTS: Record<PriorityKey, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/** Points each part of the score can contribute (sums to 100). */
export const SCORE_WEIGHTS = {
  completion: 45,
  focus: 25,
  consistency: 20,
  overdue: 10,
} as const;

/** Overdue tasks needed before the overdue part of the score hits zero. */
export const OVERDUE_TOLERANCE = 5;

export interface ScoreTask {
  id?: string | number;
  title?: string;
  completed?: boolean;
  priority?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
}

export interface FocusSession {
  session_type?: string | null;
  subject?: string | null;
  title?: string | null;
  duration?: number | null;
  start_time?: string | null;
}

export interface PeriodBounds {
  start: string;
  end: string;
}

export interface PriorityTally {
  completed: number;
  total: number;
}

export type TasksByPriority = Record<PriorityKey, PriorityTally>;

export interface ScoreComponent {
  key: 'completion' | 'focus' | 'consistency' | 'overdue';
  label: string;
  /** Maximum points this component can contribute. */
  weight: number;
  /** 0–1 share of the component's weight that was earned. */
  ratio: number;
  /** Points earned, rounded to one decimal. */
  points: number;
}

export interface TrendPoint {
  date: string;
  /** null when nothing was due that day, so the chart can draw a gap. */
  rate: number | null;
  completed: number;
  total: number;
}

export interface SubjectSlice {
  name: string;
  minutes: number;
  share: number;
}

export interface ProductivityScore {
  view: PeriodView;
  period: PeriodBounds;
  /** Completed ÷ total for tasks due in the period. */
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
  /** Priority-weighted completion (low 1×, medium 2×, high 3×), 0–1, smoothed. */
  weightedRate: number;
  /** The same weighting without the small-sample prior, for raw breakdowns. */
  weightedRateRaw: number;
  tasksByPriority: TasksByPriority;
  score: number;
  band: { label: string; tone: 'green' | 'amber' | 'red' };
  components: ScoreComponent[];
  /** False when no tasks were due, so the score only covers the other parts. */
  completionIncluded: boolean;
  trend: TrendPoint[];
  bestDay: TrendPoint | null;
  worstDay: TrendPoint | null;
  /** Change in completion rate versus the previous period, in points. */
  deltaPct: number | null;
  focusMinutes: number;
  focusTargetMinutes: number;
  dailyGoalMinutes: number;
  weeklyMinutes: number;
  weeklyTargetMinutes: number;
  subjects: SubjectSlice[];
  subjectTotalMinutes: number;
  overdueTasks: number;
  /** True when the period holds too few tasks to read the number as reliable. */
  lowConfidence: boolean;
}

const DAY_MS = 86_400_000;

const pad = (value: number) => String(value).padStart(2, '0');

/** Local-time YYYY-MM-DD key (matches the rest of the app's date handling). */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetween(startKey: string, endKey: string): number {
  return Math.round((parseDateKey(endKey).getTime() - parseDateKey(startKey).getTime()) / DAY_MS);
}

export function getPeriodBounds(view: PeriodView, reference: Date): PeriodBounds {
  const referenceKey = toDateKey(reference);

  if (view === 'daily') {
    return { start: referenceKey, end: referenceKey };
  }

  if (view === 'weekly') {
    const weekdayOffset = (parseDateKey(referenceKey).getDay() + 6) % 7; // Monday = 0
    const start = addDays(referenceKey, -weekdayOffset);
    return { start, end: addDays(start, 6) };
  }

  const date = parseDateKey(referenceKey);
  return {
    start: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`,
    end: toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

export function shiftPeriod(view: PeriodView, period: PeriodBounds, direction: -1 | 1): PeriodBounds {
  if (view === 'daily') {
    const key = addDays(period.start, direction);
    return { start: key, end: key };
  }

  if (view === 'weekly') {
    const start = addDays(period.start, direction * 7);
    return { start, end: addDays(start, 6) };
  }

  const date = parseDateKey(period.start);
  return getPeriodBounds('monthly', new Date(date.getFullYear(), date.getMonth() + direction, 1));
}

/** Monday of the week containing `date`. */
export function getWeekBounds(date: Date): PeriodBounds {
  return getPeriodBounds('weekly', date);
}

export function isWithinPeriod(dateKey: string, period: PeriodBounds): boolean {
  return dateKey >= period.start && dateKey <= period.end;
}

export function normalizePriority(priority?: string | null): PriorityKey {
  const value = (priority || '').toLowerCase();
  return value === 'low' || value === 'high' ? value : 'medium';
}

export function tallyByPriority(tasks: ScoreTask[]): TasksByPriority {
  const tally: TasksByPriority = {
    low: { completed: 0, total: 0 },
    medium: { completed: 0, total: 0 },
    high: { completed: 0, total: 0 },
  };

  tasks.forEach((task) => {
    const priority = normalizePriority(task.priority);
    tally[priority].total += 1;
    if (task.completed) tally[priority].completed += 1;
  });

  return tally;
}

export function weightedCompletion(tasks: ScoreTask[]): { completedWeight: number; totalWeight: number } {
  return tasks.reduce(
    (totals, task) => {
      const weight = PRIORITY_WEIGHTS[normalizePriority(task.priority)];
      totals.totalWeight += weight;
      if (task.completed) totals.completedWeight += weight;
      return totals;
    },
    { completedWeight: 0, totalWeight: 0 }
  );
}

/**
 * Weighted completion with a one-task prior: (done + 1) / (weight + 2).
 *
 * Without it, ticking one easy high-priority box reads as 100% and loses its
 * meaning next to someone who finished twenty tasks. The prior fades as the
 * sample grows (2 tasks ≈ 60%, 10 tasks ≈ 92% at full completion).
 */
export function smoothedCompletionRate(completedWeight: number, totalWeight: number): number {
  if (totalWeight <= 0) return 0;
  return clamp01((completedWeight + 1) / (totalWeight + 2));
}

export function getScoreBand(score: number): { label: string; tone: 'green' | 'amber' | 'red' } {
  if (score >= 80) return { label: 'Excellent', tone: 'green' };
  if (score >= 60) return { label: 'Strong', tone: 'green' };
  if (score >= 40) return { label: 'Steady', tone: 'amber' };
  return { label: 'Needs focus', tone: 'red' };
}

/** Same bands the productivity logs use, so badges stay consistent. */
export function getStatusFromRate(rate: number): string {
  if (rate >= 90) return 'Highly Productive';
  if (rate >= 70) return 'Productive';
  if (rate >= 40) return 'Moderately Productive';
  return 'Low Productive';
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function sessionsInPeriod(sessions: FocusSession[], period: PeriodBounds): FocusSession[] {
  return sessions.filter((session) => {
    if (!session.start_time) return false;
    const key = toDateKey(new Date(session.start_time));
    return isWithinPeriod(key, period);
  });
}

function studyMinutes(sessions: FocusSession[]): number {
  const seconds = sessions.reduce((sum, session) => {
    if ((session.session_type || '') !== 'Study') return sum;
    return sum + (Number(session.duration) || 0);
  }, 0);
  return Math.round(seconds / 60);
}

function buildSubjectBreakdown(sessions: FocusSession[], totalMinutes: number): SubjectSlice[] {
  const bySubject = new Map<string, number>();

  sessions.forEach((session) => {
    if ((session.session_type || '') !== 'Study') return;
    const minutes = Math.round((Number(session.duration) || 0) / 60);
    if (minutes <= 0) return;
    const name = (session.subject || session.title || '').trim() || 'Unlabelled';
    bySubject.set(name, (bySubject.get(name) || 0) + minutes);
  });

  return Array.from(bySubject.entries())
    .map(([name, minutes]) => ({
      name,
      minutes,
      share: totalMinutes > 0 ? minutes / totalMinutes : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
}

export interface ComputeScoreInput {
  view: PeriodView;
  period: PeriodBounds;
  /** Tasks due inside the period. */
  tasks: ScoreTask[];
  /** Tasks due inside the previous period, for the delta. */
  previousTasks: ScoreTask[];
  /** Every task, used for overdue debt and the consistency window. */
  allTasks: ScoreTask[];
  /** Study/break sessions for at least the period plus the last 7 days. */
  sessions: FocusSession[];
  /** Daily focus goal in minutes (from Settings). */
  dailyGoalMinutes: number;
  /** Local YYYY-MM-DD; injectable for tests. */
  todayKey?: string;
  /** Length of the trend window in days. */
  trendDays?: number;
}

export function computeProductivityScore(input: ComputeScoreInput): ProductivityScore {
  const {
    view,
    period,
    tasks,
    previousTasks,
    allTasks,
    sessions,
    dailyGoalMinutes,
    trendDays = 30,
  } = input;

  const todayKey = input.todayKey || toDateKey(new Date());

  const completedTasks = tasks.filter((task) => task.completed).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const { completedWeight, totalWeight } = weightedCompletion(tasks);
  const weightedRate = smoothedCompletionRate(completedWeight, totalWeight);

  const previousCompleted = previousTasks.filter((task) => task.completed).length;
  const previousTotal = previousTasks.length;
  const deltaPct =
    previousTotal > 0
      ? round1((completionRate - previousCompleted / previousTotal) * 100)
      : null;

  // Focus: minutes studied inside the period against the goal for the days
  // that have actually happened yet.
  const periodSessions = sessionsInPeriod(sessions, period);
  const focusMinutes = studyMinutes(periodSessions);
  const periodLength = daysBetween(period.start, period.end) + 1;
  const periodEnd = period.end < todayKey ? period.end : todayKey;
  const elapsedDays = Math.min(periodLength, Math.max(1, daysBetween(period.start, periodEnd) + 1));
  const goal = Math.max(15, Math.round(dailyGoalMinutes || 0));
  const focusTargetMinutes = goal * elapsedDays;
  const focusRatio = focusTargetMinutes > 0 ? clamp01(focusMinutes / focusTargetMinutes) : 0;

  // Consistency: how many of the last seven days saw any progress at all.
  const consistencyWindowEnd = period.end < todayKey ? period.end : todayKey;
  const consistencyWindowStart = addDays(consistencyWindowEnd, -6);
  const activeDays = new Set<string>();

  allTasks.forEach((task) => {
    if (!task.completed || !task.completed_at) return;
    const key = toDateKey(new Date(task.completed_at));
    if (key >= consistencyWindowStart && key <= consistencyWindowEnd) activeDays.add(key);
  });

  sessions.forEach((session) => {
    if ((session.session_type || '') !== 'Study' || !session.start_time) return;
    if ((Number(session.duration) || 0) < 15 * 60) return;
    const key = toDateKey(new Date(session.start_time));
    if (key >= consistencyWindowStart && key <= consistencyWindowEnd) activeDays.add(key);
  });

  const consistencyRatio = activeDays.size / 7;

  // Overdue debt: each past-due open task costs part of the 10 available points.
  const overdueTasks = allTasks.filter(
    (task) => !task.completed && task.due_date && task.due_date < todayKey
  ).length;
  const overdueRatio = clamp01(1 - overdueTasks / OVERDUE_TOLERANCE);

  const components: ScoreComponent[] = [
    {
      key: 'completion',
      label: 'Task completion',
      weight: SCORE_WEIGHTS.completion,
      ratio: weightedRate,
      points: round1(weightedRate * SCORE_WEIGHTS.completion),
    },
    {
      key: 'focus',
      label: 'Focus time',
      weight: SCORE_WEIGHTS.focus,
      ratio: focusRatio,
      points: round1(focusRatio * SCORE_WEIGHTS.focus),
    },
    {
      key: 'consistency',
      label: 'Consistency',
      weight: SCORE_WEIGHTS.consistency,
      ratio: consistencyRatio,
      points: round1(consistencyRatio * SCORE_WEIGHTS.consistency),
    },
    {
      key: 'overdue',
      label: 'Overdue work',
      weight: SCORE_WEIGHTS.overdue,
      ratio: overdueRatio,
      points: round1(overdueRatio * SCORE_WEIGHTS.overdue),
    },
  ];

  // With nothing due there is no completion to score; renormalise over the
  // parts that do have something to say instead of pinning the score at 55.
  const scoredComponents = components.filter(
    (component) => component.key !== 'completion' || totalTasks > 0
  );
  const scoredWeight = scoredComponents.reduce((sum, component) => sum + component.weight, 0);
  const score =
    scoredWeight > 0
      ? Math.round(
          (scoredComponents.reduce((sum, component) => sum + component.points, 0) / scoredWeight) * 100
        )
      : 0;

  // Trend and best/worst days, scoped to tasks that were due on each day.
  const trend: TrendPoint[] = [];
  for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
    const key = addDays(todayKey, -offset);
    const dueThatDay = allTasks.filter((task) => task.due_date === key);
    const completedThatDay = dueThatDay.filter((task) => task.completed).length;
    trend.push({
      date: key,
      rate: dueThatDay.length > 0 ? completedThatDay / dueThatDay.length : null,
      completed: completedThatDay,
      total: dueThatDay.length,
    });
  }

  const ratedDays = trend.filter((point) => point.total > 0 && point.rate !== null);
  const bestDay =
    ratedDays.length > 0
      ? ratedDays.reduce((best, point) => ((point.rate || 0) > (best.rate || 0) ? point : best))
      : null;
  const worstDay =
    ratedDays.length > 0
      ? ratedDays.reduce((worst, point) => ((point.rate || 0) < (worst.rate || 0) ? point : worst))
      : null;

  // Focus this week against a full week's goal.
  const week = getWeekBounds(parseDateKey(todayKey));
  const weeklyMinutes = studyMinutes(sessionsInPeriod(sessions, week));

  return {
    view,
    period,
    completionRate: round1(completionRate * 100),
    completedTasks,
    totalTasks,
    weightedRate: round1(weightedRate * 100),
    weightedRateRaw: totalWeight > 0 ? round1((completedWeight / totalWeight) * 100) : 0,
    tasksByPriority: tallyByPriority(tasks),
    score,
    band: getScoreBand(score),
    components,
    completionIncluded: totalTasks > 0,
    trend,
    bestDay,
    worstDay,
    deltaPct,
    focusMinutes,
    focusTargetMinutes,
    dailyGoalMinutes: goal,
    weeklyMinutes,
    weeklyTargetMinutes: goal * 7,
    subjects: buildSubjectBreakdown(periodSessions, focusMinutes),
    subjectTotalMinutes: focusMinutes,
    overdueTasks,
    lowConfidence: totalTasks < 3,
  };
}

/** "1h 20m" / "45m" / "0m" */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe}m`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}
