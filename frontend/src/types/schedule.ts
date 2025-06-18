export interface ScheduleEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  category: 'study' | 'assignment' | 'exam' | 'meeting' | 'other';
  description?: string;
} 