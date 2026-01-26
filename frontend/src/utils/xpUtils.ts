/**
 * Dynamic XP based on task priority (Mr. Genner Serna recommendation).
 * Priority serves dual purpose: urgency/importance AND difficulty/complexity.
 * Points depend on priority to avoid unfair scoring (e.g. one high-priority task vs many low-priority ones).
 */

export type TaskPriority = 'low' | 'medium' | 'high';

const XP_BY_PRIORITY: Record<TaskPriority, { onTime: number; overdue: number }> = {
  low: { onTime: 5, overdue: 2 },
  medium: { onTime: 10, overdue: 5 },
  high: { onTime: 20, overdue: 10 },
};

export function getXpForTask(priority: TaskPriority | string | undefined, isOverdue: boolean): number {
  const p = (priority || 'medium').toLowerCase() as TaskPriority;
  const entry = XP_BY_PRIORITY[p] ?? XP_BY_PRIORITY.medium;
  return isOverdue ? entry.overdue : entry.onTime;
}
