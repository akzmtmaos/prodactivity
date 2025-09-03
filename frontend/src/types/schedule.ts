export interface ScheduleEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  startTime: string;
  endTime: string;
  category: string;
  description: string;
}

export interface RecurringSchedule {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  startTime: string;
  endTime: string;
  category: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X days/weeks/months/years
  daysOfWeek?: number[]; // For weekly: 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number; // For monthly: 1-31
  isActive: boolean;
  lastGenerated?: Date;
}

export interface PastEvent extends ScheduleEvent {
  completedAt?: Date;
  notes?: string;
  wasRecurring?: boolean;
  originalRecurringId?: string;
} 