export interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  category: string;
  subtasks?: Subtask[];
} 

export interface Subtask {
  id: number;
  task: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}