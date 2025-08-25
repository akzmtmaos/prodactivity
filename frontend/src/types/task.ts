export interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  category: string;
  task_category?: string;
  subtasks?: Subtask[];
  // New productivity validation fields
  has_activity?: boolean;
  activity_notes?: string;
  time_spent_minutes?: number;
  last_activity_at?: string;
  can_be_completed?: boolean;
  // Evidence fields
  evidence_uploaded?: boolean;
  evidence_description?: string;
  evidence_file?: string;
  evidence_uploaded_at?: string;
}

export interface Subtask {
  id: number;
  task: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}