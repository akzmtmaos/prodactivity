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