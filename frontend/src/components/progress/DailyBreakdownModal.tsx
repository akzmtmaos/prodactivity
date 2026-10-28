import React, { useState, useEffect } from 'react';
import { CheckSquare, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BreakdownModalShell from './BreakdownModalShell';
import { getRateTextClass } from './DailyRateChart';
import { getStatusFromRate } from '../../utils/productivityScore';

interface DailyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dailyPercentage: number;
  getProductivityColor: (status: string) => string;
}

interface TaskData {
  id: number;
  title: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string;
  priority: string;
  category: string;
  task_category: string;
  time_spent_minutes: number;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
}

const PRIORITY_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
};

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const DailyBreakdownModal: React.FC<DailyBreakdownModalProps> = ({
  isOpen,
  onClose,
  date,
  dailyPercentage,
  getProductivityColor
}) => {
  const [completedTasks, setCompletedTasks] = useState<TaskData[]>([]);
  const [pendingTasks, setPendingTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDailyTasks();
    }
  }, [isOpen, date]);

  const fetchDailyTasks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id || 11;
      
      // Check if this is today's date
      const today = new Date().toLocaleDateString('en-CA');
      const isToday = date === today;
      
      console.log('📅 Fetching tasks for:', date, '(isToday:', isToday, ')');
      
      // NEW LOGIC: Different behavior for today vs historical dates
      if (isToday) {
        // FOR TODAY: Only show active (non-deleted) tasks
        console.log('📅 Today\'s breakdown - excluding deleted tasks');
        
        // Get completed tasks (exclude deleted)
        const { data: allCompletedTasks, error: completedError } = await supabase
          .from('tasks')
          .select('id, title, completed, completed_at, due_date, priority, category, task_category, time_spent_minutes, is_deleted')
          .eq('user_id', userId)
          .eq('completed', true)
          .eq('is_deleted', false) // EXCLUDE deleted for today
          .not('completed_at', 'is', null);
        
        // CORRECTED LOGIC: Filter to tasks that were due today AND completed today
        // This ensures we only show tasks that were actually scheduled for today
        const completedData = (allCompletedTasks || []).filter(task => {
          if (!task.completed_at) return false;
          
          // Must be due today
          if (task.due_date !== date) {
            console.log(`❌ Today's completed task ${task.id} excluded: due_date (${task.due_date}) does not match today (${date})`);
            return false;
          }
          
          // Must be completed today
          const completedDate = new Date(task.completed_at);
          const completedDateStr = completedDate.toLocaleDateString('en-CA');
          const matches = completedDateStr === date;
          
          if (matches) {
            console.log(`✅ Today's completed task ${task.id} included: due_date and completed_at both match today (${date})`);
          } else {
            console.log(`❌ Today's completed task ${task.id} excluded: completed_at (${completedDateStr}) does not match today (${date})`);
          }
          
          return matches;
        });
        
        // Get pending tasks due today (exclude deleted)
        const { data: allPendingTasks, error: pendingError } = await supabase
          .from('tasks')
          .select('id, title, completed, completed_at, due_date, priority, category, task_category, time_spent_minutes, created_at, is_deleted')
          .eq('user_id', userId)
          .eq('completed', false)
          .eq('is_deleted', false) // EXCLUDE deleted for today
          .eq('due_date', date);
        
        const pendingData = allPendingTasks || [];
        
        if (completedError || pendingError) {
          console.error('Error fetching tasks:', completedError || pendingError);
          setError('Failed to load tasks');
        } else {
          console.log(`📊 Today's Breakdown (active tasks only):`, {
            completed: completedData.length,
            pending: pendingData.length,
            total: completedData.length + pendingData.length
          });
          setCompletedTasks(completedData || []);
          setPendingTasks(pendingData || []);
        }
      } else {
        // FOR HISTORICAL DATES: Include deleted tasks to explain the percentage
        console.log('📅 Historical date - including deleted tasks');
        
        // Get ALL completed tasks (include deleted)
        const { data: allCompletedTasks, error: completedError } = await supabase
          .from('tasks')
          .select('id, title, completed, completed_at, due_date, priority, category, task_category, time_spent_minutes, is_deleted')
          .eq('user_id', userId)
          .eq('completed', true)
          .not('completed_at', 'is', null);
        
        // CORRECTED LOGIC: Filter to tasks that were due on this specific date AND completed on this date
        // This ensures we only show tasks that were actually scheduled for this date
        const completedData = (allCompletedTasks || []).filter(task => {
          if (!task.completed_at) return false;
          
          // Must be due on this date
          if (task.due_date !== date) {
            console.log(`❌ Completed task ${task.id} excluded: due_date (${task.due_date}) does not match breakdown date (${date})`);
            return false;
          }
          
          // Must be completed on this date
          const completedDate = new Date(task.completed_at);
          const completedDateStr = completedDate.toLocaleDateString('en-CA');
          const matches = completedDateStr === date;
          
          if (matches) {
            console.log(`✅ Completed task ${task.id} included: due_date and completed_at both match breakdown date (${date})`);
          } else {
            console.log(`❌ Completed task ${task.id} excluded: completed_at (${completedDateStr}) does not match breakdown date (${date})`);
          }
          
          return matches;
        });
        
        // Get pending tasks that were due on this specific date
        // CORRECTED LOGIC: Only show tasks that were actually due on this date
        // We can't perfectly track due_date history, so we use the current due_date
        // This means historical breakdowns will only show tasks currently scheduled for that date
        const { data: allPendingTasks, error: pendingError } = await supabase
          .from('tasks')
          .select('id, title, completed, completed_at, due_date, priority, category, task_category, time_spent_minutes, created_at, updated_at, is_deleted')
          .eq('user_id', userId)
          .eq('completed', false);
        
        // Filter to tasks that were due on this specific date
        const pendingData = (allPendingTasks || []).filter(task => {
          // DEBUG: Log each task being evaluated
          const debugInfo = {
            id: task.id,
            title: task.title,
            due_date: task.due_date,
            created_at: task.created_at,
            updated_at: task.updated_at,
            is_deleted: task.is_deleted
          };
          
          // CORRECTED: Only include if due date exactly matches the breakdown date
          // This prevents tasks from other dates (like Oct 16) from appearing in Oct 14 breakdown
          if (task.due_date === date) {
            console.log(`✅ Task ${task.id} included: due_date exactly matches breakdown date`, debugInfo);
            return true;
          }
          
          console.log(`❌ Task ${task.id} excluded: due_date (${task.due_date}) does not match breakdown date (${date})`, debugInfo);
          return false;
        });
        
        if (completedError || pendingError) {
          console.error('Error fetching tasks:', completedError || pendingError);
          setError('Failed to load tasks');
        } else {
          console.log(`📊 Historical Breakdown for ${date}:`, {
            completed: completedData.length,
            pending: pendingData.length,
            total: completedData.length + pendingData.length,
            calculatedRate: completedData.length > 0 || pendingData.length > 0 
              ? Math.round((completedData.length / (completedData.length + pendingData.length)) * 100) 
              : 0,
            displayedRate: dailyPercentage
          });
          console.log('Completed tasks:', completedData.map(t => ({ id: t.id, title: t.title, due: t.due_date, completed: t.completed_at, deleted: t.is_deleted })));
          console.log('Pending tasks:', pendingData.map(t => ({
            id: t.id, 
            title: t.title, 
            currentDue: t.due_date, 
            created: t.created_at ? new Date(t.created_at).toLocaleDateString('en-CA') : null,
            updated: t.updated_at ? new Date(t.updated_at).toLocaleDateString('en-CA') : null,
            deleted: t.is_deleted,
            reason: 'due_date_exact_match'
          })));
          console.log('🔍 DELETED TASK COUNT:', {
            deletedCompleted: completedData.filter(t => t.is_deleted).length,
            deletedPending: pendingData.filter(t => t.is_deleted).length
          });
          
          setCompletedTasks(completedData || []);
          setPendingTasks(pendingData || []);
        }
      }
    } catch (err) {
      console.error('Error in fetchDailyTasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const parsed = new Date(dateStr);
    return parsed.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateStr: string) => {
    const parsed = new Date(dateStr);
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const totalTasks = completedTasks.length + pendingTasks.length;
  const rate = Math.max(0, Math.min(100, dailyPercentage));
  const completedShare = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
  const calculatedRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const status = totalTasks > 0 ? getStatusFromRate(dailyPercentage) : 'No tasks';
  const rateTone = getRateTextClass(rate, totalTasks > 0);

  const renderTask = (task: TaskData, state: 'done' | 'missing') => {
    const priority = (task.priority || 'medium').toLowerCase();
    return (
      <div
        key={task.id}
        className={`flex items-start gap-2.5 rounded-md border px-3 py-2 ${
          task.is_deleted
            ? 'border-red-200 dark:border-red-900/40'
            : 'border-gray-200 dark:border-[#2f2f2f]'
        }`}
      >
        <span
          className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
            state === 'done' ? 'bg-green-500 dark:bg-green-400' : 'bg-amber-500 dark:bg-amber-400'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13px] text-gray-800 dark:text-gray-200">{task.title}</span>
            {task.is_deleted && (
              <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-600 ring-1 ring-red-200 dark:text-red-400 dark:ring-red-900/50">
                deleted
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority] || PRIORITY_DOT.medium}`} />
              {PRIORITY_LABEL[priority] || 'Medium'}
            </span>
            {task.task_category && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-[#2a2a2a]">{task.task_category}</span>
            )}
            {task.category && <span>{task.category}</span>}
            {task.time_spent_minutes > 0 && (
              <span className="flex items-center gap-1 tabular-nums">
                <Clock size={10} />
                {task.time_spent_minutes}m
              </span>
            )}
            {state === 'done' && task.completed_at && (
              <span className="tabular-nums">completed {formatTime(task.completed_at)}</span>
            )}
            {state === 'missing' && (
              <span className="flex items-center gap-1 tabular-nums">
                <Calendar size={10} />
                due {formatShortDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <BreakdownModalShell
      title="Daily breakdown"
      subtitle={`${formatDate(date)}${
        totalTasks > 0 ? ` · ${completedTasks.length} of ${totalTasks} tasks completed` : ' · nothing due'
      }`}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-b-indigo-500 dark:border-[#333333] dark:border-b-indigo-400" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Loading task breakdown…</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchDailyTasks}
            className="h-7 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#333333] dark:bg-[#252525] dark:text-gray-300 dark:hover:bg-[#2d2d2d]"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex flex-col gap-4 rounded-md border border-gray-200 px-3.5 py-3 sm:flex-row sm:items-center dark:border-[#2f2f2f]">
            <div className="relative h-20 w-20 flex-shrink-0">
              <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="6"
                  className="stroke-gray-100 dark:stroke-[#2a2a2a]"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - rate / 100)}
                  className={`${rateTone} transition-all duration-500`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                {rate.toFixed(0)}%
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[13px] font-medium ${
                    totalTasks > 0 ? getProductivityColor(status) : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {status}
                </span>
                <span className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:border-[#333333] dark:text-gray-400">
                  {totalTasks > 0 ? `${completedTasks.length}/${totalTasks} done` : 'no tasks'}
                </span>
              </div>

              <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#262626]">
                <span
                  className="h-full bg-green-500 transition-all duration-500 dark:bg-green-400"
                  style={{ width: `${completedShare}%` }}
                />
                {totalTasks > 0 && (
                  <span
                    className="h-full bg-amber-500/70 dark:bg-amber-400/60"
                    style={{ width: `${100 - completedShare}%` }}
                  />
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400" />
                  Completed {completedTasks.length}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  Missing {pendingTasks.length}
                </span>
              </div>

              {totalTasks === 0 ? (
                <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">Nothing was due on this day.</p>
              ) : Math.abs(calculatedRate - rate) > 1 ? (
                <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                  The tasks logged for this day work out to {calculatedRate}%.
                </p>
              ) : null}
            </div>
          </div>

          {completedTasks.length > 0 && (
            <section className="mt-4">
              <div className="mb-1.5 flex items-center gap-2">
                <CheckSquare size={13} className="text-green-500 dark:text-green-400" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Completed
                </span>
                <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                  {completedTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {completedTasks.map((task) => renderTask(task, 'done'))}
              </div>
            </section>
          )}

          {pendingTasks.length > 0 && (
            <section className="mt-4">
              <div className="mb-1.5 flex items-center gap-2">
                <Clock size={13} className="text-amber-500 dark:text-amber-400" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Missing
                </span>
                <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                  {pendingTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {pendingTasks.map((task) => renderTask(task, 'missing'))}
              </div>
            </section>
          )}
        </>
      )}
    </BreakdownModalShell>
  );
};

export default DailyBreakdownModal;
