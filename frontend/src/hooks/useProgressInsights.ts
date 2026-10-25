import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  addDays,
  computeProductivityScore,
  getPeriodBounds,
  getWeekBounds,
  parseDateKey,
  shiftPeriod,
  toDateKey,
  type FocusSession,
  type PeriodView,
  type ProductivityScore,
  type ScoreTask,
} from '../utils/productivityScore';

const DEFAULT_DAILY_GOAL_MINUTES = 120;

export interface ProgressInsightsState {
  data: ProductivityScore | null;
  loading: boolean;
  error: string | null;
}

interface UseProgressInsightsOptions {
  view: PeriodView;
  selectedDate: Date;
  refreshKey?: number;
  enabled?: boolean;
}

function readDailyGoalMinutes(): number {
  const saved = Number(localStorage.getItem('studyTimerDailyGoalMinutes'));
  return saved > 0 ? saved : DEFAULT_DAILY_GOAL_MINUTES;
}

/**
 * Loads the raw records the Progress page needs (tasks + study sessions) and
 * scores the selected period with the shared maths in utils/productivityScore.
 */
export function useProgressInsights({
  view,
  selectedDate,
  refreshKey = 0,
  enabled = true,
}: UseProgressInsightsOptions): ProgressInsightsState {
  const [state, setState] = useState<ProgressInsightsState>({
    data: null,
    loading: enabled,
    error: null,
  });

  const selectedDateKey = toDateKey(selectedDate);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const load = async () => {
      setState((previous) => ({ ...previous, loading: true, error: null }));

      try {
        const userData = localStorage.getItem('user');
        const userId = userData ? JSON.parse(userData)?.id : null;
        if (!userId) {
          if (!cancelled) setState({ data: null, loading: false, error: null });
          return;
        }

        const referenceDate = parseDateKey(selectedDateKey);
        const period = getPeriodBounds(view, referenceDate);
        const previousPeriod = shiftPeriod(view, period, -1);
        const todayKey = toDateKey(new Date());
        const trendStart = addDays(todayKey, -34);
        const weekStart = getWeekBounds(parseDateKey(todayKey)).start;

        const earliestDate = [period.start, previousPeriod.start, trendStart, weekStart].sort()[0];

        const { data: taskRows, error: taskError } = await supabase
          .from('tasks')
          .select('id, title, completed, priority, due_date, completed_at')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .limit(5000);

        if (taskError) throw taskError;

        const allTasks: ScoreTask[] = (taskRows || [])
          .filter((task: any) => Boolean(task.due_date))
          .map((task: any) => ({
            id: task.id,
            title: task.title,
            completed: Boolean(task.completed),
            priority: task.priority,
            due_date: task.due_date,
            completed_at: task.completed_at,
          }));

        const tasksInPeriod = allTasks.filter(
          (task) => task.due_date! >= period.start && task.due_date! <= period.end
        );
        const tasksInPreviousPeriod = allTasks.filter(
          (task) => task.due_date! >= previousPeriod.start && task.due_date! <= previousPeriod.end
        );

        let sessions: FocusSession[] = [];
        const { data: authData } = await supabase.auth.getUser();
        const supabaseUserId = authData?.user?.id;

        if (supabaseUserId) {
          const { data: sessionRows, error: sessionError } = await supabase
            .from('study_timer_sessions')
            .select('session_type, subject, title, duration, start_time')
            .eq('user_id', supabaseUserId)
            .gte('start_time', `${earliestDate}T00:00:00`)
            .order('start_time', { ascending: false })
            .limit(2000);

          if (!sessionError && sessionRows) {
            sessions = sessionRows as FocusSession[];
          }
        }

        const data = computeProductivityScore({
          view,
          period,
          tasks: tasksInPeriod,
          previousTasks: tasksInPreviousPeriod,
          allTasks,
          sessions,
          dailyGoalMinutes: readDailyGoalMinutes(),
          todayKey,
        });

        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (error) {
        console.error('Failed to compute progress insights:', error);
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load insights',
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [view, selectedDateKey, refreshKey, enabled]);

  return useMemo(() => state, [state]);
}
