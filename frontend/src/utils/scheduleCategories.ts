export const EVENT_CATEGORIES = ['study', 'assignment', 'exam', 'meeting', 'other'] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface CategoryStyle {
  label: string;
  /** Small solid dot, used in list rows. */
  dot: string;
  /** Tinted chip/badge treatment. */
  chip: string;
  /** Left accent bar for calendar blocks. */
  bar: string;
}

const CATEGORY_STYLES: Record<EventCategory, CategoryStyle> = {
  study: {
    label: 'Study',
    dot: 'bg-blue-500',
    chip: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300',
    bar: 'bg-blue-500',
  },
  assignment: {
    label: 'Assignment',
    dot: 'bg-amber-500',
    chip: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  exam: {
    label: 'Exam',
    dot: 'bg-rose-500',
    chip: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
    bar: 'bg-rose-500',
  },
  meeting: {
    label: 'Meeting',
    dot: 'bg-violet-500',
    chip: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300',
    bar: 'bg-violet-500',
  },
  other: {
    label: 'Other',
    dot: 'bg-gray-400',
    chip: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-[#3a3a3a] dark:bg-[#262626] dark:text-gray-300',
    bar: 'bg-gray-400',
  },
};

export const getCategoryStyle = (category: string): CategoryStyle =>
  CATEGORY_STYLES[category as EventCategory] ?? CATEGORY_STYLES.other;

export const getCategoryLabel = (category: string): string => getCategoryStyle(category).label;
